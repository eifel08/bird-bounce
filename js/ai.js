/* Bird Bounce — bot controller. Aims for a safe gap on the wall ahead and flaps to hold that height. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util;

  class Bot {
    constructor(arena, params) {
      this.a = arena;
      this.p = params;
      this.cool = 0;
      this.think = 0;
      this.lastScore = -1;
      this.run = null;
      this.err = 0;
    }

    targetWall() {
      return this.a.bird.vx > 0 ? this.a.walls.right : this.a.walls.left;
    }

    // Choose which free run of slots to aim for after each bounce.
    pickRun() {
      const b = this.a.bird;
      const runs = U.freeRuns(this.targetWall().slots);
      if (!runs.length) {
        this.run = null;
        return;
      }
      const centre = (r) => C.SLOT_TOP + (r.start + r.len / 2) * BB.SLOT_H;
      const blunder = Math.random() < this.p.blunder;
      if (blunder) this.run = runs[Math.floor(Math.random() * runs.length)];
      else {
        const usable = runs.filter((r) => r.len >= 2);
        const pool = usable.length ? usable : runs;
        this.run = pool.reduce((best, r) => (Math.abs(centre(r) - b.y) - r.len * 12 < Math.abs(centre(best) - b.y) - best.len * 12 ? r : best));
      }
      this.err = (Math.random() * 2 - 1) * this.p.noise * (blunder ? 2.5 : 1);
    }

    targetY() {
      const a = this.a, b = a.bird;
      const wall = this.targetWall();
      const dist = b.vx > 0 ? a.w - b.r - b.x : b.x - b.r;
      const tArrive = Math.abs(dist / b.vx);
      let y = a.h / 2;
      if (this.run) {
        // Edge runs are bounded by the ceiling/floor, so aim a bit inward there.
        let lo = C.SLOT_TOP + this.run.start * BB.SLOT_H;
        let hi = lo + this.run.len * BB.SLOT_H;
        if (this.run.start === 0) lo += 18;
        if (this.run.start + this.run.len === C.SLOTS) hi -= 18;
        y = (lo + hi) / 2 + wall.offsetAt(tArrive);
      }
      return U.clamp(y + this.err, C.CEIL_TIP + 70, a.h - C.CEIL_TIP - 40);
    }

    update(dt) {
      const a = this.a, b = a.bird, p = this.p;
      if (!a.started || !b.alive || a.frozen) return;
      this.cool -= dt;
      this.think -= dt;
      if (a.score !== this.lastScore) {
        this.lastScore = a.score;
        this.pickRun();
      }
      if (this.think > 0) return;
      this.think = p.think;
      // A flap lifts the bird ~70px, so flapping once it falls `bias` px below the target
      // keeps it oscillating around the target. Predict ahead by the think interval to cover latency.
      const ty = this.targetY();
      const L = p.think;
      const py = b.y + b.vy * L + 0.5 * C.GRAVITY * L * L;
      const apex = py - (C.FLAP_V * C.FLAP_V) / (2 * C.GRAVITY);
      const nearFloor = py > a.h - C.CEIL_TIP - 40;
      if (apex < C.CEIL_TIP + 18 && !nearFloor) return;
      const threshold = ty + p.bias + (Math.random() * 2 - 1) * p.tol;
      if (b.vy > -60 && py > threshold && this.cool <= 0) {
        a.flap();
        this.cool = p.cool;
      }
    }
  }

  BB.Bot = Bot;
})();
