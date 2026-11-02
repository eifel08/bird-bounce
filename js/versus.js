/* Bird Bounce — 1 vs 1 on one shared screen (local or vs bot).
 * Player 1 sits at the top edge and plays upside-down; Player 2 sits at the bottom edge.
 * The arena is symmetric under a 180° rotation, so both players face exactly the same spikes. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util, R = BB.Render;
  const save = () => BB.Storage.data;

  const TOP = 0, BOTTOM = 1;

  class SharedArena extends BB.Arena {
    constructor(o) {
      super({ w: C.SOLO_W, seed: o.seed, diff: 'normal', theme: 'normal', skin: o.skins[BOTTOM], onEvent: o.onEvent });
      const w = this.w, h = this.h;
      const top = new BB.Bird(w / 2, h / 2 - 60, -1, o.skins[TOP]);
      top.g = -1;
      const bottom = new BB.Bird(w / 2, h / 2 + 60, 1, o.skins[BOTTOM]);
      this.birds = [top, bottom];
    }

    start() {
      if (this.started) return;
      this.started = true;
      this.birds.forEach((b, i) => {
        b.flap();
        this.feathers(3, false, b);
      });
    }

    flap(i) {
      const b = this.birds[i];
      if (!this.started || !b.alive || b.frozen) return;
      b.flap();
      this.feathers(2, false, b);
      this.emit('flap', { player: i });
    }

    update(dt) {
      this.tick(dt);
      let bounced = false;
      this.birds.forEach((b, i) => {
        b.t += dt;
        if (b.frozen) return;
        b.flapT = Math.max(0, b.flapT - dt * 4);
        b.squash = Math.max(0, b.squash - dt * 6);
        if (!this.started) return b.hover(b.t);
        if (!b.alive) return b.stepDead(dt, this.w, this.h);
        const side = b.step(dt, this.w);
        if (b.hitsSpikes(this.walls, this.w, this.h)) {
          this.kill(b);
          this.emit('dieP', { player: i });
          return;
        }
        if (side) {
          bounced = true;
          this.wallSparks(side, b);
        }
      });
      // Both birds always reach the walls on the same frame (mirrored horizontal motion).
      if (bounced) this.bounceBoth();
    }

    // The bottom player's target wall gets the pattern; the other wall gets it rotated 180°.
    bounceBoth() {
      this.score++;
      const p = this.generate(this.score);
      const lead = this.birds[BOTTOM].alive ? this.birds[BOTTOM] : this.birds[TOP];
      const leadHeadsRight = lead === this.birds[BOTTOM] ? lead.vx > 0 : lead.vx < 0;
      const toward = leadHeadsRight ? this.walls.right : this.walls.left;
      const away = toward === this.walls.right ? this.walls.left : this.walls.right;
      toward.queue(p.slots, 0.12);
      away.queue(p.slots.slice().reverse(), 0.12);
      this.emit('bounce');
    }
  }

  // Lets the standard bot steer the upside-down top bird by presenting the world rotated.
  function flippedView(arena, i) {
    const H = arena.h;
    const flip = (w) => ({
      get slots() {
        return w.slots.slice().reverse();
      },
      get pending() {
        return w.pending && w.pending.slice().reverse();
      },
      offsetAt: () => 0,
    });
    return {
      get bird() {
        const b = arena.birds[i];
        return { x: b.x, y: H - b.y, vx: b.vx, vy: -b.vy, r: b.r, alive: b.alive };
      },
      walls: { left: flip(arena.walls.left), right: flip(arena.walls.right) },
      get started() {
        return arena.started;
      },
      get frozen() {
        return arena.birds[i].frozen;
      },
      get score() {
        return arena.score;
      },
      w: arena.w,
      h: H,
      flap: () => arena.flap(i),
    };
  }

  class VersusSession {
    constructor(botIndex) {
      this.botIndex = botIndex;
      this.bot = botIndex == null ? null : BB.BOTS[botIndex];
      this.worldW = C.SOLO_W;
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
      if (this.bot) return [Object.assign({ id: 'bot', name: this.bot.name }, this.bot.skin), eq];
      return [BB.getSkin(eq.id === 'ocean' ? 'classic' : 'ocean'), eq];
    }

    newRound() {
      this.round++;
      this.arena = new SharedArena({ seed: U.randomSeed(), skins: this.skins(), onEvent: (e) => this.onEvent(e) });
      this.ai = this.bot ? new BB.Bot(flippedView(this.arena, TOP), this.bot) : null;
      this.state = 'countdown';
      this.count = 2.4;
      this.lastCount = null;
      this.banner = null;
    }

    // side: 0 = top half tapped, 1 = bottom half. Against a bot the human is always the bottom player.
    press(side) {
      if (this.paused || this.state !== 'playing') return;
      this.arena.flap(this.bot ? BOTTOM : side);
    }

    onEvent(e) {
      if (e.type === 'flap' && !(this.bot && e.player === TOP)) BB.Audio.play('flap');
      else if (e.type === 'bounce') BB.Audio.play('bounce');
      else if (e.type === 'die') BB.Audio.play('die');
    }

    update(dt) {
      if (this.paused) return;
      this.shake = Math.max(0, this.shake - dt * 40);
      this.goT = Math.max(0, this.goT - dt);
      if (this.ai && this.state === 'playing') this.ai.update(dt);
      this.arena.update(dt);

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
          this.arena.start();
        }
      } else if (this.state === 'playing') {
        const [t, b] = this.arena.birds;
        if (!t.alive || !b.alive) {
          // Tie round (both crash on the same frame): both score, so matches always end.
          const tie = !t.alive && !b.alive;
          if (tie) this.points = this.points.map((p) => p + 1);
          else this.points[t.alive ? TOP : BOTTOM]++;
          this.arena.birds.forEach((bd) => bd.alive && (bd.frozen = true));
          this.banner = { winner: tie ? -1 : t.alive ? TOP : BOTTOM };
          BB.Audio.play('point');
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
      if (this.bot) return i === BOTTOM ? 'YOU' : this.bot.name.toUpperCase();
      return i === TOP ? 'PLAYER 1' : 'PLAYER 2';
    }

    finish() {
      this.state = 'over';
      const s = save();
      const [pt, pb] = this.points;
      const tie = pt === pb;
      const winner = tie ? -1 : pt > pb ? TOP : BOTTOM;
      const info = { bot: this.bot, points: this.points.slice(), tie, winner, reward: 0, firstWin: false, skin: null };
      if (this.bot) {
        // A tie against a bot counts as a loss: no reward, no progression.
        const won = winner === BOTTOM;
        info.won = won;
        if (won) {
          s.stats.botWins++;
          if (!s.botsDefeated.includes(this.bot.id)) {
            s.botsDefeated.push(this.bot.id);
            s.blue += this.bot.reward;
            info.firstWin = true;
            info.reward = this.bot.reward;
            if (BB.Storage.grantSkin(this.bot.skinReward)) info.skin = this.bot.skinReward;
          }
        }
        BB.Audio.play(won ? 'win' : 'lose');
      } else {
        s.stats.versusMatches++;
        BB.Audio.play('win');
      }
      BB.Storage.save();
      BB.UI.showMatch(info);
      BB.Achievements.check();
    }

    shakeOffset() {
      return this.shake > 0 ? [(Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake] : [0, 0];
    }

    // Text facing a player: the top player reads it rotated 180°.
    label(ctx, str, i, dy, size, color, opts) {
      const a = this.arena;
      const upright = i === BOTTOM || this.bot;
      ctx.save();
      ctx.translate(a.w / 2, a.h / 2);
      if (!upright) ctx.rotate(Math.PI);
      R.text(ctx, str, 0, dy, size, color, opts);
      ctx.restore();
    }

    render(ctx) {
      const a = this.arena;
      R.arena(ctx, a);
      const sideY = (i) => (i === TOP ? -1 : 1);

      for (const i of [TOP, BOTTOM]) {
        // Pips sit on each player's own side of the score circle.
        const y = a.h / 2 + sideY(i) * 118;
        for (let k = 0; k < C.WIN_POINTS; k++) {
          const px = a.w / 2 + (k - (C.WIN_POINTS - 1) / 2) * 26;
          ctx.beginPath();
          ctx.arc(px, y, 9, 0, Math.PI * 2);
          ctx.fillStyle = k < this.points[i] ? '#ffc23d' : 'rgba(255,255,255,0.75)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = k < this.points[i] ? '#d49a00' : 'rgba(40,44,70,0.25)';
          ctx.stroke();
        }
        const upright = i === BOTTOM || this.bot;
        this.label(ctx, this.name(i), i, upright ? sideY(i) * 146 : 146, 16, '#2a2e45', { alpha: 0.7 });
        if (this.state === 'countdown' && this.round === 1) {
          const hint = this.bot ? (i === BOTTOM ? 'TAP ANYWHERE' : '') : i === TOP ? 'TAP TOP HALF' : 'TAP BOTTOM HALF';
          if (hint) this.label(ctx, hint, i, upright ? sideY(i) * 230 : 230, 17, '#2a2e45', { alpha: 0.65 });
        }
      }

      if (this.state === 'countdown') {
        const n = Math.max(1, Math.ceil(this.count / 0.8));
        R.text(ctx, String(n), a.w / 2, a.h / 2, 76, '#fff', { stroke: 'rgba(30,32,50,0.6)' });
      } else if (this.goT > 0) {
        R.text(ctx, 'GO!', a.w / 2, a.h / 2, 64, '#fff', { stroke: 'rgba(30,32,50,0.6)', alpha: Math.min(1, this.goT * 3) });
      }

      if (this.state === 'roundOver' && this.banner) {
        const msg = this.banner.winner < 0 ? 'TIE! +1 EACH' : `${this.name(this.banner.winner)} SCORES!`;
        const col = this.banner.winner < 0 ? '#fff' : '#ffc23d';
        const banner = (i) => {
          ctx.save();
          ctx.translate(a.w / 2, a.h / 2);
          if (i === TOP && !this.bot) ctx.rotate(Math.PI);
          ctx.globalAlpha = Math.min(1, this.timer * 5);
          ctx.fillStyle = 'rgba(31,35,55,0.88)';
          ctx.beginPath();
          ctx.roundRect(-150, 60, 300, 56, 18);
          ctx.fill();
          R.text(ctx, msg, 0, 88, 22, col);
          ctx.restore();
        };
        banner(BOTTOM);
        if (!this.bot) banner(TOP);
      }
    }
  }

  BB.SharedArena = SharedArena;
  BB.VersusSession = VersusSession;
})();
