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

    update(dt) {
      const rate = dt * 6;
      if (this.extend < this.target) this.extend = Math.min(this.target, this.extend + rate);
      else if (this.extend > this.target) {
        this.extend = Math.max(this.target, this.extend - rate);
        if (this.extend === 0) this.slots = new Array(C.SLOTS).fill(false);
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
    }

    flap() {
      this.vy = C.FLAP_V;
      this.flapT = 1;
    }
  }

  class Arena {
    /**
     * o: { x, w, seed, dir, diff: 'normal'|'hard', theme, items: {spawn, diamond, value} | null, skin, onEvent }
     */
    constructor(o) {
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

    update(dt) {
      this.time += dt;
      this.bgCur += (Math.floor(this.score / 5) - this.bgCur) * Math.min(1, dt * 2.5);
      this.flash = Math.max(0, this.flash - dt * 2.5);
      this.walls.left.update(dt);
      this.walls.right.update(dt);
      this.updateParticles(dt);
      for (const it of this.items) it.t += dt;

      const b = this.bird;
      b.t += dt;
      if (this.frozen) return;
      b.flapT = Math.max(0, b.flapT - dt * 4);
      b.squash = Math.max(0, b.squash - dt * 6);

      if (!this.started) {
        b.y = b.homeY + Math.sin(b.t * 4) * 8;
        b.flapT = (Math.sin(b.t * 14) + 1) / 2;
        return;
      }
      if (!b.alive) return this.updateDead(dt);

      b.vy = Math.min(C.MAX_FALL, b.vy + C.GRAVITY * dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.rot = U.clamp(b.vy / 1000, -0.45, 0.6);

      b.trailT += dt;
      if (b.trailT > 1 / 60) {
        b.trailT = 0;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 14) b.trail.shift();
      }

      const hr = b.r * C.HIT_SCALE;
      for (const side of ['left', 'right']) {
        for (const tri of this.walls[side].triangles(this.w)) {
          if (U.circleTri(b.x, b.y, hr, tri)) return this.kill();
        }
      }
      if (b.y - hr < C.CEIL_TIP || b.y + hr > this.h - C.CEIL_TIP) return this.kill();

      if (b.vx > 0 && b.x + b.r >= this.w) {
        b.x = this.w - b.r;
        b.vx = -Math.abs(b.vx);
        b.dir = -1;
        this.bounce('right');
      } else if (b.vx < 0 && b.x - b.r <= 0) {
        b.x = b.r;
        b.vx = Math.abs(b.vx);
        b.dir = 1;
        this.bounce('left');
      }

      for (let i = this.items.length - 1; i >= 0; i--) {
        const it = this.items[i];
        const iy = it.y + Math.sin(it.t * 3) * 5;
        if (Math.hypot(it.x - b.x, iy - b.y) < b.r + it.r) {
          this.items.splice(i, 1);
          this.sparkle(it.x, iy, it.type);
          this.emit('collect', { item: it });
        }
      }
    }

    updateDead(dt) {
      const b = this.bird;
      b.vy += C.GRAVITY * dt;
      b.y += b.vy * dt;
      b.x = U.clamp(b.x + b.vx * 0.25 * dt, b.r, this.w - b.r);
      b.rot += b.spin * dt;
      const floor = this.h - C.CEIL_TIP - b.r * 0.4;
      if (b.y > floor) {
        b.y = floor;
        b.vy *= -0.35;
        b.spin *= 0.6;
        b.vx *= 0.5;
      }
    }

    bounce(side) {
      this.score++;
      this.bird.squash = 1;
      const hit = this.walls[side];
      const other = this.walls[side === 'left' ? 'right' : 'left'];
      hit.retract();
      const p = this.generate(this.score);
      other.set(p.slots, p.amp, p.speed, p.phase);
      this.wallSparks(side);
      this.emit('bounce', { side });
      this.spawnItem();
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

    spawnItem() {
      const cfg = this.itemsCfg;
      if (!cfg || this.items.length || Math.random() > cfg.spawn) return;
      const type = Math.random() < cfg.diamond ? 'diamond' : 'crystal';
      const b = this.bird;
      for (let tries = 0; tries < 20; tries++) {
        const x = U.rand(70, this.w - 70);
        const y = U.rand(130, this.h - 130);
        if (Math.hypot(x - b.x, y - b.y) > 100) {
          this.items.push({ type, x, y, t: Math.random() * 6, r: type === 'diamond' ? 13 : 12, value: type === 'diamond' ? 1 : cfg.value });
          return;
        }
      }
    }

    kill() {
      const b = this.bird;
      b.alive = false;
      b.vy = -320;
      b.spin = (Math.random() < 0.5 ? -1 : 1) * 9;
      this.flash = 1;
      this.feathers(22, true);
      this.emit('die');
    }

    // ---- particles ----
    addParticle(p) {
      if (this.particles.length > 220) this.particles.shift();
      this.particles.push(p);
    }

    feathers(n, burst) {
      const b = this.bird;
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

    wallSparks(side) {
      const b = this.bird;
      const x = side === 'left' ? 2 : this.w - 2;
      for (let i = 0; i < 8; i++) {
        const a = (side === 'left' ? 0 : Math.PI) + U.rand(-1.1, 1.1);
        const sp = U.rand(60, 180);
        this.addParticle({ kind: 'spark', x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 0, life: 0.35, max: 0.35, size: U.rand(2, 3.5), color: '#ffffff' });
      }
    }

    sparkle(x, y, type) {
      const color = type === 'diamond' ? '#d7b8ff' : '#7fe3ff';
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
