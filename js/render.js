/* Bird Bounce — canvas drawing: pyramid arenas (brick walls, swords, stalactites, snakes, arrows),
 * birds and skin accessories, diamonds, particles, darkness. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util;
  const TAU = Math.PI * 2;
  const FONT = 'Fredoka, ui-rounded, "Segoe UI", system-ui, sans-serif';

  const THEMES = {
    // Sandstone pyramid interior; the tint drifts every 5 points.
    normal: { bgs: ['#f3e3c3', '#f1dcc0', '#efe2bf', '#f4dcc8', '#ebdcb9', '#f2e6cc'], mortar: 'rgba(120,88,45,0.13)', wall: '#b08850', wallDark: '#8a6a3c', stone: '#5d5246', stoneDark: '#3f372f' },
    hard: { bgs: ['#e6c3a0', '#e2b998', '#dcb391', '#e4bd9a'], mortar: 'rgba(110,60,30,0.16)', wall: '#9c6b3f', wallDark: '#74492a', stone: '#4e4038', stoneDark: '#33291f' },
  };

  const R = (BB.Render = { THEMES, FONT });

  R.bgRgb = function (a) {
    const bgs = THEMES[a.theme].bgs, n = bgs.length;
    const i = Math.floor(a.bgCur), f = a.bgCur - i;
    return U.mixRgb(U.hex(bgs[((i % n) + n) % n]), U.hex(bgs[(((i + 1) % n) + n) % n]), f);
  };

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  function ellipse(ctx, x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
    ctx.fill();
  }

  function poly(ctx, pts, r) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r)));
    ctx.closePath();
    ctx.fill();
  }

  function star(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.4 : r;
      const a = rot + (i * Math.PI) / 4;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  R.text = function (ctx, str, x, y, size, color, opts = {}) {
    ctx.save();
    ctx.font = `${opts.weight || 700} ${size}px ${FONT}`;
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'middle';
    if (opts.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = opts.strokeWidth || size * 0.16;
      ctx.strokeStyle = opts.stroke;
      ctx.strokeText(str, x, y);
    }
    ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  };

  // ---------- arena (solo or shared 1 vs 1) ----------
  R.arena = function (ctx, a) {
    const th = THEMES[a.theme], w = a.w, h = a.h;
    ctx.save();
    ctx.translate(a.x, 0);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();

    const bg = R.bgRgb(a);
    ctx.fillStyle = U.css(bg);
    ctx.fillRect(0, 0, w, h);
    const cg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h * 0.6);
    cg.addColorStop(0, 'rgba(255,255,255,0.35)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, w, h);
    R.bricks(ctx, 0, 0, w, h, th.mortar, 22, 46);

    const cr = Math.min(w * 0.3, 88);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    circle(ctx, w / 2, h / 2, cr);
    if (a.showScore) R.text(ctx, String(a.score), w / 2, h / 2 + cr * 0.05, Math.round(cr * 1.05), U.css(U.mixRgb(bg, [30, 32, 50], 0.28)));

    for (const it of a.items) R.diamond(ctx, it.x, it.y + Math.sin(it.t * 3) * 2, it.r, it.t, it.type, true);

    R.ceiling(ctx, w, th);
    R.floor(ctx, w, h, a.time);
    R.sideWalls(ctx, w, h, th);
    R.wallSpikes(ctx, a.walls.left, w);
    R.wallSpikes(ctx, a.walls.right, w);
    if (a.arrows) R.arrows(ctx, a.arrows, w, a.time);

    for (const b of a.birds || [a.bird]) R.trail(ctx, b.trail, b.skin, b.r, a.time);
    R.particles(ctx, a.particles);
    for (const b of a.birds || [a.bird]) R.bird(ctx, b.x, b.y, b.r, b.skin, { dir: b.dir, g: b.g, rot: b.rot, flap: b.flapT, t: b.t, squash: b.squash, dead: !b.alive });

    if (a.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${a.flash * 0.45})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  };

  // Running-bond brick lines.
  R.bricks = function (ctx, x0, y0, w, h, color, bh, bw) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let row = 0, y = y0; y <= y0 + h; row++, y += bh) {
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      const off = row % 2 ? bw / 2 : 0;
      for (let x = x0 - off; x < x0 + w; x += bw) {
        if (x <= x0) continue;
        ctx.moveTo(x, y);
        ctx.lineTo(x, Math.min(y + bh, y0 + h));
      }
    }
    ctx.stroke();
  };

  R.sideWalls = function (ctx, w, h, th) {
    for (const x of [0, w - 8]) {
      ctx.fillStyle = th.wall;
      ctx.fillRect(x, 0, 8, h);
      R.bricks(ctx, x, 0, 8, h, th.wallDark, 14, 16);
    }
  };

  // Jagged stalactites; the longest tips reach the deadly line at CEIL_TIP.
  const STALACTITES = [];
  for (let i = 0, x = -6; i < 40; i++) {
    const wdt = 14 + ((i * 37) % 13);
    STALACTITES.push({ x, w: wdt, len: 0.62 + ((i * 53) % 39) / 100 });
    x += wdt * 0.78;
  }

  R.ceiling = function (ctx, w, th) {
    const g = ctx.createLinearGradient(0, 0, 0, C.CEIL_TIP);
    g.addColorStop(0, th.stoneDark);
    g.addColorStop(1, th.stone);
    ctx.fillStyle = th.stoneDark;
    ctx.fillRect(0, 0, w, C.CEIL_BAND - 4);
    ctx.beginPath();
    for (const s of STALACTITES) {
      if (s.x > w) break;
      const tip = C.CEIL_BAND - 6 + (C.CEIL_TIP - C.CEIL_BAND + 6) * s.len;
      ctx.moveTo(s.x, C.CEIL_BAND - 6);
      ctx.lineTo(s.x + s.w * 0.35, (C.CEIL_BAND + tip) / 2);
      ctx.lineTo(s.x + s.w * 0.5, tip);
      ctx.lineTo(s.x + s.w * 0.62, (C.CEIL_BAND + tip) / 2 + 2);
      ctx.lineTo(s.x + s.w, C.CEIL_BAND - 6);
    }
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Snake pit: sand floor with snakes rearing up to the deadly line.
  const SNAKES = [
    { x: 0.08, c: '#4c8c2b', d: '#2f5e18', ph: 0.0 },
    { x: 0.27, c: '#c9a227', d: '#7a5f10', ph: 1.7 },
    { x: 0.46, c: '#6a994e', d: '#386641', ph: 3.1 },
    { x: 0.64, c: '#b5651d', d: '#6f3b0d', ph: 4.4 },
    { x: 0.82, c: '#4c8c2b', d: '#2f5e18', ph: 5.6 },
    { x: 0.99, c: '#c9a227', d: '#7a5f10', ph: 2.4 },
  ];

  R.floor = function (ctx, w, h, t) {
    const top = h - C.CEIL_BAND;
    ctx.fillStyle = '#c8a46a';
    ctx.fillRect(0, top, w, C.CEIL_BAND);
    ctx.fillStyle = 'rgba(120,85,40,0.35)';
    for (let x = 6; x < w; x += 17) ctx.fillRect(x, top + 6 + ((x * 7) % 9), 3, 2);
    for (const s of SNAKES) {
      const bx = s.x * w;
      const sway = Math.sin(t * 2 + s.ph) * 5;
      const headX = bx + sway, headY = h - C.CEIL_TIP + 7 + Math.sin(t * 3 + s.ph) * 2;
      const body = () => {
        ctx.beginPath();
        ctx.moveTo(bx - 26, h - 4);
        ctx.bezierCurveTo(bx - 4, h - 2, bx + 16, h - 12, bx + 6, h - 20);
        ctx.bezierCurveTo(bx - 4, h - 28, headX - 6, headY + 12, headX, headY + 2);
      };
      ctx.lineCap = 'round';
      ctx.strokeStyle = s.d;
      ctx.lineWidth = 10;
      body();
      ctx.stroke();
      ctx.strokeStyle = s.c;
      ctx.lineWidth = 7;
      body();
      ctx.stroke();
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = 'rgba(255,240,180,0.6)';
      ctx.lineWidth = 2.5;
      body();
      ctx.stroke();
      ctx.setLineDash([]);
      // head
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.ellipse(headX, headY, 6.5, 5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = s.d;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffd60a';
      circle(ctx, headX - 2.4, headY - 1.5, 1.6);
      circle(ctx, headX + 2.4, headY - 1.5, 1.6);
      ctx.fillStyle = '#111';
      ctx.fillRect(headX - 2.7, headY - 2.6, 0.7, 2.2);
      ctx.fillRect(headX + 2.1, headY - 2.6, 0.7, 2.2);
      if (Math.sin(t * 5 + s.ph * 3) > 0.3) {
        ctx.strokeStyle = '#e63946';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(headX, headY - 4);
        ctx.lineTo(headX, headY - 9);
        ctx.lineTo(headX - 2, headY - 11);
        ctx.moveTo(headX, headY - 9);
        ctx.lineTo(headX + 2, headY - 11);
        ctx.stroke();
      }
    }
  };

  // Swords thrust out of the walls (hitbox = the triangle from Wall.triangles).
  R.wallSpikes = function (ctx, wall, w) {
    for (const t of wall.triangles(w)) {
      const bx = t[0], tipX = t[2], cy = t[3];
      const hh = (t[5] - t[1]) / 2;
      const s = tipX > bx ? 1 : -1;
      const L = Math.abs(tipX - bx);
      if (L < 1) continue;
      ctx.save();
      ctx.translate(bx, cy);
      ctx.scale(s, 1);
      const g = ctx.createLinearGradient(0, -hh, 0, hh);
      g.addColorStop(0, '#f8f9fa');
      g.addColorStop(0.5, '#ced4da');
      g.addColorStop(1, '#868e96');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -hh * 0.62);
      ctx.lineTo(L * 0.72, -hh * 0.3);
      ctx.lineTo(L, 0);
      ctx.lineTo(L * 0.72, hh * 0.3);
      ctx.lineTo(0, hh * 0.62);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(73,80,87,0.55)';
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(L * 0.7, 0);
      ctx.stroke();
      // crossguard at the wall
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(0, -hh * 0.95, 5, hh * 1.9);
      ctx.fillStyle = '#7a5f10';
      ctx.fillRect(3.5, -hh * 0.95, 1.5, hh * 1.9);
      ctx.restore();
    }
  };

  // Arrows flying across the arena; while `warn` > 0 the arrow is only peeking out of the wall.
  R.arrows = function (ctx, arrows, w, t) {
    for (const a of arrows) {
      const s = a.vx > 0 ? 1 : -1;
      if (a.warn > 0) {
        const wx = s > 0 ? 8 : w - 8;
        const blink = 0.4 + 0.6 * Math.abs(Math.sin(t * 14));
        const g = ctx.createRadialGradient(wx, a.y, 0, wx, a.y, 22);
        g.addColorStop(0, `rgba(255,60,40,${0.55 * blink})`);
        g.addColorStop(1, 'rgba(255,60,40,0)');
        ctx.fillStyle = g;
        circle(ctx, wx, a.y, 22);
      }
      const tip = a.warn > 0 ? (s > 0 ? 8 + 6 * (1 - a.warn) : w - 8 - 6 * (1 - a.warn)) : a.x;
      ctx.save();
      ctx.translate(tip, a.y);
      ctx.scale(s, 1);
      ctx.strokeStyle = '#7f5539';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-34, 0);
      ctx.stroke();
      ctx.fillStyle = '#adb5bd';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-9, -4.5);
      ctx.lineTo(-9, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.moveTo(-28, 0);
      ctx.lineTo(-36, -5);
      ctx.lineTo(-33, 0);
      ctx.lineTo(-36, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  // ---------- diamonds ----------
  const GEM = {
    blue: { fill: '#3a86ff', light: '#b8d8ff', edge: '#1d5fd1', glow: '90,160,255' },
    purple: { fill: '#a974ff', light: '#e2ceff', edge: '#6b3fd1', glow: '190,140,255' },
  };

  R.diamond = function (ctx, x, y, r, t, kind = 'blue', glow = true) {
    const g = GEM[kind] || GEM.blue;
    ctx.save();
    ctx.translate(x, y);
    if (glow) {
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.3);
      gr.addColorStop(0, `rgba(${g.glow},0.5)`);
      gr.addColorStop(1, `rgba(${g.glow},0)`);
      ctx.fillStyle = gr;
      circle(ctx, 0, 0, r * 2.3);
    }
    ctx.rotate(Math.sin(t * 2) * 0.1);
    ctx.beginPath();
    ctx.moveTo(-r, -0.35 * r);
    ctx.lineTo(-0.55 * r, -0.85 * r);
    ctx.lineTo(0.55 * r, -0.85 * r);
    ctx.lineTo(r, -0.35 * r);
    ctx.lineTo(0, r * 1.05);
    ctx.closePath();
    ctx.fillStyle = g.fill;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = g.edge;
    ctx.stroke();
    ctx.fillStyle = g.light;
    ctx.beginPath();
    ctx.moveTo(-r, -0.35 * r);
    ctx.lineTo(-0.55 * r, -0.85 * r);
    ctx.lineTo(0, -0.85 * r);
    ctx.lineTo(-0.3 * r, -0.35 * r);
    ctx.lineTo(0, r * 1.05);
    ctx.closePath();
    ctx.fill();
    if (glow) {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      star(ctx, 0.35 * r, -0.5 * r, r * (0.3 + 0.2 * Math.sin(t * 7)), t);
    }
    ctx.restore();
  };

  // ---------- particles & trails ----------
  R.particles = function (ctx, ps) {
    for (const p of ps) {
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.fillStyle = p.color;
      if (p.kind === 'feather') ellipse(ctx, p.x, p.y, p.size, p.size * 0.45, p.rot);
      else if (p.kind === 'star') star(ctx, p.x, p.y, p.size * k + 1, p.rot);
      else circle(ctx, p.x, p.y, p.size * k + 0.5);
    }
    ctx.globalAlpha = 1;
  };

  const RAINBOW = ['#ff4d6d', '#ff9f1c', '#ffd23f', '#5bd96b', '#3fa7f5', '#9b5de5'];

  function polyline(ctx, trail, off) {
    ctx.beginPath();
    trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + off) : ctx.moveTo(p.x, p.y + off)));
    ctx.stroke();
  }

  R.trail = function (ctx, trail, skin, r, t) {
    if (!skin.trail || trail.length < 2) return;
    const n = trail.length;
    ctx.save();
    ctx.lineCap = 'round';
    switch (skin.trail) {
      case 'fire':
      case 'thrust':
        for (let i = 0; i < n; i++) {
          const p = trail[i], k = (i + 1) / n;
          const hue = skin.trail === 'thrust' ? 45 + 15 * k : 15 + 35 * k;
          ctx.fillStyle = `hsla(${hue},100%,${55 + 15 * k}%,${0.55 * k})`;
          circle(ctx, p.x + Math.sin(t * 20 + i) * 1.5, p.y + Math.cos(t * 17 + i) * 1.5, r * (skin.trail === 'thrust' ? 0.5 : 0.85) * k);
        }
        break;
      case 'rainbow':
        ctx.lineWidth = r * 0.28;
        ctx.globalAlpha = 0.85;
        RAINBOW.forEach((col, j) => {
          ctx.strokeStyle = col;
          polyline(ctx, trail, (j - 2.5) * r * 0.28);
        });
        break;
      case 'saber':
        ctx.lineWidth = r * 0.5;
        ctx.strokeStyle = 'rgba(255,40,40,0.35)';
        polyline(ctx, trail, 0);
        ctx.lineWidth = r * 0.18;
        ctx.strokeStyle = '#ffd6d6';
        polyline(ctx, trail, 0);
        break;
      case 'sparks':
        for (let i = 0; i < n; i += 2) {
          const p = trail[i], k = (i + 1) / n;
          ctx.fillStyle = `rgba(255,214,10,${k})`;
          star(ctx, p.x + Math.sin(i * 3.1 + t * 9) * r * 0.5, p.y + Math.cos(i * 2.3 + t * 7) * r * 0.5, r * 0.35 * k + 1, t * 4 + i);
        }
        break;
      default: // stars
        for (let i = 0; i < n; i += 2) {
          const p = trail[i], k = (i + 1) / n;
          ctx.fillStyle = i % 4 ? `rgba(255,214,255,${k})` : `rgba(255,255,255,${k})`;
          star(ctx, p.x, p.y + Math.sin(i * 1.7) * r * 0.5, r * 0.45 * k + 1, t * 3 + i);
        }
    }
    ctx.restore();
  };

  // ---------- skin accessories ----------
  // Drawn in the bird's local frame: facing +x, radius r, body centred at 0,0.
  // Phases: back (behind body), skin (clipped to body), face (over the eye), top (over everything).
  const ACC = {
    spots: { phase: 'skin', draw(ctx, r) {
      ctx.fillStyle = '#1d1d1d';
      [[-0.5, -0.45, 0.2], [-0.1, -0.7, 0.16], [-0.65, 0.15, 0.17], [0.05, -0.2, 0.13]].forEach(([x, y, s]) => circle(ctx, x * r, y * r, s * r));
    } },
    stripes: { phase: 'skin', draw(ctx, r) {
      ctx.fillStyle = '#2b1a0e';
      for (let i = -3; i <= 1; i++) poly(ctx, [[i * 0.32 - 0.05, -1.1], [i * 0.32 + 0.1, -1.1], [i * 0.32 + 0.02, -0.3]], r);
    } },
    galaxy: { phase: 'skin', draw(ctx, r, t) {
      ctx.fillStyle = '#fff';
      [[-0.5, -0.4, 1.4], [0.1, -0.7, 1], [-0.2, 0.2, 1.2], [0.6, 0.1, 0.9], [-0.7, 0.3, 0.8]].forEach(([x, y, s], i) => {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i * 2);
        circle(ctx, x * r, y * r, s);
      });
      ctx.globalAlpha = 1;
    } },
    stitches: { phase: 'skin', draw(ctx, r) {
      ctx.strokeStyle = '#2d3a22';
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(-0.7 * r, -0.5 * r);
      ctx.lineTo(0.1 * r, -0.1 * r);
      for (let i = 0; i < 4; i++) {
        const x = -0.6 + i * 0.2, y = -0.45 + i * 0.1;
        ctx.moveTo((x - 0.04) * r, (y - 0.12) * r);
        ctx.lineTo((x + 0.04) * r, (y + 0.12) * r);
      }
      ctx.stroke();
    } },
    skull: { phase: 'skin', draw(ctx, r) {
      ctx.strokeStyle = '#9c9583';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(-0.75 * r, (-0.2 + i * 0.22) * r);
        ctx.quadraticCurveTo(-0.3 * r, (-0.1 + i * 0.22) * r, 0.1 * r, (-0.2 + i * 0.22) * r);
      }
      ctx.stroke();
    } },
    bolts: { phase: 'skin', draw(ctx, r) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      circle(ctx, -0.55 * r, -0.2 * r, r * 0.08);
      circle(ctx, -0.55 * r, 0.25 * r, r * 0.08);
    } },
    glow: { phase: 'back', draw(ctx, r, t) {
      const g = ctx.createRadialGradient(-r, r * 0.2, 0, -r, r * 0.2, r * 1.1);
      g.addColorStop(0, `rgba(220,255,120,${0.75 + 0.25 * Math.sin(t * 5)})`);
      g.addColorStop(1, 'rgba(220,255,120,0)');
      ctx.fillStyle = g;
      circle(ctx, -r, r * 0.2, r * 1.1);
      ctx.fillStyle = '#e9ff70';
      circle(ctx, -r * 0.85, r * 0.2, r * 0.32);
    } },
    vampire: { phase: 'back', draw(ctx, r) {
      ctx.fillStyle = '#9d0208';
      poly(ctx, [[-0.2, -0.6], [-1.6, -0.2], [-1.3, 0.4], [-1.7, 0.9], [-0.3, 0.6]], r);
      ctx.fillStyle = '#10002b';
      poly(ctx, [[0.1, -0.85], [-0.6, -1.15], [-0.4, -0.65]], r);
    } },
    fin: { phase: 'back', draw(ctx, r) {
      ctx.fillStyle = '#3d5a75';
      poly(ctx, [[-0.45, -0.85], [-0.2, -1.65], [0.25, -0.9]], r);
    } },
    halo: { phase: 'back', draw(ctx, r, t) {
      ctx.strokeStyle = '#ffd60a';
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.45 + Math.sin(t * 3) * 2, r * 0.6, r * 0.18, 0, 0, TAU);
      ctx.stroke();
    } },
    teeth: { phase: 'face', draw(ctx, r) {
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) poly(ctx, [[0.55 + i * 0.13, 0.3], [0.68 + i * 0.13, 0.3], [0.615 + i * 0.13, 0.48]], r);
    } },
    shades: { phase: 'face', draw(ctx, r) {
      ctx.fillStyle = '#16161e';
      ctx.beginPath();
      ctx.roundRect(r * 0.12, -r * 0.5, r * 0.72, r * 0.34, r * 0.1);
      ctx.fill();
      ctx.fillRect(-r * 0.3, -r * 0.42, r * 0.5, r * 0.08);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(r * 0.22, -r * 0.44, r * 0.18, r * 0.06);
    } },
    pirate: { phase: 'face', draw(ctx, r, t, sk) {
      ctx.fillStyle = '#111';
      circle(ctx, r * 0.45, -r * 0.32, r * 0.3);
      ctx.fillRect(-r * 0.9, -r * 0.62, r * 1.5, r * 0.07);
      ACC.bandana.draw(ctx, r, t, sk);
    } },
    bandana: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.ellipse(-r * 0.05, -r * 0.62, r * 0.85, r * 0.42, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      [[-0.4, -0.78], [0, -0.85], [0.35, -0.72]].forEach(([x, y]) => circle(ctx, x * r, y * r, r * 0.06));
      ctx.fillStyle = '#e63946';
      poly(ctx, [[-0.85, -0.65], [-1.35, -0.85], [-1.25, -0.4]], r);
    } },
    monocle: { phase: 'face', draw(ctx, r) {
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.arc(r * 0.45, -r * 0.32, r * 0.34, 0, TAU);
      ctx.moveTo(r * 0.45, r * 0.02);
      ctx.quadraticCurveTo(r * 0.3, r * 0.5, r * 0.05, r * 0.6);
      ctx.stroke();
    } },
    visor: { phase: 'face', draw(ctx, r, t) {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.roundRect(-r * 0.1, -r * 0.55, r * 1.05, r * 0.35, r * 0.15);
      ctx.fill();
      ctx.fillStyle = `rgba(255,40,60,${0.7 + 0.3 * Math.sin(t * 8)})`;
      ctx.fillRect(r * (0.1 + 0.5 * (Math.sin(t * 3) + 1) / 2), -r * 0.45, r * 0.22, r * 0.14);
    } },
    glowEyes: { phase: 'face', draw(ctx, r, t, sk) {
      ctx.fillStyle = sk.body;
      circle(ctx, r * 0.42, -r * 0.32, r * 0.36);
      const g = ctx.createRadialGradient(r * 0.5, -r * 0.32, 0, r * 0.5, -r * 0.32, r * 0.45);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.3, sk.accColor || '#ff2d55');
      g.addColorStop(1, 'rgba(255,45,85,0)');
      ctx.fillStyle = g;
      circle(ctx, r * 0.5, -r * 0.32, r * 0.45);
    } },
    owl: { phase: 'face', draw(ctx, r) {
      ctx.fillStyle = '#ede0d4';
      circle(ctx, r * 0.42, -r * 0.3, r * 0.44);
      ctx.fillStyle = '#ffb703';
      circle(ctx, r * 0.48, -r * 0.3, r * 0.26);
      ctx.fillStyle = '#111';
      circle(ctx, r * 0.52, -r * 0.3, r * 0.14);
      ctx.fillStyle = '#7f5539';
      poly(ctx, [[-0.1, -0.85], [0.05, -1.3], [0.3, -0.9]], r);
    } },
    darklord: { phase: 'face', draw(ctx, r) {
      ctx.fillStyle = '#0b0b0e';
      ctx.beginPath();
      ctx.ellipse(-r * 0.05, -r * 0.25, r * 1.18, r * 0.95, 0, Math.PI * 0.95, TAU * 1.02);
      ctx.fill();
      ctx.fillRect(-r * 1.2, -r * 0.3, r * 0.45, r * 0.9);
      ctx.fillStyle = '#2a2a33';
      poly(ctx, [[0.05, -0.55], [0.85, -0.5], [0.95, 0.15], [0.5, 0.55], [0.1, 0.2]], r);
      ctx.fillStyle = '#000';
      poly(ctx, [[0.25, -0.45], [0.75, -0.42], [0.65, -0.18], [0.3, -0.2]], r);
      ctx.strokeStyle = '#6c6c78';
      ctx.lineWidth = r * 0.05;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo((0.45 + i * 0.12) * r, 0.05 * r);
        ctx.lineTo((0.45 + i * 0.12) * r, 0.35 * r);
      }
      ctx.stroke();
    } },
    ironhero: { phase: 'face', draw(ctx, r, t) {
      ctx.fillStyle = '#f2c14e';
      poly(ctx, [[0.0, -0.75], [0.85, -0.6], [1.0, 0.0], [0.7, 0.55], [0.15, 0.5], [-0.05, 0.0]], r);
      ctx.fillStyle = `rgba(160,240,255,${0.8 + 0.2 * Math.sin(t * 6)})`;
      poly(ctx, [[0.3, -0.42], [0.82, -0.36], [0.76, -0.22], [0.32, -0.26]], r);
      ctx.fillStyle = '#b5121b';
      ctx.fillRect(r * 0.35, r * 0.15, r * 0.45, r * 0.06);
      ctx.fillStyle = 'rgba(160,240,255,0.95)';
      circle(ctx, -r * 0.3, r * 0.35, r * 0.16);
    } },
    astronaut: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = 'rgba(180,220,255,0.28)';
      circle(ctx, 0, -r * 0.05, r * 1.45);
      ctx.strokeStyle = '#dee2e6';
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.arc(0, -r * 0.05, r * 1.45, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ellipse(ctx, r * 0.55, -r * 0.8, r * 0.3, r * 0.12, -0.6);
    } },
    diver: { phase: 'face', draw(ctx, r) {
      ctx.fillStyle = 'rgba(150,220,255,0.55)';
      ctx.strokeStyle = '#023e8a';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.roundRect(r * 0.05, -r * 0.65, r * 0.85, r * 0.6, r * 0.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-r * 0.9, -r * 0.42, r * 0.95, r * 0.1);
      ctx.strokeStyle = '#fb5607';
      ctx.lineWidth = r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.9);
      ctx.lineTo(-r * 0.2, -r * 1.5);
      ctx.stroke();
    } },
    knight: { phase: 'face', draw(ctx, r) {
      ctx.fillStyle = '#ced4da';
      ctx.beginPath();
      ctx.ellipse(0.05 * r, -0.2 * r, r * 1.12, r * 0.92, 0, Math.PI * 0.9, TAU * 1.05);
      ctx.fill();
      ctx.fillStyle = '#495057';
      for (let i = 0; i < 3; i++) ctx.fillRect(r * 0.2, (-0.5 + i * 0.16) * r, r * 0.75, r * 0.07);
      ctx.fillStyle = '#e63946';
      poly(ctx, [[-0.3, -0.95], [-0.9, -1.45], [-1.1, -0.9]], r);
    } },
    rainbow: { phase: 'body' },
    headband: { phase: 'top', draw(ctx, r, t, sk) {
      ctx.fillStyle = sk.accColor || '#e63946';
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.09, r * 1.01, 0, 0, TAU);
      ctx.clip();
      ctx.fillRect(-r * 1.2, -r * 0.72, r * 2.4, r * 0.24);
      ctx.restore();
      const fl = Math.sin(t * 18) * r * 0.12;
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, -r * 0.62);
      ctx.lineTo(-r * 1.7, -r * 0.9 + fl);
      ctx.lineTo(-r * 1.6, -r * 0.62 + fl);
      ctx.closePath();
      ctx.moveTo(-r * 0.95, -r * 0.55);
      ctx.lineTo(-r * 1.55, -r * 0.35 - fl);
      ctx.lineTo(-r * 1.45, -r * 0.2 - fl);
      ctx.closePath();
      ctx.fill();
    } },
    crown: { phase: 'top', draw(ctx, r, t, sk) {
      ctx.fillStyle = sk.accColor || '#ffd700';
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.2;
      poly(ctx, [[-0.45, -0.82], [-0.5, -1.45], [-0.2, -1.1], [0.05, -1.55], [0.3, -1.1], [0.55, -1.42], [0.5, -0.82]], r);
      ctx.stroke();
      ctx.fillStyle = '#e63946';
      circle(ctx, r * 0.05, -r * 1.02, r * 0.1);
    } },
    antenna: { phase: 'top', draw(ctx, r, t) {
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.lineTo(-r * 0.1, -r * 1.5);
      ctx.stroke();
      ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff4d4d' : '#ff9a9a';
      circle(ctx, -r * 0.1, -r * 1.55, r * 0.15);
    } },
    antenna2: { phase: 'top', draw(ctx, r) {
      ctx.strokeStyle = '#1d1d1d';
      ctx.lineWidth = r * 0.07;
      ctx.beginPath();
      ctx.moveTo(r * 0.3, -r * 0.85);
      ctx.quadraticCurveTo(r * 0.5, -r * 1.4, r * 0.85, -r * 1.35);
      ctx.moveTo(r * 0.1, -r * 0.9);
      ctx.quadraticCurveTo(r * 0.15, -r * 1.5, r * 0.45, -r * 1.6);
      ctx.stroke();
    } },
    bow: { phase: 'top', draw(ctx, r, t, sk) {
      ctx.fillStyle = sk.accColor || '#ff3d8b';
      poly(ctx, [[-0.1, -0.9], [-0.6, -1.25], [-0.55, -0.6]], r);
      poly(ctx, [[-0.1, -0.9], [0.4, -1.25], [0.35, -0.6]], r);
      circle(ctx, -r * 0.1, -r * 0.9, r * 0.14);
    } },
    bowtie: { phase: 'top', draw(ctx, r, t, sk) {
      ctx.fillStyle = sk.accColor || '#e63946';
      poly(ctx, [[0.45, 0.55], [0.1, 0.35], [0.1, 0.8]], r);
      poly(ctx, [[0.45, 0.55], [0.8, 0.35], [0.8, 0.8]], r);
      circle(ctx, r * 0.45, r * 0.56, r * 0.1);
    } },
    cap: { phase: 'top', draw(ctx, r, t, sk) {
      ctx.fillStyle = sk.accColor || '#2b6cb0';
      ctx.beginPath();
      ctx.ellipse(-r * 0.05, -r * 0.62, r * 0.8, r * 0.5, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillRect(-r * 1.25, -r * 0.7, r * 0.6, r * 0.14);
    } },
    chef: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#d8d3b8';
      ctx.lineWidth = 1;
      ctx.fillRect(-r * 0.5, -r * 1.2, r * 0.9, r * 0.45);
      [[-0.4, -1.35], [0.0, -1.5], [0.35, -1.35]].forEach(([x, y]) => circle(ctx, x * r, y * r, r * 0.32));
      ctx.strokeRect(-r * 0.5, -r * 0.95, r * 0.9, r * 0.2);
    } },
    cowboy: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#6f4518';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.82, r * 1.25, r * 0.22, -0.08, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-r * 0.55, -r * 1.45, r * 1.05, r * 0.65, r * 0.25);
      ctx.fill();
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(-r * 0.55, -r * 1.0, r * 1.05, r * 0.12);
    } },
    viking: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#f1faee';
      poly(ctx, [[-0.55, -0.85], [-1.1, -1.5], [-0.85, -0.7]], r);
      poly(ctx, [[0.4, -0.85], [0.7, -1.55], [0.75, -0.65]], r);
      ctx.fillStyle = '#8d99ae';
      ctx.beginPath();
      ctx.ellipse(-r * 0.05, -r * 0.62, r * 0.85, r * 0.5, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillStyle = '#5c677d';
      ctx.fillRect(-r * 0.9, -r * 0.7, r * 1.7, r * 0.14);
    } },
    wizard: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#3a0ca3';
      poly(ctx, [[-0.85, -0.7], [0.65, -0.7], [-0.4, -2.0]], r);
      ctx.fillStyle = '#ffd60a';
      star(ctx, -r * 0.15, -r * 1.1, r * 0.2, 0);
    } },
    witch: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.78, r * 1.2, r * 0.2, -0.1, 0, TAU);
      ctx.fill();
      poly(ctx, [[-0.6, -0.8], [0.5, -0.8], [-0.6, -1.9], [-0.9, -1.75]], r);
      ctx.fillStyle = '#7b2cbf';
      ctx.fillRect(-r * 0.6, -r * 1.0, r * 1.1, r * 0.14);
    } },
    pumpkin: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#386641';
      ctx.fillRect(-r * 0.08, -r * 1.3, r * 0.18, r * 0.4);
      ctx.fillStyle = '#6a994e';
      ellipse(ctx, r * 0.25, -r * 1.2, r * 0.25, r * 0.1, -0.4);
    } },
    horns: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#ffba08';
      poly(ctx, [[-0.55, -0.75], [-0.75, -1.5], [-0.2, -0.9]], r);
      poly(ctx, [[0.15, -0.9], [0.55, -1.55], [0.55, -0.75]], r);
    } },
    batears: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#2b2136';
      poly(ctx, [[-0.6, -0.7], [-0.75, -1.45], [-0.15, -0.9]], r);
      poly(ctx, [[0.0, -0.95], [0.3, -1.55], [0.5, -0.8]], r);
      ctx.fillStyle = '#fff';
      poly(ctx, [[0.62, 0.28], [0.72, 0.28], [0.67, 0.45]], r);
    } },
    mohawk: { phase: 'top', draw(ctx, r, t, sk) {
      ctx.fillStyle = sk.accColor || '#ff006e';
      for (let i = 0; i < 5; i++) poly(ctx, [[-0.75 + i * 0.3, -0.75 + Math.abs(i - 2) * 0.05], [-0.6 + i * 0.3, -1.45 + Math.abs(i - 2) * 0.12], [-0.45 + i * 0.3, -0.8]], r);
    } },
    headphones: { phase: 'top', draw(ctx, r, t, sk) {
      ctx.strokeStyle = sk.accColor || '#003566';
      ctx.lineWidth = r * 0.14;
      ctx.beginPath();
      ctx.arc(-r * 0.1, -r * 0.2, r * 0.95, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = sk.accColor || '#003566';
      ellipse(ctx, -r * 0.1, -r * 0.05, r * 0.25, r * 0.35);
    } },
    lantern: { phase: 'top', draw(ctx, r, t) {
      ctx.strokeStyle = '#1b4332';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.6, -r * 1.8, r * 1.3, -r * 1.3);
      ctx.stroke();
      const g = ctx.createRadialGradient(r * 1.3, -r * 1.15, 0, r * 1.3, -r * 1.15, r * 0.7);
      g.addColorStop(0, `rgba(255,230,120,${0.9 + 0.1 * Math.sin(t * 7)})`);
      g.addColorStop(1, 'rgba(255,230,120,0)');
      ctx.fillStyle = g;
      circle(ctx, r * 1.3, -r * 1.15, r * 0.7);
      ctx.fillStyle = '#ffd166';
      circle(ctx, r * 1.3, -r * 1.15, r * 0.2);
    } },
    miner: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#ffbe0b';
      ctx.beginPath();
      ctx.ellipse(-r * 0.05, -r * 0.6, r * 0.9, r * 0.55, 0, Math.PI, TAU);
      ctx.fill();
      ctx.fillRect(-r * 1.0, -r * 0.66, r * 1.9, r * 0.13);
      ctx.fillStyle = '#fff8c4';
      circle(ctx, r * 0.45, -r * 0.85, r * 0.2);
    } },
    tophat: { phase: 'top', draw(ctx, r) {
      ctx.fillStyle = '#111';
      ctx.fillRect(-r * 0.75, -r * 0.92, r * 1.4, r * 0.14);
      ctx.fillRect(-r * 0.45, -r * 1.6, r * 0.8, r * 0.7);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(-r * 0.45, -r * 1.05, r * 0.8, r * 0.12);
    } },
    lighthouse: { phase: 'top', draw(ctx, r, t) {
      ctx.fillStyle = '#f1faee';
      ctx.fillRect(-r * 0.35, -r * 1.55, r * 0.6, r * 0.7);
      ctx.fillStyle = '#e63946';
      ctx.fillRect(-r * 0.35, -r * 1.3, r * 0.6, r * 0.2);
      ctx.fillStyle = `rgba(255,214,102,${0.6 + 0.4 * Math.sin(t * 4)})`;
      poly(ctx, [[0.25, -1.45], [1.6, -1.8], [1.6, -1.05]], r);
      ctx.fillStyle = '#1d3557';
      poly(ctx, [[-0.45, -1.55], [0.35, -1.55], [-0.05, -1.85]], r);
    } },
  };

  function accs(skin, phase) {
    return (skin.acc || []).map((n) => ACC[n]).filter((a) => a && a.phase === phase && a.draw);
  }

  // ---------- the bird ----------
  R.bird = function (ctx, x, y, r, skin, o = {}) {
    const dir = o.dir || 1, flap = o.flap || 0, t = o.t || 0, sq = o.squash || 0;
    const has = (n) => (skin.acc || []).includes(n);
    ctx.save();
    ctx.translate(x, y);
    if (o.g === -1) ctx.scale(1, -1); // upside-down bird (top player in 1 vs 1)
    ctx.scale(dir, 1);
    ctx.rotate(o.rot || 0);
    ctx.scale(1 - sq * 0.16, 1 + sq * 0.16);
    ctx.globalAlpha = skin.alpha || 1;

    accs(skin, 'back').forEach((a) => a.draw(ctx, r, t, skin));

    // tail
    ctx.fillStyle = skin.wing;
    poly(ctx, [[-0.75, -0.15], [-1.45, -0.55], [-1.25, 0.05], [-1.4, 0.45], [-0.7, 0.3]], r);

    // body
    let bodyFill = skin.body;
    if (has('rainbow')) {
      const g = ctx.createLinearGradient(0, -r, 0, r);
      RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
      bodyFill = g;
    } else if (has('galaxy')) {
      const g = ctx.createRadialGradient(r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
      g.addColorStop(0, '#6a4bd6');
      g.addColorStop(1, skin.body);
      bodyFill = g;
    }
    ctx.fillStyle = bodyFill;
    ellipse(ctx, 0, 0, r * 1.08, r);

    // belly + patterns clipped to the body
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.08, r, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = skin.belly;
    if (has('rainbow')) ctx.globalAlpha *= 0.55;
    ellipse(ctx, r * 0.3, r * 0.45, r * 0.7, r * 0.5);
    ctx.globalAlpha = skin.alpha || 1;
    accs(skin, 'skin').forEach((a) => a.draw(ctx, r, t, skin));
    if (has('pumpkin')) {
      ctx.strokeStyle = 'rgba(120,50,0,0.35)';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(-0.4 * r, -r);
      ctx.quadraticCurveTo(-0.6 * r, 0, -0.4 * r, r);
      ctx.moveTo(0.1 * r, -r);
      ctx.quadraticCurveTo(-0.05 * r, 0, 0.1 * r, r);
      ctx.stroke();
    }
    ctx.restore();

    // eye
    ctx.fillStyle = '#fff';
    circle(ctx, r * 0.42, -r * 0.32, r * 0.34);
    if (o.dead) {
      ctx.strokeStyle = '#1b1b24';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(r * 0.28, -r * 0.46);
      ctx.lineTo(r * 0.58, -r * 0.18);
      ctx.moveTo(r * 0.58, -r * 0.46);
      ctx.lineTo(r * 0.28, -r * 0.18);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1b1b24';
      circle(ctx, r * 0.52, -r * 0.3, r * 0.16);
      ctx.fillStyle = '#fff';
      circle(ctx, r * 0.57, -r * 0.36, r * 0.055);
    }

    // beak
    ctx.fillStyle = skin.beak;
    poly(ctx, [[0.88, -0.1], [1.55, 0.1], [0.86, 0.34]], r);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    poly(ctx, [[0.88, 0.12], [1.55, 0.1], [0.86, 0.34]], r);

    if (!o.dead) accs(skin, 'face').forEach((a) => a.draw(ctx, r, t, skin));

    // wing (flaps up when flapT is high)
    ctx.save();
    ctx.translate(-r * 0.05, r * 0.05);
    ctx.rotate(0.35 - flap * 1.25);
    ctx.fillStyle = skin.wing;
    ellipse(ctx, -r * 0.35, 0, r * 0.62, r * 0.34);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ellipse(ctx, -r * 0.3, -r * 0.1, r * 0.4, r * 0.12);
    ctx.restore();

    accs(skin, 'top').forEach((a) => a.draw(ctx, r, t, skin));
    ctx.restore();
  };

  // Draw a bird centred on a small DOM canvas (shop cards, bot cards).
  R.birdToCanvas = function (canvas, skin, o = {}) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || 64, ch = canvas.clientHeight || 64;
    if (canvas.width !== Math.round(cw * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const r = Math.min(cw, ch) * (o.scale || 0.26);
    const t = o.t || 0;
    const cx = cw / 2 + r * 0.1, cy = ch / 2 + r * 0.25 + (o.bob ? Math.sin(t * 3) * r * 0.25 : 0);
    if (skin.trail && o.trail) {
      const pts = [];
      for (let k = 13; k >= 0; k--) pts.push({ x: cx - k * r * 0.32, y: cy + Math.sin((t - k * 0.05) * 3) * r * 0.25 - Math.sin(t * 3) * r * 0.25 });
      R.trail(ctx, pts, skin, r, t);
    }
    R.bird(ctx, cx, cy, r, skin, { dir: 1, flap: o.flap || 0, t });
  };

  // ---------- flashlight darkness ----------
  // The beam points in a fixed direction (`aim`, radians) and never tilts with the bird.
  let dark = null;
  R.darkness = function (ctx, a, angleDeg, reveal, aim) {
    const cv = ctx.canvas;
    if (!dark) dark = document.createElement('canvas');
    if (dark.width !== cv.width || dark.height !== cv.height) {
      dark.width = cv.width;
      dark.height = cv.height;
    }
    const d = dark.getContext('2d');
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.clearRect(0, 0, dark.width, dark.height);
    d.setTransform(ctx.getTransform());
    d.translate(a.x, 0);
    d.globalCompositeOperation = 'source-over';
    d.fillStyle = `rgba(2,3,9,${0.985 * (1 - reveal)})`;
    d.fillRect(0, 0, a.w, a.h);

    d.globalCompositeOperation = 'destination-out';
    const b = a.bird;
    const half = (angleDeg * Math.PI) / 360;
    const len = a.h;
    const cone = (spread, alpha) => {
      const g = d.createRadialGradient(b.x, b.y, 0, b.x, b.y, len);
      g.addColorStop(0, `rgba(0,0,0,${alpha})`);
      g.addColorStop(0.7, `rgba(0,0,0,${alpha * 0.85})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.beginPath();
      d.moveTo(b.x, b.y);
      d.arc(b.x, b.y, len, aim - half * spread, aim + half * spread);
      d.closePath();
      d.fill();
    };
    cone(1.18, 0.35);
    cone(1, 1);
    const hg = d.createRadialGradient(b.x, b.y, 0, b.x, b.y, 46);
    hg.addColorStop(0, 'rgba(0,0,0,0.95)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = hg;
    d.fillRect(b.x - 50, b.y - 50, 100, 100);
    d.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(dark, 0, 0);
    ctx.restore();
  };

  // Flashlight preview for the shop: a downward beam over a falling bird.
  R.flashPreview = function (canvas, angle, nextAngle, t) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (canvas.width !== Math.round(cw * dpr)) {
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#05060c';
    ctx.fillRect(0, 0, cw, ch);
    const bx = cw / 2 + Math.sin(t * 1.5) * cw * 0.12, by = ch * 0.18;
    const len = ch * 1.1;
    const aim = Math.PI / 2;
    const drawCone = (deg) => {
      const h = (deg * Math.PI) / 360;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.arc(bx, by, len, aim - h, aim + h);
      ctx.closePath();
    };
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, len);
    g.addColorStop(0, 'rgba(255,240,200,0.55)');
    g.addColorStop(1, 'rgba(255,240,200,0.03)');
    ctx.save();
    drawCone(angle);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#c2cadc';
    const scroll = (t * 40) % 70;
    for (let i = 0; i < 4; i++) {
      const y = ch * 0.45 + i * 70 - scroll;
      const fromLeft = i % 2 === 0;
      ctx.fillRect(fromLeft ? 0 : cw * 0.55, y - 4, cw * 0.45, 8);
    }
    ctx.restore();
    if (nextAngle) {
      ctx.save();
      drawCone(nextAngle);
      ctx.setLineDash([5, 6]);
      ctx.lineDashOffset = -t * 20;
      ctx.strokeStyle = 'rgba(255,214,102,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    R.bird(ctx, bx, by, Math.min(16, ch * 0.11), BB.getSkin(BB.Storage.data.equippedSkin), { dir: 1, rot: 0.35, flap: (Math.sin(t * 10) + 1) / 2, t });
  };
})();
