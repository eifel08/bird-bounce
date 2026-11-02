/* Bird Bounce — bot pilot. No learning or guessing: it re-runs the game's own flight physics to find
 * flap timings that take the bird to a chosen spot on the next wall.
 *  - While the bot should survive, the spot is a random open slot (and the path must dodge swords,
 *    stalactites, snakes and arrows).
 *  - Once the score reaches the bot's death score for this round, the spot is a sword. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util;
  const DT = C.STEP;
  const FINAL = 1.0; // seconds before the wall: switch from hovering to exact planning
  const GRID = 4; // candidate flap times every 4 steps (1/30 s)
  const PROBE = 72; // safety-net lookahead while hovering (0.6 s)

  const slotCentre = (i) => C.SLOT_TOP + (i + 0.5) * BB.SLOT_H;

  // Sword hitboxes of a wall once fully extended (same shape as Wall.triangles).
  function trianglesFor(slots, side, w) {
    const hh = (BB.SLOT_H * C.SPIKE_FILL) / 2, d = C.SPIKE_DEPTH, out = [];
    slots.forEach((on, i) => {
      if (!on) return;
      const cy = slotCentre(i);
      out.push(side === 'left' ? [0, cy - hh, d, cy, 0, cy + hh] : [w, cy - hh, w - d, cy, w, cy + hh]);
    });
    return out;
  }

  function timeToWall(b, w) {
    return (b.vx > 0 ? w - b.r - b.x : b.x - b.r) / Math.abs(b.vx);
  }

  // Does any arrow overlap a bird at (x, y) `t` seconds from now? (Arrows wait out `warn`, then fly.)
  function arrowAt(arrows, x, y, hr, t, w) {
    for (const a of arrows) {
      const fly = t - Math.max(0, a.warn) - DT;
      if (fly < 0) continue;
      const ax = a.x + a.vx * fly, tail = ax - Math.sign(a.vx) * 34;
      if (a.vx > 0 ? ax > w - C.ARROW_END : ax < C.ARROW_END) continue; // already crumbled
      if (U.segDist2(x, y, ax, a.y, tail, a.y) < hr * hr) return true;
    }
    return false;
  }

  /**
   * Replays the game's physics (same step order as Bird.step) from state `st`, flapping on the given
   * step offsets, until the bird reaches the wall. `margin` inflates the hitbox for a safety buffer.
   * Returns { hit: null|'edge'|'sword'|'arrow', i: steps simulated, y: final height }.
   */
  function simulate(st, flaps, env, maxSteps, margin) {
    let { x, y, vx, vy } = st;
    const r = st.r, hr = r * C.HIT_SCALE + margin;
    let fi = 0;
    for (let i = 0; i < maxSteps; i++) {
      if (fi < flaps.length && flaps[fi] === i) {
        vy = C.FLAP_V;
        fi++;
      }
      vy = Math.min(C.MAX_FALL, vy + C.GRAVITY * DT);
      x += vx * DT;
      y += vy * DT;
      if (y - hr < C.CEIL_TIP || y + hr > env.h - C.CEIL_TIP) return { hit: 'edge', i, y };
      const nearWall = vx > 0 ? x > env.w - C.SPIKE_DEPTH - r - 4 : x < C.SPIKE_DEPTH + r + 4;
      if (nearWall) for (const t of env.tris) if (U.circleTri(x, y, hr, t)) return { hit: 'sword', i, y };
      if (arrowAt(env.arrows, x, y, hr, (i + 1) * DT, env.w)) return { hit: 'arrow', i, y };
      if (vx > 0 ? x + r >= env.w : x - r <= 0) {
        // Reached the wall. Make sure the momentum after the bounce doesn't carry the bird into the
        // stalactites or snakes before it can react: coast, and if it's diving toward the snakes allow
        // one flap at the earliest moment the bot can act (two steps later).
        // Also dodge arrows fired from this wall that would catch the bird right after the bounce.
        const yAtWall = y;
        vx = -vx;
        for (let j = 0; j < 45; j++) {
          if (j === 2 && vy > 0 && y + vy * 0.15 > env.h - C.CEIL_TIP - 40) vy = C.FLAP_V;
          vy = Math.min(C.MAX_FALL, vy + C.GRAVITY * DT);
          x += vx * DT;
          y += vy * DT;
          if (y - hr < C.CEIL_TIP || y + hr > env.h - C.CEIL_TIP) return { hit: 'edge', i, y: yAtWall };
          if (arrowAt(env.arrows, x, y, hr, (i + j + 2) * DT, env.w)) return { hit: 'arrow', i, y: yAtWall };
          if (j >= 30 && vy > 0) break; // clear of the wall and falling: the next plan takes over
        }
        return { hit: null, i, y: yAtWall };
      }
    }
    return { hit: null, i: maxSteps, y };
  }

  class Bot {
    /** view: an Arena (or flipped adapter); params.min/max = survival range. No range = never dies. */
    constructor(view, params = {}) {
      this.a = view;
      this.dieAt = params.min != null ? params.min + Math.floor(Math.random() * (params.max - params.min + 1)) : Infinity;
      this.leg = -1;
      this.step = 0;
      this.plan = null;
      this.targetY = view.h / 2;
      this.mode = 'live';
    }

    env(b) {
      const wall = b.vx > 0 ? this.a.walls.right : this.a.walls.left;
      const slots = wall.pending || wall.slots;
      return { w: this.a.w, h: this.a.h, slots, tris: trianglesFor(slots, b.vx > 0 ? 'right' : 'left', this.a.w), arrows: this.a.arrows || [] };
    }

    // New wall ahead: choose where to go.
    newLeg(b) {
      const slots = this.env(b).slots;
      const idx = [...slots.keys()];
      this.plan = null;
      if (this.a.score >= this.dieAt) {
        this.mode = 'die';
        const swords = idx.filter((i) => slots[i]);
        // Aim at the sword closest to the bird; with a bare wall, fly into the stalactites.
        this.targetY = swords.length ? slotCentre(swords.reduce((p, i) => (Math.abs(slotCentre(i) - b.y) < Math.abs(slotCentre(p) - b.y) ? i : p))) : C.CEIL_TIP;
      } else {
        this.mode = 'live';
        // A random open slot it can actually get to before the wall: climbing ~250 px/s, falling faster.
        const open = idx.filter((i) => !slots[i]);
        const t = timeToWall(b, this.a.w) - 0.25;
        const reach = (i) => {
          const dy = slotCentre(i) - b.y;
          return dy < 0 ? -dy < 250 * t : dy < 420 * t;
        };
        const ok = open.filter(reach);
        const pool = ok.length ? ok : [open.reduce((p, i) => (Math.abs(slotCentre(i) - b.y) < Math.abs(slotCentre(p) - b.y) ? i : p))];
        this.targetY = slotCentre(pool[Math.floor(Math.random() * pool.length)]);
      }
    }

    // Candidate flap schedules: none, one flap, two flaps (and optionally three) on a time grid.
    static plans(maxSteps, grid, triples) {
      const ks = [];
      for (let k = 0; k < maxSteps - 6; k += grid) ks.push(k);
      const plans = [[]];
      for (const k1 of ks) plans.push([k1]);
      for (const k1 of ks) for (const k2 of ks) if (k2 - k1 >= 12) plans.push([k1, k2]);
      if (triples) {
        for (const k1 of ks) for (const k2 of ks) for (const k3 of ks) if (k2 - k1 >= 12 && k3 - k2 >= 12) plans.push([k1, k2, k3]);
        // Steady climbs: 2-6 evenly spaced flaps (fast ascents need more than three).
        for (const k0 of ks) {
          for (const period of [10, 14, 18, 24]) {
            for (let n = 2; n <= 6; n++) {
              const p = [];
              for (let j = 0; j < n; j++) p.push(k0 + j * period);
              if (p[n - 1] < maxSteps - 6) plans.push(p);
            }
          }
        }
      }
      return plans;
    }

    // Exact search over flap schedules for the rest of the way to the wall.
    search(b) {
      const env = this.env(b);
      const st = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r };
      const maxSteps = Math.ceil(timeToWall(b, this.a.w) / DT) + 4;
      let plans = Bot.plans(maxSteps, GRID, false);

      let best = null, bestScore = Infinity;
      if (this.mode === 'live') {
        const pickSafe = (margins) => {
          for (const margin of margins) {
            for (const p of plans) {
              const res = simulate(st, p, env, maxSteps, margin);
              if (res.hit) continue;
              const score = Math.abs(res.y - this.targetY) + p.length * 4;
              if (score < bestScore) (bestScore = score), (best = p);
            }
            if (best) return;
          }
        };
        pickSafe([5, 2, 0]);
        // Tight squeeze (1-slot gap + arrows): try finer timing, then three-flap schedules.
        if (!best) {
          plans = Bot.plans(maxSteps, 2, false);
          pickSafe([1, 0]);
        }
        if (!best) {
          plans = Bot.plans(maxSteps, 6, true);
          pickSafe([0]);
        }
        if (!best) {
          // Nothing is safe (e.g. an arrow appeared too late): survive as long as possible.
          let longest = -1;
          for (const p of plans) {
            const res = simulate(st, p, env, maxSteps, 0);
            if (res.i > longest) (longest = res.i), (best = p);
          }
        }
      } else {
        for (const p of plans) {
          const res = simulate(st, p, env, maxSteps, 0);
          if (!res.hit) continue;
          const score = (res.hit === 'sword' ? 0 : 1000) + Math.abs(res.y - this.targetY);
          if (score < bestScore) (bestScore = score), (best = p);
        }
      }
      return { kind: 'final', flaps: (best || []).map((k) => this.step + k) };
    }

    // Re-check the committed plan against the current world (arrows can appear at any time).
    planStillGood(b) {
      const env = this.env(b);
      const st = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r };
      const flaps = this.plan.flaps.map((s) => s - this.step);
      const steps = this.plan.kind === 'escape' ? this.plan.until - this.step : Math.ceil(timeToWall(b, this.a.w) / DT) + 4;
      const res = simulate(st, flaps, env, steps, 0);
      return this.mode === 'live' || this.plan.kind === 'escape' ? !res.hit : !!res.hit;
    }

    // Far from the wall: bob around the target height, with a short physics probe as a safety net.
    hover(b) {
      const ty = U.clamp(this.targetY + 30, C.CEIL_TIP + 90, this.a.h - C.CEIL_TIP - 40);
      const py = b.y + b.vy * 0.1 + 0.5 * C.GRAVITY * 0.01;
      // Far below the target: flap again before the top of the arc to climb fast.
      const far = b.y - ty > 100;
      const flap = b.vy > (far ? -300 : -60) && py > ty + 35 && b.y - 70 > C.CEIL_TIP + 20;
      const env = this.env(b);
      const st = { x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r };
      // Is there some short flap sequence starting with this choice that stays clear of everything?
      const SEQ = { true: [[0], [0, 16], [0, 24], [0, 32], [0, 44]], false: [[], [4], [8], [12], [16], [20], [24], [32], [40], [48], [8, 40]] };
      const ok = (f) => SEQ[f].some((p) => !simulate(st, p, env, PROBE, 2).hit);
      if (ok(flap)) return flap;
      if (ok(!flap)) return !flap;
      // Boxed in (usually an arrow): search every one- and two-flap timing and commit to the safe
      // escape that ends nearest the cruising height (so it doesn't end up hugging the stalactites).
      const horizon = PROBE + 24;
      for (const margin of [1, 0]) {
        let best = null, bestScore = Infinity;
        for (const p of Bot.plans(horizon, 4, false)) {
          const res = simulate(st, p, env, horizon, margin);
          if (res.hit) continue;
          const score = Math.abs(res.y - ty) + p.length * 6;
          if (score < bestScore) (bestScore = score), (best = p);
        }
        if (best) return { kind: 'escape', flaps: best.map((k) => this.step + k), until: this.step + horizon };
      }
      return flap;
    }

    update() {
      const a = this.a, b = a.bird;
      if (!a.started || !b.alive || a.frozen) return;
      this.step++;
      if (a.score !== this.leg) {
        this.leg = a.score;
        this.newLeg(b);
      }
      if (this.step % 2 === 0) {
        if (timeToWall(b, a.w) < FINAL) {
          if (!this.plan || this.plan.kind !== 'final' || !this.planStillGood(b)) this.plan = this.search(b);
        } else if (!(this.plan && this.plan.kind === 'escape' && this.step < this.plan.until && this.planStillGood(b))) {
          this.plan = null;
          const h = this.hover(b);
          if (h === true) a.flap();
          else if (h && h.flaps) this.plan = h;
        }
      }
      if (this.plan && this.plan.flaps.length && this.plan.flaps[0] <= this.step) {
        this.plan.flaps.shift();
        a.flap();
      }
    }
  }

  BB.Bot = Bot;
  BB.BotPlanner = { simulate, trianglesFor, timeToWall };
})();
