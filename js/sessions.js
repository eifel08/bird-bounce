/* Bird Bounce — game sessions: Solo (Normal/Hard/Cave), Versus (2P or vs Bot) and the menu Demo. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util, R = BB.Render;
  const save = () => BB.Storage.data;

  const MODE_INFO = {
    normal: { label: 'NORMAL', hint: 'Bounce off the walls' },
    hard: { label: 'HARD MODE', hint: 'Spikes on the move · no loot' },
    cave: { label: 'CAVE MODE', hint: 'Follow your flashlight' },
  };

  function shakeOffset(s) {
    return s.shake > 0 ? [(Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake] : [0, 0];
  }

  // ---------------------------------------------------------------- Solo
  class SoloSession {
    constructor(mode) {
      this.mode = mode;
      this.worldW = C.SOLO_W;
      this.worldH = C.H;
      this.paused = false;
      this.state = 'ready';
      this.runCrystals = 0;
      this.runDiamonds = 0;
      this.timer = 0;
      this.shake = 0;
      this.reveal = 0;
      const s = save();
      const items =
        mode === 'hard' ? null : mode === 'cave' ? { spawn: 0.75, diamond: 0, value: 2 } : { spawn: 0.6, diamond: 0.05, value: 1 };
      this.arena = new BB.Arena({
        w: this.worldW,
        seed: U.randomSeed(),
        diff: mode === 'hard' ? 'hard' : 'normal',
        theme: mode,
        items,
        skin: BB.getSkin(s.equippedSkin),
        onEvent: (e) => this.onEvent(e),
      });
      this.flashAngle = BB.FLASHLIGHT.angles[s.flashlightLevel];
    }

    get pausable() {
      return this.state === 'ready' || this.state === 'playing';
    }

    letterbox() {
      return this.mode === 'cave' ? '#05060b' : this.mode === 'hard' ? '#2b1219' : '#1f2337';
    }

    press() {
      if (this.paused) return;
      if (this.state === 'ready') this.state = 'playing';
      if (this.state === 'playing') this.arena.flap();
    }

    onEvent(e) {
      const s = save();
      if (e.type === 'flap') BB.Audio.play('flap');
      else if (e.type === 'bounce') BB.Audio.play('bounce');
      else if (e.type === 'collect') {
        if (e.item.type === 'diamond') {
          s.diamonds += 1;
          this.runDiamonds++;
          BB.Audio.play('diamond');
        } else {
          s.crystals += e.item.value;
          s.stats.totalCrystals += e.item.value;
          this.runCrystals += e.item.value;
          BB.Audio.play('collect');
        }
        BB.Storage.save();
        BB.UI.setHudLoot(this.runCrystals, this.runDiamonds);
      } else if (e.type === 'die') {
        BB.Audio.play('die');
        this.state = 'dead';
        this.timer = 0;
        this.shake = 10;
        try {
          navigator.vibrate && navigator.vibrate(60);
        } catch (err) {
          /* not supported */
        }
      }
    }

    update(dt) {
      if (this.paused) return;
      this.arena.update(dt);
      this.shake = Math.max(0, this.shake - dt * 40);
      if (this.state === 'dead') {
        this.timer += dt;
        this.reveal = Math.min(0.8, this.reveal + dt * 2);
        if (this.timer > 1.0) {
          this.state = 'over';
          this.finish();
        }
      }
    }

    finish() {
      const s = save();
      const score = this.arena.score;
      const prev = s.highScores[this.mode] || 0;
      const isBest = score > prev;
      if (isBest) s.highScores[this.mode] = score;
      s.stats.games++;
      s.stats.bestRunCrystals = Math.max(s.stats.bestRunCrystals, this.runCrystals);
      BB.Storage.save();
      BB.UI.showGameOver({ mode: this.mode, score, best: s.highScores[this.mode], isBest, crystals: this.runCrystals, diamonds: this.runDiamonds });
      BB.Achievements.check();
    }

    shakeOffset() {
      return shakeOffset(this);
    }

    render(ctx) {
      const a = this.arena;
      R.arena(ctx, a);
      if (this.mode === 'cave') R.darkness(ctx, a, this.flashAngle, this.reveal);
      if (this.state === 'ready') {
        const info = MODE_INFO[this.mode];
        const pulse = 0.65 + 0.35 * Math.sin(a.time * 5);
        const light = this.mode === 'cave';
        R.text(ctx, info.label, a.w / 2, a.h * 0.25, 22, light ? '#ffd166' : '#2a2e45', { alpha: 0.8 });
        R.text(ctx, this.mode === 'cave' ? `${info.hint} · ${this.flashAngle}°` : info.hint, a.w / 2, a.h * 0.25 + 26, 15, light ? '#fff' : '#2a2e45', { weight: 500, alpha: 0.65 });
        R.text(ctx, 'TAP TO FLAP', a.w / 2, a.h * 0.74, 26, '#fff', { stroke: 'rgba(30,32,50,0.55)', alpha: pulse });
      }
    }
  }

  // ---------------------------------------------------------------- Versus
  class VersusSession {
    constructor(botIndex) {
      this.botIndex = botIndex;
      this.bot = botIndex == null ? null : BB.BOTS[botIndex];
      this.worldW = C.VS_W * 2 + C.VS_DIVIDER;
      this.worldH = C.H;
      this.points = [0, 0];
      this.round = 0;
      this.paused = false;
      this.shake = 0;
      this.goT = 0;
      this.newRound();
    }

    get pausable() {
      return this.state !== 'over';
    }

    letterbox() {
      return '#1f2337';
    }

    skins() {
      const eq = BB.getSkin(save().equippedSkin);
      if (this.bot) return [eq, Object.assign({ id: 'bot', name: this.bot.name, acc: 'antenna' }, this.bot.skin)];
      return [eq, BB.getSkin(eq.id === 'ocean' ? 'classic' : 'ocean')];
    }

    newRound() {
      this.round++;
      const seed = U.randomSeed();
      const [s1, s2] = this.skins();
      const mk = (x, dir, skin, i) =>
        new BB.Arena({ x, w: C.VS_W, seed, dir, diff: 'normal', theme: 'normal', skin, onEvent: (e) => this.onEvent(e, i) });
      // Mirrored: P1 starts heading right, P2 heading left, same seed => identical spike sequence.
      this.arenas = [mk(0, 1, s1, 0), mk(C.VS_W + C.VS_DIVIDER, -1, s2, 1)];
      this.ai = this.bot ? new BB.Bot(this.arenas[1], this.bot) : null;
      this.state = 'countdown';
      this.count = 2.4;
      this.lastCount = null;
      this.banner = null;
    }

    press(side) {
      if (this.paused || this.state !== 'playing') return;
      this.arenas[this.bot ? 0 : side].flap();
    }

    onEvent(e, i) {
      if (e.type === 'flap' && !(this.bot && i === 1)) BB.Audio.play('flap');
      else if (e.type === 'bounce') BB.Audio.play('bounce');
      else if (e.type === 'die') BB.Audio.play('die');
    }

    update(dt) {
      if (this.paused) return;
      this.shake = Math.max(0, this.shake - dt * 40);
      this.goT = Math.max(0, this.goT - dt);
      if (this.ai && this.state === 'playing') this.ai.update(dt);
      for (const a of this.arenas) a.update(dt);

      if (this.state === 'countdown') {
        this.count -= dt;
        const n = Math.ceil(this.count / 0.8);
        if (n !== this.lastCount && n > 0) {
          this.lastCount = n;
          BB.Audio.play('tick');
        }
        if (this.count <= 0) {
          this.state = 'playing';
          this.goT = 0.6;
          BB.Audio.play('go');
          this.arenas.forEach((a) => a.start());
        }
      } else if (this.state === 'playing') {
        const d0 = !this.arenas[0].bird.alive, d1 = !this.arenas[1].bird.alive;
        if (d0 || d1) {
          const winner = d0 && d1 ? -1 : d0 ? 1 : 0;
          if (winner >= 0) {
            this.points[winner]++;
            this.arenas[winner].frozen = true;
            BB.Audio.play('point');
          }
          this.banner = { winner };
          this.state = 'roundOver';
          this.timer = 0;
          this.shake = 8;
        }
      } else if (this.state === 'roundOver') {
        this.timer += dt;
        if (this.timer > 1.7) {
          if (Math.max(...this.points) >= C.WIN_POINTS) this.finish();
          else this.newRound();
        }
      }
    }

    name(i) {
      if (this.bot) return i === 0 ? 'YOU' : this.bot.name.toUpperCase();
      return i === 0 ? 'PLAYER 1' : 'PLAYER 2';
    }

    finish() {
      this.state = 'over';
      const s = save();
      const winner = this.points[0] > this.points[1] ? 0 : 1;
      const info = { bot: this.bot, botIndex: this.botIndex, points: this.points.slice(), winner, reward: 0, firstWin: false };
      if (this.bot) {
        if (winner === 0) {
          s.stats.botWins++;
          if (!s.botsDefeated.includes(this.bot.id)) {
            s.botsDefeated.push(this.bot.id);
            s.diamonds += this.bot.reward;
            info.firstWin = true;
            info.reward = this.bot.reward;
          }
        }
        BB.Audio.play(winner === 0 ? 'win' : 'lose');
      } else {
        s.stats.versusMatches++;
        BB.Audio.play('win');
      }
      BB.Storage.save();
      BB.UI.showMatch(info);
      BB.Achievements.check();
    }

    shakeOffset() {
      return shakeOffset(this);
    }

    render(ctx) {
      const h = C.H;
      for (const a of this.arenas) R.arena(ctx, a);
      ctx.fillStyle = '#1f2337';
      ctx.fillRect(C.VS_W, 0, C.VS_DIVIDER, h);

      this.arenas.forEach((a, i) => {
        const cx = a.x + a.w / 2;
        for (let k = 0; k < C.WIN_POINTS; k++) {
          const px = cx + (k - (C.WIN_POINTS - 1) / 2) * 26;
          ctx.beginPath();
          ctx.arc(px, h / 2 - 116, 9, 0, Math.PI * 2);
          ctx.fillStyle = k < this.points[i] ? '#ffc23d' : 'rgba(255,255,255,0.7)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = k < this.points[i] ? '#d49a00' : 'rgba(40,44,70,0.25)';
          ctx.stroke();
        }
        R.text(ctx, this.name(i), cx, h / 2 + 112, 18, '#2a2e45', { alpha: 0.7 });

        if (this.state === 'countdown') {
          const n = Math.max(1, Math.ceil(this.count / 0.8));
          R.text(ctx, String(n), cx, h / 2 - 2, 76, '#fff', { stroke: 'rgba(30,32,50,0.6)' });
          if (this.round === 1) {
            const hint = this.bot ? (i === 0 ? 'TAP ANYWHERE' : 'BOT') : i === 0 ? 'TAP LEFT SIDE' : 'TAP RIGHT SIDE';
            R.text(ctx, hint, cx, h - 92, 17, '#2a2e45', { alpha: 0.65 });
          }
        } else if (this.goT > 0) {
          R.text(ctx, 'GO!', cx, h / 2 - 2, 64, '#fff', { stroke: 'rgba(30,32,50,0.6)', alpha: Math.min(1, this.goT * 3) });
        }
      });

      if (this.state === 'roundOver' && this.banner) {
        const w = this.worldW;
        const k = Math.min(1, this.timer * 5);
        ctx.save();
        ctx.globalAlpha = k;
        ctx.fillStyle = 'rgba(31,35,55,0.88)';
        ctx.beginPath();
        ctx.roundRect(w / 2 - 150, h * 0.72 - 30, 300, 60, 18);
        ctx.fill();
        const msg = this.banner.winner < 0 ? 'DRAW!' : `${this.name(this.banner.winner)} SCORES!`;
        R.text(ctx, msg, w / 2, h * 0.72, 24, this.banner.winner < 0 ? '#fff' : '#ffc23d');
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------- Demo (menu background)
  class DemoSession {
    constructor() {
      this.worldW = C.SOLO_W;
      this.worldH = C.H;
      this.paused = false;
      this.shake = 0;
      this.reset();
    }

    get pausable() {
      return false;
    }

    reset() {
      this.arena = new BB.Arena({ w: C.SOLO_W, seed: U.randomSeed(), diff: 'normal', theme: 'normal', skin: BB.getSkin(save().equippedSkin) });
      this.arena.showScore = false;
      this.ai = new BB.Bot(this.arena, BB.BOTS[4]);
      this.arena.start();
      this.timer = 0;
    }

    setSkin(skin) {
      this.arena.bird.skin = skin;
    }

    letterbox() {
      return '#1f2337';
    }

    press() {}

    update(dt) {
      this.ai.update(dt);
      this.arena.update(dt);
      if (!this.arena.bird.alive) {
        this.timer += dt;
        if (this.timer > 1.2) this.reset();
      }
    }

    shakeOffset() {
      return [0, 0];
    }

    render(ctx) {
      R.arena(ctx, this.arena);
    }
  }

  BB.SoloSession = SoloSession;
  BB.VersusSession = VersusSession;
  BB.DemoSession = DemoSession;
})();
