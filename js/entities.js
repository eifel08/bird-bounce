/* Bird Bounce — simulation: walls with spikes, the bird, and an Arena that ties them together. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util;
  const SLOT_H = (BB.SLOT_H = (C.SLOT_BOTTOM - C.SLOT_TOP) / C.SLOTS);
  const TAU = Math.PI * 2;

  class Wall {
    constructor(side) {
      this.side = side;
      this.slots = new Array(C.SLOTS).fill(false);
      this.extend = 0;
      this.target = 0;
      this.phase = 0;
      this.amp = 0;
      this.speed = 0;
    }

    set(slots, amp, speed, phase) {
      this.slots = slots;
      this.amp = amp;
      this.speed = speed;
      this.phase = phase;
      this.extend = 0;
      this.target = 1;
    }

    retract() {
      this.target = 0;
    }

    // Retract now, then slide `slots` out once fully retracted and `delay` has passed.
    queue(slots, delay) {
      this.retract();
      this.pending = slots;
      this.wait = delay;
    }

    update(dt) {
      const rate = dt * 6;
      if (this.extend < this.target) this.extend = Math.min(this.target, this.extend + rate);
      else if (this.extend > this.target) {
        this.extend = Math.max(this.target, this.extend - rate);
        if (this.extend === 0) this.slots = new Array(C.SLOTS).fill(false);
      }
      if (this.pending) {
        this.wait -= dt;
        if (this.wait <= 0 && this.extend === 0) {
          this.set(this.pending, 0, 0, 0);
          this.pending = null;
        }
      }
      this.phase += this.speed * dt;
    }

    // Vertical shift of the pattern `ahead` seconds from now (used by moving spikes and the AI).
    offsetAt(ahead) {
      return this.amp ? Math.sin(this.phase + this.speed * ahead) * this.amp : 0;
    }

    triangles(w) {
      const out = [];
      if (this.extend <= 0) return out;
      const e = 1 - Math.pow(1 - this.extend, 3);
      const depth = C.SPIKE_DEPTH * e;
      const hh = (SLOT_H * C.SPIKE_FILL) / 2;
      const off = this.offsetAt(0);
      for (let i = 0; i < C.SLOTS; i++) {
        if (!this.slots[i]) continue;
        const cy = C.SLOT_TOP + (i + 0.5) * SLOT_H + off;
        if (this.side === 'left') out.push([0, cy - hh, depth, cy, 0, cy + hh]);
        else out.push([w, cy - hh, w - depth, cy, w, cy + hh]);
      }
      return out;
    }
  }

  class Bird {
    constructor(x, y, dir, skin) {
      this.x = x;
      this.y = y;
      this.homeY = y;
      this.dir = dir;
      this.vx = C.SPEED_X * dir;
      this.vy = 0;
      this.r = C.BIRD_R;
      this.skin = skin;
      this.alive = true;
      this.t = 0;
      this.flapT = 0;
      this.rot = 0;
      this.spin = 0;
      this.squash = 0;
      this.trail = [];
      this.trailT = 0;
      this.g = 1; // -1 = upside-down bird (top player in 1 vs 1): gravity pulls it up the screen
      this.frozen = false;
    }

    flap() {
      this.vy = C.FLAP_V * this.g;
      this.flapT = 1;
    }

    // Shared flight physics; returns 'left'/'right' when it bounced off that wall.
    step(dt, w) {
      this.vy = this.g * Math.min(C.MAX_FALL, this.g * this.vy + C.GRAVITY * dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot = U.clamp((this.g * this.vy) / 1000, -0.45, 0.6);
      this.trailT += dt;
      if (this.trailT > 1 / 60) {
        this.trailT = 0;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 14) this.trail.shift();
      }
      if (this.vx > 0 && this.x + this.r >= w) {
        this.x = w - this.r;
        this.vx = -Math.abs(this.vx);
        this.dir = -1;
        this.squash = 1;
        return 'right';
      }
      if (this.vx < 0 && this.x - this.r <= 0) {
        this.x = this.r;
        this.vx = Math.abs(this.vx);
        this.dir = 1;
        this.squash = 1;
        return 'left';
      }
      return null;
    }

    hitsSpikes(walls, w, h) {
      const hr = this.r * C.HIT_SCALE;
      for (const side of ['left', 'right']) {
        for (const tri of walls[side].triangles(w)) if (U.circleTri(this.x, this.y, hr, tri)) return true;
      }
      return this.y - hr < C.CEIL_TIP || this.y + hr > h - C.CEIL_TIP;
    }

    die() {
      this.alive = false;
      this.vy = -320 * this.g;
      this.spin = (Math.random() < 0.5 ? -1 : 1) * 9;
    }

    stepDead(dt, w, h) {
      this.vy += C.GRAVITY * dt * this.g;
      this.y += this.vy * dt;
      this.x = U.clamp(this.x + this.vx * 0.25 * dt, this.r, w - this.r);
      this.rot += this.spin * dt;
      const lim = C.CEIL_TIP + this.r * 0.4;
      if (this.g > 0 ? this.y > h - lim : this.y < lim) {
        this.y = this.g > 0 ? h - lim : lim;
        this.vy *= -0.35;
        this.spin *= 0.6;
        this.vx *= 0.5;
      }
    }

    hover(t) {
      this.y = this.homeY + Math.sin(t * 4) * 8;
      this.flapT = (Math.sin(t * 14) + 1) / 2;
    }
  }

  class Arena {
    /**
     * o: { x, w, seed, dir, diff: 'normal'|'hard', theme, items: {spawn, type} | null, arrows: 'normal'|'hard'|null, skin, onEvent }
     */
    constructor(o) {
      this.arrowMode = o.arrows || null;
      this.arrows = [];
      this.arrowT = 2.2;
      this.x = o.x || 0;
      this.w = o.w;
      this.h = C.H;
      this.seed = (o.seed || 1) >>> 0;
      this.diff = BB.Difficulty[o.diff || 'normal'];
      this.theme = o.theme || 'normal';
      this.itemsCfg = o.items || null;
      this.onEvent = o.onEvent || function () {};
      this.walls = { left: new Wall('left'), right: new Wall('right') };
      this.bird = new Bird(this.w / 2, this.h / 2, o.dir || 1, o.skin);
      this.particles = [];
      this.items = [];
      this.score = 0;
      this.started = false;
      this.frozen = false;
      this.showScore = true;
      this.time = 0;
      this.bgCur = 0;
      this.flash = 0;
    }

    emit(type, data) {
      this.onEvent(Object.assign({ type, arena: this }, data));
    }

    start() {
      if (this.started) return;
      this.started = true;
      this.bird.flap();
      this.feathers(3);
      this.emit('flap');
    }

    flap() {
      const b = this.bird;
      if (!b.alive || this.frozen) return;
      if (!this.started) return this.start();
      b.flap();
      this.feathers(2);
      this.emit('flap');
    }

    // Housekeeping shared by solo and 1 vs 1 arenas.
    tick(dt) {
      this.time += dt;
      this.bgCur += (Math.floor(this.score / 5) - this.bgCur) * Math.min(1, dt * 2.5);
      this.flash = Math.max(0, this.flash - dt * 2.5);
      this.walls.left.update(dt);
      this.walls.right.update(dt);
      this.updateParticles(dt);
      for (const it of this.items) it.t += dt;
    }

    update(dt) {
      this.tick(dt);
      const b = this.bird;
      b.t += dt;
      if (this.frozen) return;
      b.flapT = Math.max(0, b.flapT - dt * 4);
      b.squash = Math.max(0, b.squash - dt * 6);
      if (!this.started) return b.hover(b.t);
      if (!b.alive) return b.stepDead(dt, this.w, this.h);

      const side = b.step(dt, this.w);
      if (b.hitsSpikes(this.walls, this.w, this.h)) return this.kill();
      if (this.updateArrows(dt)) return this.kill();
      if (side) this.bounce(side);

      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        if (Math.hypot(it.x - b.x, it.y - b.y) < b.r + it.r) {
          this.items.splice(i, 1);
          this.sparkle(it.x, it.y, it.type);
          this.emit('collect', { item: it });
        }
      }
    }

    // Seconds between arrows, or null when arrows are off. Hard: always on. Normal: from score 25.
    arrowInterval() {
      if (this.arrowMode === 'hard') return Math.max(1.3, 3.0 - this.score * 0.03);
      if (this.arrowMode === 'normal' && this.score >= 25) return Math.max(1.8, 4.5 - (this.score - 25) * 0.04);
      return null;
    }

    // Arrows blink in the wall for `warn` seconds, then fly across. Returns true if one hits the bird.
    updateArrows(dt) {
      const iv = this.arrowInterval();
      if (iv) {
        this.arrowT -= dt;
        if (this.arrowT <= 0) {
          this.arrowT = iv * U.rand(0.8, 1.2);
          const fromLeft = Math.random() < 0.5;
          this.arrows.push({ y: U.rand(C.SLOT_TOP + 20, C.SLOT_BOTTOM - 20), warn: 0.8, x: fromLeft ? 8 : this.w - 8, vx: fromLeft ? 250 : -250 });
        }
      }
      const b = this.bird, hr = b.r * C.HIT_SCALE;
      for (const a of this.arrows) {
        if (a.warn > 0) {
          a.warn -= dt;
          if (a.warn <= 0) this.emit('arrow');
          continue;
        }
        a.x += a.vx * dt;
        const tail = a.x - Math.sign(a.vx) * 34;
        if (U.segDist2(b.x, b.y, a.x, a.y, tail, a.y) < hr * hr) return true;
      }
      this.arrows = this.arrows.filter((a) => a.x > -50 && a.x < this.w + 50);
      return false;
    }

    bounce(side) {
      this.score++;
      const hit = this.walls[side];
      const other = this.walls[side === 'left' ? 'right' : 'left'];
      hit.retract();
      const p = this.generate(this.score);
      other.set(p.slots, p.amp, p.speed, p.phase);
      this.wallSparks(side);
      this.emit('bounce', { side });
      this.items = [];
      this.spawnItem(other);
    }

    // Spike pattern for the wall the bird is now heading to. Seeded by score so mirrored arenas match.
    generate(score) {
      const d = this.diff(score);
      const rng = U.mulberry32((this.seed + score * 7919) >>> 0);
      const n = Math.min(C.SLOTS - d.gap, d.min + Math.floor(rng() * (d.max - d.min + 1)));
      let slots = null;
      for (let attempt = 0; attempt < 80 && !slots; attempt++) {
        const s = new Array(C.SLOTS).fill(false);
        let placed = 0;
        while (placed < n) {
          const i = Math.floor(rng() * C.SLOTS);
          if (!s[i]) {
            s[i] = true;
            placed++;
          }
        }
        if (Math.max(0, ...U.freeRuns(s).map((r) => r.len)) >= d.gap) slots = s;
      }
      if (!slots) {
        slots = new Array(C.SLOTS).fill(false);
        const g = Math.floor(rng() * (C.SLOTS - d.gap + 1));
        for (let i = 0, placed = 0; i < C.SLOTS && placed < n; i++) {
          if (i >= g && i < g + d.gap) continue;
          slots[i] = true;
          placed++;
        }
      }
      return { slots, amp: d.amp, speed: d.speed * (rng() < 0.5 ? -1 : 1), phase: rng() * TAU };
    }

    // Blue diamonds sit just off the spike tips of the wall the bird is heading to: high risk, high reward.
    spawnItem(wall) {
      const cfg = this.itemsCfg;
      if (!cfg || Math.random() > cfg.spawn) return;
      const sl = wall.slots;
      const free = [];
      const hugging = [];
      for (let i = 0; i < C.SLOTS; i++) {
        if (sl[i]) continue;
        free.push(i);
        if (sl[i - 1] || sl[i + 1]) hugging.push(i);
      }
      const pool = hugging.length ? hugging : free;
      if (!pool.length) return;
      const i = pool[Math.floor(Math.random() * pool.length)];
      // Nudge toward the neighbouring spike so grabbing it means brushing past the tip.
      const lean = sl[i - 1] && !sl[i + 1] ? -1 : sl[i + 1] && !sl[i - 1] ? 1 : 0;
      const y = C.SLOT_TOP + (i + 0.5) * BB.SLOT_H + lean * BB.SLOT_H * 0.18;
      const x = wall.side === 'left' ? C.SPIKE_DEPTH + 14 : this.w - C.SPIKE_DEPTH - 14;
      this.items.push({ type: cfg.type, x, y, t: Math.random() * 6, r: 11, value: 1 });
    }

    kill(b = this.bird) {
      b.die();
      this.flash = 1;
      this.feathers(22, true, b);
      this.emit('die', { bird: b });
    }

    // ---- particles ----
    addParticle(p) {
      if (this.particles.length > 220) this.particles.shift();
      this.particles.push(p);
    }

    feathers(n, burst, b = this.bird) {
      const sk = b.skin;
      for (let i = 0; i < n; i++) {
        const a = burst ? Math.random() * TAU : Math.PI / 2 + U.rand(-0.6, 0.6);
        const sp = burst ? U.rand(80, 300) : U.rand(30, 90);
        this.addParticle({
          kind: 'feather', x: b.x - b.dir * b.r * 0.4, y: b.y + 4,
          vx: Math.cos(a) * sp - (burst ? 0 : b.vx * 0.15), vy: Math.sin(a) * sp,
          g: 220, life: burst ? U.rand(0.8, 1.4) : 0.6, max: burst ? 1.4 : 0.6,
          size: burst ? U.rand(4, 7) : U.rand(3, 5), color: Math.random() < 0.6 ? sk.body : sk.wing,
          rot: Math.random() * TAU, vr: U.rand(-6, 6),
        });
      }
    }

    wallSparks(side, b = this.bird) {
      const x = side === 'left' ? 2 : this.w - 2;
      for (let i = 0; i < 8; i++) {
        const a = (side === 'left' ? 0 : Math.PI) + U.rand(-1.1, 1.1);
        const sp = U.rand(60, 180);
        this.addParticle({ kind: 'spark', x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, life: 0.35, max: 0.35, size: U.rand(2, 3.5), color: '#ffffff' });
      }
    }

    sparkle(x, y, type) {
      const color = type === 'purple' ? '#d7b8ff' : '#9fd0ff';
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * TAU, sp = U.rand(60, 200);
        this.addParticle({ kind: 'star', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 120, life: 0.6, max: 0.6, size: U.rand(3, 6), color, rot: Math.random() * TAU, vr: U.rand(-5, 5) });
      }
    }

    updateParticles(dt) {
      const ps = this.particles;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life -= dt;
        if (p.life <= 0) {
          ps.splice(i, 1);
          continue;
        }
        p.vy += p.g * dt;
        p.vx *= 1 - dt * 1.5;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.vr) p.rot += p.vr * dt;
      }
    }
  }

  BB.Wall = Wall;
  BB.Bird = Bird;
  BB.Arena = Arena;
})();
