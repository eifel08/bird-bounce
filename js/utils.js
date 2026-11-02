/* Bird Bounce — math, colour and collision helpers. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});

  const U = (BB.Util = {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randomSeed = () => (Math.random() * 0xffffffff) >>> 0;

  // Deterministic PRNG so both versus arenas get identical spike patterns.
  U.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.hex = function (h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  U.mixRgb = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  U.css = (c, alpha = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;

  U.segDist2 = function (px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + t * dx - px, cy = ay + t * dy - py;
    return cx * cx + cy * cy;
  };

  U.pointInTri = function (px, py, ax, ay, bx, by, cx, cy) {
    const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
    const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
    const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
    const neg = d1 < 0 || d2 < 0 || d3 < 0;
    const pos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(neg && pos);
  };

  // tri = [ax, ay, bx, by, cx, cy]
  U.circleTri = function (cx, cy, r, t) {
    const r2 = r * r;
    return (
      U.pointInTri(cx, cy, t[0], t[1], t[2], t[3], t[4], t[5]) ||
      U.segDist2(cx, cy, t[0], t[1], t[2], t[3]) < r2 ||
      U.segDist2(cx, cy, t[2], t[3], t[4], t[5]) < r2 ||
      U.segDist2(cx, cy, t[4], t[5], t[0], t[1]) < r2
    );
  };

  // Contiguous runs of free (false) slots.
  U.freeRuns = function (slots) {
    const runs = [];
    let start = -1;
    for (let i = 0; i <= slots.length; i++) {
      const free = i < slots.length && !slots[i];
      if (free && start < 0) start = i;
      if (!free && start >= 0) {
        runs.push({ start, len: i - start });
        start = -1;
      }
    }
    return runs;
  };
})();
