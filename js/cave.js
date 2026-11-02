/* Bird Bounce — Cave mode: the bird falls through a dark shaft. Spikes and purple diamonds scroll up
 * from below along swaying, irregular paths. Tap to switch direction; the flashlight points straight down. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util, R = BB.Render;
  const K = C.CAVE;
  const TAU = Math.PI * 2;
  const save = () => BB.Storage.data;

  class CaveWorld {
    constructor(o) {
      this.w = C.SOLO_W;
      this.h = C.H;
      this.onEvent = o.onEvent || function () {};
      this.dir = Math.random() < 0.5 ? -1 : 1;
      this.bird = new BB.Bird(this.w / 2, K.BIRD_Y, this.dir, o.skin);
      this.bird.vx = 0;
      this.obstacles = [];
      this.items = [];
      this.particles = [];
      this.score = 0;
      this.started = false;
      this.time = 0;
      this.dist = 0;
      this.flash = 0;
      this.scroll = 0;
      this.nextY = this.h + 60;
      this.rocks = Array.from({ length: 40 }, () => ({ x: Math.random() * this.w, y: Math.random() * this.h * 2, r: U.rand(2, 7), s: U.rand(0.3, 0.7) }));
    }

    emit(type, data) {
      this.onEvent(Object.assign({ type }, data));
    }

    speed() {
      return Math.min(K.SCROLL_MAX, K.SCROLL0 + this.score * 2.2);
    }

    flap() {
      const b = this.bird;
      if (!b.alive) return;
      if (!this.started) this.started = true;
      else this.dir = -this.dir;
      b.dir = this.dir;
      b.flapT = 1;
      this.feathers(3);
      this.emit('flap');
    }

    // ---------- level generation ----------
    // Rows get closer together and wobblier with depth; gaps always leave room to pass.
    spawnRow(y) {
      const s = this.score, w = this.w;
      const tier = s < 10 ? 0 : s < 30 ? 1 : 2;
      const roll = Math.random();
      let ob;
      if (tier >= 1 && roll < (tier === 1 ? 0.25 : 0.4)) {
        const gapW = U.rand(128, 150);
        const gx = U.rand(K.WALL + gapW / 2 + 30, w - K.WALL - gapW / 2 - 30);
        ob = { type: 'double', y, gx, gapW, amp: tier === 2 ? U.rand(20, 45) : 0, f: U.rand(0.8, 1.6), ph: Math.random() * TAU };
      } else if (roll < 0.62) {
        const side = Math.random() < 0.5 ? 'left' : 'right';
        ob = { type: 'ledge', y, side, len: U.rand(80, 200), osc: tier ? U.rand(15, 30 + tier * 10) : 0, f: U.rand(1, 2.2), ph: Math.random() * TAU };
      } else {
        const cx = U.rand(K.WALL + 55, w - K.WALL - 55);
        ob = { type: 'ball', y, cx, rad: 15, amp: Math.min(cx - K.WALL - 30, w - K.WALL - 30 - cx, U.rand(10, 40 + tier * 30)), f: U.rand(1, 2.4), ph: Math.random() * TAU };
      }
      this.obstacles.push(ob);
      if (Math.random() < 0.6) this.items.push({ ob, side: Math.random() < 0.5 ? -1 : 1, t: 0, r: 11, type: 'purple' });
      const spacing = [U.rand(230, 290), U.rand(195, 255), U.rand(165, 225)][tier];
      // Non-linear rhythm: every few rows bunch up or stretch out.
      return spacing * (1 + 0.25 * Math.sin(this.dist * 0.004));
    }

    ledgeExtent(ob) {
      const len = ob.len + (ob.osc ? Math.sin(ob.ph + this.time * ob.f) * ob.osc : 0);
      return ob.side === 'left' ? [0, len] : [this.w - len, this.w];
    }

    doubleExtents(ob) {
      const gx = ob.gx + (ob.amp ? Math.sin(ob.ph + this.time * ob.f) * ob.amp : 0);
      return [[0, gx - ob.gapW / 2], [gx + ob.gapW / 2, this.w]];
    }

    ballX(ob) {
      return ob.cx + Math.sin(ob.ph + this.time * ob.f) * ob.amp;
    }

    // Purple diamond hugs the spike tip it belongs to.
    itemPos(it) {
      const ob = it.ob;
      if (ob.type === 'ledge') {
        const [x0, x1] = this.ledgeExtent(ob);
        return { x: ob.side === 'left' ? x1 + 22 : x0 - 22, y: ob.y };
      }
      if (ob.type === 'double') {
        const [[, l1], [r0]] = this.doubleExtents(ob);
        return { x: it.side < 0 ? l1 + 22 : r0 - 22, y: ob.y };
      }
      return { x: this.ballX(ob) + it.side * (ob.rad + 22), y: ob.y };
    }

    // ---------- simulation ----------
    update(dt) {
      this.time += dt;
      this.flash = Math.max(0, this.flash - dt * 2.5);
      BB.Arena.prototype.updateParticles.call(this, dt);
      const b = this.bird;
      b.t += dt;
      b.flapT = Math.max(0, b.flapT - dt * 4);

      if (!this.started) {
        b.y = K.BIRD_Y + Math.sin(b.t * 4) * 6;
        b.rot = 0.3;
        return;
      }

      if (!b.alive) {
        this.scroll = Math.max(0, this.scroll - dt * 400);
        b.vy += C.GRAVITY * dt * 0.6;
        b.y += b.vy * dt;
        b.rot += b.spin * dt;
      } else {
        this.scroll = this.speed();
        b.vx += (this.dir * K.VX - b.vx) * Math.min(1, dt * 9);
        b.x += b.vx * dt;
        b.y += (K.BIRD_Y - b.y) * Math.min(1, dt * 5);
        b.rot = 0.35 + (b.vx * this.dir) / K.VX * 0.1;
        b.trailT += dt;
        if (b.trailT > 1 / 60) {
          b.trailT = 0;
          for (const p of b.trail) p.y -= this.scroll / 60;
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 14) b.trail.shift();
        }
      }

      const dy = this.scroll * dt;
      this.dist += dy;
      for (const ob of this.obstacles) ob.y -= dy;
      for (const p of this.particles) p.y -= dy;
      for (const it of this.items) it.t += dt;
      this.nextY -= dy;
      while (this.nextY < this.h + 60) this.nextY += this.spawnRow(this.nextY);
      this.obstacles = this.obstacles.filter((ob) => ob.y > -60);
      this.items = this.items.filter((it) => this.obstacles.includes(it.ob));

      if (!b.alive) return;

      for (const ob of this.obstacles) {
        if (!ob.passed && ob.y < b.y - 20) {
          ob.passed = true;
          this.score++;
          this.emit('score');
        }
      }

      if (this.collides()) return this.kill();

      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        const p = this.itemPos(it);
        if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + it.r) {
          this.items.splice(i, 1);
          BB.Arena.prototype.sparkle.call(this, p.x, p.y, 'purple');
          this.emit('collect', { item: it });
        }
      }
    }

    collides() {
      const b = this.bird, hr = b.r * 0.72;
      if (b.x - hr < K.WALL || b.x + hr > this.w - K.WALL) return true;
      const hitRect = (x0, x1, y) => {
        const cx = U.clamp(b.x, x0, x1 + 6), cy = U.clamp(b.y, y - 15, y + 15);
        return Math.hypot(b.x - cx, b.y - cy) < hr;
      };
      for (const ob of this.obstacles) {
        if (Math.abs(ob.y - b.y) > 60) continue;
        if (ob.type === 'ledge') {
          const [x0, x1] = this.ledgeExtent(ob);
          if (ob.side === 'left' ? hitRect(x0, x1, ob.y) : hitRect(x0 - 6, x1, ob.y)) return true;
        } else if (ob.type === 'double') {
          const [[l0, l1], [r0, r1]] = this.doubleExtents(ob);
          if (hitRect(l0, l1, ob.y) || hitRect(r0 - 6, r1, ob.y)) return true;
        } else if (Math.hypot(b.x - this.ballX(ob), b.y - ob.y) < ob.rad + hr - 2) return true;
      }
      return false;
    }

    kill() {
      const b = this.bird;
      b.alive = false;
      b.vy = -200;
      b.spin = (Math.random() < 0.5 ? -1 : 1) * 9;
      this.flash = 1;
      this.feathers(22, true);
      this.emit('die');
    }

    feathers(n, burst) {
      BB.Arena.prototype.feathers.call(this, n, burst, this.bird);
    }

    addParticle(p) {
      BB.Arena.prototype.addParticle.call(this, p);
    }
  }

  // ---------- drawing ----------
  const ROCK = '#262b3d', LEDGE = '#5b6378', TEETH = '#c2cadc';

  function drawTeethBar(ctx, x0, x1, y, tipDir) {
    ctx.fillStyle = LEDGE;
    ctx.fillRect(x0, y - 7, x1 - x0, 14);
    ctx.fillStyle = TEETH;
    ctx.beginPath();
    for (let x = x0 + 4; x < x1 - 8; x += 16) {
      ctx.moveTo(x, y - 7);
      ctx.lineTo(x + 8, y - 16);
      ctx.lineTo(x + 16, y - 7);
      ctx.moveTo(x, y + 7);
      ctx.lineTo(x + 8, y + 16);
      ctx.lineTo(x + 16, y + 7);
    }
    const tx = tipDir > 0 ? x1 : x0;
    ctx.moveTo(tx, y - 8);
    ctx.lineTo(tx + tipDir * 14, y);
    ctx.lineTo(tx, y + 8);
    ctx.fill();
  }

  function drawBall(ctx, x, y, rad, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 2);
    ctx.fillStyle = TEETH;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      ctx.moveTo(Math.cos(a - 0.25) * rad * 0.8, Math.sin(a - 0.25) * rad * 0.8);
      ctx.lineTo(Math.cos(a) * (rad + 9), Math.sin(a) * (rad + 9));
      ctx.lineTo(Math.cos(a + 0.25) * rad * 0.8, Math.sin(a + 0.25) * rad * 0.8);
    }
    ctx.fill();
    ctx.fillStyle = LEDGE;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  R.cave = function (ctx, cw, angleDeg, reveal) {
    const w = cw.w, h = cw.h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.fillStyle = ROCK;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (const r of cw.rocks) {
      const y = (((r.y - cw.dist * r.s) % (h * 2)) + h * 2) % (h * 2) - h * 0.5;
      ctx.beginPath();
      ctx.arc(r.x, y, r.r, 0, TAU);
      ctx.fill();
    }

    for (const ob of cw.obstacles) {
      if (ob.type === 'ledge') {
        const [x0, x1] = cw.ledgeExtent(ob);
        drawTeethBar(ctx, x0, x1, ob.y, ob.side === 'left' ? 1 : -1);
      } else if (ob.type === 'double') {
        const [[l0, l1], [r0, r1]] = cw.doubleExtents(ob);
        drawTeethBar(ctx, l0, l1, ob.y, 1);
        drawTeethBar(ctx, r0, r1, ob.y, -1);
      } else drawBall(ctx, cw.ballX(ob), ob.y, ob.rad, cw.time);
    }
    for (const it of cw.items) {
      const p = cw.itemPos(it);
      R.diamond(ctx, p.x, p.y, it.r, it.t, 'purple', false);
    }

    // spiked side walls, scrolling with the fall
    ctx.fillStyle = '#3a3f50';
    ctx.fillRect(0, 0, 8, h);
    ctx.fillRect(w - 8, 0, 8, h);
    ctx.fillStyle = TEETH;
    ctx.beginPath();
    const pitch = 24, off = -(cw.dist % pitch);
    for (let y = off - pitch; y < h + pitch; y += pitch) {
      ctx.moveTo(7, y);
      ctx.lineTo(K.WALL, y + pitch / 2);
      ctx.lineTo(7, y + pitch);
      ctx.moveTo(w - 7, y);
      ctx.lineTo(w - K.WALL, y + pitch / 2);
      ctx.lineTo(w - 7, y + pitch);
    }
    ctx.fill();

    const b = cw.bird;
    R.trail(ctx, b.trail, b.skin, b.r, cw.time);
    R.particles(ctx, cw.particles);
    R.bird(ctx, b.x, b.y, b.r, b.skin, { dir: b.dir, rot: b.rot, flap: b.flapT, t: b.t, dead: !b.alive });
    if (cw.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${cw.flash * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    R.darkness(ctx, { x: 0, w, h, bird: b }, angleDeg, reveal, Math.PI / 2);
    R.text(ctx, String(cw.score), w / 2, 58, 44, 'rgba(255,255,255,0.35)');
  };

  // ---------- session ----------
  class CaveSession {
    constructor() {
      this.mode = 'cave';
      this.worldW = C.SOLO_W;
      this.worldH = C.H;
      this.paused = false;
      this.state = 'ready';
      this.runPurple = 0;
      this.timer = 0;
      this.shake = 0;
      this.reveal = 0;
      this.world = new CaveWorld({ skin: BB.getSkin(save().equippedSkin), onEvent: (e) => this.onEvent(e) });
      this.angle = BB.FLASHLIGHT.angles[save().flashlightLevel];
    }

    get pausable() {
      return this.state === 'ready' || this.state === 'playing';
    }

    letterbox() {
      return '#05060b';
    }

    press() {
      if (this.paused) return;
      if (this.state === 'ready') this.state = 'playing';
      if (this.state === 'playing') this.world.flap();
    }

    onEvent(e) {
      const s = save();
      if (e.type === 'flap') BB.Audio.play('flap');
      else if (e.type === 'score') BB.Audio.play('bounce');
      else if (e.type === 'collect') {
        s.purple++;
        s.stats.totalPurple++;
        this.runPurple++;
        BB.Audio.play('diamond');
        BB.Storage.save();
        BB.UI.setHudLoot(this.runPurple, 'purple');
      } else if (e.type === 'die') {
        BB.Audio.play('die');
        this.state = 'dead';
        this.timer = 0;
        this.shake = 10;
      }
    }

    update(dt) {
      if (this.paused) return;
      this.world.update(dt);
      this.shake = Math.max(0, this.shake - dt * 40);
      if (this.state === 'dead') {
        this.timer += dt;
        this.reveal = Math.min(0.8, this.reveal + dt * 2);
        if (this.timer > 1.1) {
          this.state = 'over';
          this.finish();
        }
      }
    }

    finish() {
      const s = save();
      const score = this.world.score;
      const isBest = score > s.highScores.cave;
      if (isBest) s.highScores.cave = score;
      s.stats.games++;
      s.stats.bestRunPurple = Math.max(s.stats.bestRunPurple, this.runPurple);
      BB.Storage.save();
      BB.UI.showGameOver({ mode: 'cave', score, best: s.highScores.cave, isBest, loot: this.runPurple, lootType: 'purple' });
      BB.Achievements.check();
    }

    shakeOffset() {
      return this.shake > 0 ? [(Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake] : [0, 0];
    }

    render(ctx) {
      const cw = this.world;
      R.cave(ctx, cw, this.angle, this.reveal);
      if (this.state === 'ready') {
        const pulse = 0.65 + 0.35 * Math.sin(cw.time * 5);
        R.text(ctx, 'CAVE MODE', cw.w / 2, cw.h * 0.55, 22, '#ffd166', { alpha: 0.85 });
        R.text(ctx, 'Falling deep · tap to switch direction', cw.w / 2, cw.h * 0.55 + 26, 14, '#fff', { weight: 500, alpha: 0.7 });
        R.text(ctx, 'TAP TO START', cw.w / 2, cw.h * 0.74, 26, '#fff', { stroke: 'rgba(0,0,0,0.6)', alpha: pulse });
      }
    }
  }

  BB.CaveWorld = CaveWorld;
  BB.CaveSession = CaveSession;
})();
