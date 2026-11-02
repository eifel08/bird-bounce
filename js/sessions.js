/* Bird Bounce — solo wall-bounce sessions (Normal / Hard) and the menu Demo. Cave and 1 vs 1 live in their own files. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util, R = BB.Render;
  const save = () => BB.Storage.data;

  const MODE_INFO = {
    normal: { label: 'NORMAL', hint: 'Blue diamonds hide by the spikes' },
    hard: { label: 'HARD MODE', hint: 'Spikes on the move · no loot' },
  };

  class SoloSession {
    constructor(mode) {
      this.mode = mode;
      this.worldW = C.SOLO_W;
      this.worldH = C.H;
      this.paused = false;
      this.state = 'ready';
      this.runBlue = 0;
      this.timer = 0;
      this.shake = 0;
      this.arena = new BB.Arena({
        w: this.worldW,
        seed: U.randomSeed(),
        diff: mode,
        theme: mode,
        items: mode === 'normal' ? { spawn: 0.8, type: 'blue' } : null,
        skin: BB.getSkin(save().equippedSkin),
        onEvent: (e) => this.onEvent(e),
      });
    }

    get pausable() {
      return this.state === 'ready' || this.state === 'playing';
    }

    letterbox() {
      return this.mode === 'hard' ? '#2b1219' : '#1f2337';
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
        s.blue++;
        s.stats.totalBlue++;
        this.runBlue++;
        BB.Audio.play('diamond');
        BB.Storage.save();
        BB.UI.setHudLoot(this.runBlue, 'blue');
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
        if (this.timer > 1.0) {
          this.state = 'over';
          this.finish();
        }
      }
    }

    finish() {
      const s = save();
      const score = this.arena.score;
      const isBest = score > (s.highScores[this.mode] || 0);
      if (isBest) s.highScores[this.mode] = score;
      s.stats.games++;
      s.stats.bestRunBlue = Math.max(s.stats.bestRunBlue, this.runBlue);
      BB.Storage.save();
      BB.UI.showGameOver({ mode: this.mode, score, best: s.highScores[this.mode], isBest, loot: this.runBlue, lootType: this.mode === 'normal' ? 'blue' : null });
      BB.Achievements.check();
    }

    shakeOffset() {
      return this.shake > 0 ? [(Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake] : [0, 0];
    }

    render(ctx) {
      const a = this.arena;
      R.arena(ctx, a);
      if (this.state === 'ready') {
        const info = MODE_INFO[this.mode];
        const pulse = 0.65 + 0.35 * Math.sin(a.time * 5);
        R.text(ctx, info.label, a.w / 2, a.h * 0.25, 22, '#2a2e45', { alpha: 0.8 });
        R.text(ctx, info.hint, a.w / 2, a.h * 0.25 + 26, 15, '#2a2e45', { weight: 500, alpha: 0.65 });
        R.text(ctx, 'TAP TO FLAP', a.w / 2, a.h * 0.74, 26, '#fff', { stroke: 'rgba(30,32,50,0.55)', alpha: pulse });
      }
    }
  }

  // Bot-flown background behind the menus.
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
      this.ai = new BB.Bot(this.arena, BB.BOTS[20]);
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
  BB.DemoSession = DemoSession;
})();
