/* Bird Bounce — all canvas drawing: arenas, spikes, birds, items, particles, cave darkness. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG, U = BB.Util;
  const TAU = Math.PI * 2;
  const FONT = 'Fredoka, ui-rounded, "Segoe UI", system-ui, sans-serif';

  const THEMES = {
    normal: { bgs: ['#e9eef5', '#e2f2e6', '#f6eedd', '#f4e2ea', '#e6e2f6', '#ddf0f2', '#f3f0da', '#ece2f6'], spike: '#454b5e', band: '#3a3f50' },
    hard: { bgs: ['#f4dada', '#f1d0d7', '#ebd6e8', '#f4dccc', '#ead0d0'], spike: '#5b2533', band: '#4a1c28' },
    cave: { bgs: ['#3a4258', '#34405a', '#3e3a58', '#3a4a52'], spike: '#c2cadc', band: '#8e97ab' },
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

  // ---------- arena ----------
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

    // soft centre glow
    const cg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h * 0.6);
    cg.addColorStop(0, 'rgba(255,255,255,0.35)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, w, h);

    const cr = Math.min(w * 0.3, 88);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    circle(ctx, w / 2, h / 2, cr);
    if (a.showScore) {
      R.text(ctx, String(a.score), w / 2, h / 2 + cr * 0.05, Math.round(cr * 1.05), U.css(U.mixRgb(bg, [30, 32, 50], 0.28)));
    }

    for (const it of a.items) {
      const y = it.y + Math.sin(it.t * 3) * 5;
      if (it.type === 'diamond') R.diamond(ctx, it.x, y, it.r, it.t);
      else R.crystal(ctx, it.x, y, it.r, it.t);
    }

    R.bands(ctx, w, h, th);
    R.wallSpikes(ctx, a.walls.left, w, th);
    R.wallSpikes(ctx, a.walls.right, w, th);

    const b = a.bird;
    R.trail(ctx, b.trail, b.skin, b.r, a.time);
    R.particles(ctx, a.particles);
    R.bird(ctx, b.x, b.y, b.r, b.skin, { dir: b.dir, rot: b.alive ? b.rot : b.rot, flap: b.flapT, t: b.t, squash: b.squash, dead: !b.alive });

    if (a.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${a.flash * 0.45})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  };

  R.bands = function (ctx, w, h, th) {
    ctx.fillStyle = th.band;
    ctx.fillRect(0, 0, w, C.CEIL_BAND);
    ctx.fillRect(0, h - C.CEIL_BAND, w, C.CEIL_BAND);
    ctx.fillRect(0, 0, 5, h);
    ctx.fillRect(w - 5, 0, 5, h);
    ctx.fillStyle = th.spike;
    const sw = 26;
    const n = Math.ceil(w / sw) + 1;
    const x0 = (w - (n - 1) * sw) / 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = x0 + i * sw;
      ctx.moveTo(x - sw / 2, C.CEIL_BAND - 1);
      ctx.lineTo(x, C.CEIL_TIP);
      ctx.lineTo(x + sw / 2, C.CEIL_BAND - 1);
      ctx.moveTo(x - sw / 2, h - C.CEIL_BAND + 1);
      ctx.lineTo(x, h - C.CEIL_TIP);
      ctx.lineTo(x + sw / 2, h - C.CEIL_BAND + 1);
    }
    ctx.fill();
  };

  R.wallSpikes = function (ctx, wall, w, th) {
    const tris = wall.triangles(w);
    if (!tris.length) return;
    ctx.fillStyle = th.spike;
    ctx.beginPath();
    for (const t of tris) {
      ctx.moveTo(t[0], t[1]);
      ctx.lineTo(t[2], t[3]);
      ctx.lineTo(t[4], t[5]);
      ctx.closePath();
    }
    ctx.fill();
    // highlight edge
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const t of tris) {
      ctx.moveTo(t[0], t[1]);
      ctx.lineTo(t[2], t[3]);
    }
    ctx.stroke();
  };

  // ---------- items ----------
  R.crystal = function (ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.3);
    g.addColorStop(0, 'rgba(90,220,255,0.5)');
    g.addColorStop(1, 'rgba(90,220,255,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, r * 2.3);
    ctx.rotate(Math.sin(t * 2) * 0.15);
    const pts = [[0, -1.25], [0.72, -0.38], [0.72, 0.42], [0, 1.25], [-0.72, 0.42], [-0.72, -0.38]];
    ctx.beginPath();
    pts.forEach(([px, py]) => ctx.lineTo(px * r, py * r));
    ctx.closePath();
    ctx.fillStyle = '#35c4f2';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#1885b5';
    ctx.stroke();
    ctx.fillStyle = '#93e9ff';
    ctx.beginPath();
    ctx.moveTo(0, -1.25 * r);
    ctx.lineTo(-0.72 * r, -0.38 * r);
    ctx.lineTo(-0.72 * r, 0.42 * r);
    ctx.lineTo(0, 1.25 * r);
    ctx.lineTo(-0.18 * r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    star(ctx, 0.3 * r, -0.55 * r, r * (0.3 + 0.2 * Math.sin(t * 6)), t);
    ctx.restore();
  };

  R.diamond = function (ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
    g.addColorStop(0, 'rgba(190,140,255,0.55)');
    g.addColorStop(1, 'rgba(190,140,255,0)');
    ctx.fillStyle = g;
    circle(ctx, 0, 0, r * 2.5);
    ctx.rotate(Math.sin(t * 2) * 0.1);
    ctx.beginPath();
    ctx.moveTo(-r, -0.35 * r);
    ctx.lineTo(-0.55 * r, -0.85 * r);
    ctx.lineTo(0.55 * r, -0.85 * r);
    ctx.lineTo(r, -0.35 * r);
    ctx.lineTo(0, r * 1.05);
    ctx.closePath();
    ctx.fillStyle = '#a974ff';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#6b3fd1';
    ctx.stroke();
    ctx.fillStyle = '#e2ceff';
    ctx.beginPath();
    ctx.moveTo(-r, -0.35 * r);
    ctx.lineTo(-0.55 * r, -0.85 * r);
    ctx.lineTo(0, -0.85 * r);
    ctx.lineTo(-0.3 * r, -0.35 * r);
    ctx.lineTo(0, r * 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    star(ctx, 0.35 * r, -0.5 * r, r * (0.3 + 0.2 * Math.sin(t * 7)), t);
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

  R.trail = function (ctx, trail, skin, r, t) {
    if (!skin.trail || trail.length < 2) return;
    const n = trail.length;
    if (skin.trail === 'fire') {
      for (let i = 0; i < n; i++) {
        const p = trail[i], k = (i + 1) / n;
        ctx.fillStyle = `hsla(${15 + 35 * k},100%,${50 + 10 * k}%,${0.55 * k})`;
        circle(ctx, p.x + Math.sin(t * 20 + i) * 1.5, p.y + Math.cos(t * 17 + i) * 1.5, r * 0.85 * k);
      }
    } else if (skin.trail === 'rainbow') {
      ctx.lineWidth = r * 0.28;
      ctx.lineCap = 'round';
      RAINBOW.forEach((col, j) => {
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        const off = (j - 2.5) * r * 0.28;
        trail.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y + off) : ctx.moveTo(p.x, p.y + off)));
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    } else if (skin.trail === 'stars') {
      for (let i = 0; i < n; i += 2) {
        const p = trail[i], k = (i + 1) / n;
        ctx.fillStyle = i % 4 ? `rgba(255,214,255,${k})` : `rgba(255,255,255,${k})`;
        star(ctx, p.x, p.y + Math.sin(i * 1.7) * r * 0.5, r * 0.45 * k + 1, t * 3 + i);
      }
    }
  };

  // ---------- the bird ----------
  R.bird = function (ctx, x, y, r, skin, o = {}) {
    const dir = o.dir || 1, flap = o.flap || 0, t = o.t || 0, sq = o.squash || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.rotate(o.rot || 0);
    ctx.scale(1 - sq * 0.16, 1 + sq * 0.16);
    ctx.globalAlpha = skin.alpha || 1;

    // tail
    ctx.fillStyle = skin.wing;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.15);
    ctx.lineTo(-r * 1.45, -r * 0.55);
    ctx.lineTo(-r * 1.25, r * 0.05);
    ctx.lineTo(-r * 1.4, r * 0.45);
    ctx.lineTo(-r * 0.7, r * 0.3);
    ctx.closePath();
    ctx.fill();

    // body
    let bodyFill = skin.body;
    if (skin.acc === 'rainbow') {
      const g = ctx.createLinearGradient(0, -r, 0, r);
      RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
      bodyFill = g;
    } else if (skin.acc === 'galaxy') {
      const g = ctx.createRadialGradient(r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.2);
      g.addColorStop(0, '#6a4bd6');
      g.addColorStop(1, skin.body);
      bodyFill = g;
    }
    ctx.fillStyle = bodyFill;
    ellipse(ctx, 0, 0, r * 1.08, r);

    // belly
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.08, r, 0, 0, TAU);
    ctx.clip();
    ctx.fillStyle = skin.belly;
    ctx.globalAlpha *= skin.acc === 'rainbow' ? 0.55 : 1;
    ellipse(ctx, r * 0.3, r * 0.45, r * 0.7, r * 0.5);
    if (skin.acc === 'galaxy') {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      [[-0.5, -0.4, 1.4], [0.1, -0.7, 1], [-0.2, 0.2, 1.2], [0.6, 0.1, 0.9], [-0.7, 0.3, 0.8]].forEach(([sx, sy, sr], i) => {
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i * 2);
        circle(ctx, sx * r, sy * r, sr);
      });
      ctx.globalAlpha = 1;
    }
    if (skin.acc === 'antenna') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      circle(ctx, -r * 0.55, -r * 0.2, r * 0.08);
      circle(ctx, -r * 0.55, r * 0.25, r * 0.08);
    }
    ctx.restore();

    // eye
    const dead = o.dead;
    ctx.fillStyle = '#fff';
    circle(ctx, r * 0.42, -r * 0.32, r * 0.34);
    if (dead) {
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

    if (skin.acc === 'shades') {
      ctx.fillStyle = '#16161e';
      ctx.beginPath();
      ctx.roundRect(r * 0.12, -r * 0.5, r * 0.72, r * 0.34, r * 0.1);
      ctx.fill();
      ctx.fillRect(-r * 0.3, -r * 0.42, r * 0.5, r * 0.08);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(r * 0.22, -r * 0.44, r * 0.18, r * 0.06);
    }

    // beak
    ctx.fillStyle = skin.beak;
    ctx.beginPath();
    ctx.moveTo(r * 0.88, -r * 0.1);
    ctx.lineTo(r * 1.55, r * 0.1);
    ctx.lineTo(r * 0.86, r * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.moveTo(r * 0.88, r * 0.12);
    ctx.lineTo(r * 1.55, r * 0.1);
    ctx.lineTo(r * 0.86, r * 0.34);
    ctx.closePath();
    ctx.fill();

    // wing (flaps up when flapT is high)
    const wa = 0.35 - flap * 1.25;
    ctx.save();
    ctx.translate(-r * 0.05, r * 0.05);
    ctx.rotate(wa);
    ctx.fillStyle = skin.wing;
    ellipse(ctx, -r * 0.35, 0, r * 0.62, r * 0.34);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ellipse(ctx, -r * 0.3, -r * 0.1, r * 0.4, r * 0.12);
    ctx.restore();

    // accessories on top
    if (skin.acc === 'headband') {
      ctx.fillStyle = '#e63946';
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
    } else if (skin.acc === 'crown') {
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, -r * 0.82);
      ctx.lineTo(-r * 0.5, -r * 1.45);
      ctx.lineTo(-r * 0.2, -r * 1.1);
      ctx.lineTo(r * 0.05, -r * 1.55);
      ctx.lineTo(r * 0.3, -r * 1.1);
      ctx.lineTo(r * 0.55, -r * 1.42);
      ctx.lineTo(r * 0.5, -r * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e63946';
      circle(ctx, r * 0.05, -r * 1.02, r * 0.1);
    } else if (skin.acc === 'antenna') {
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.95);
      ctx.lineTo(-r * 0.1, -r * 1.5);
      ctx.stroke();
      ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff4d4d' : '#ff9a9a';
      circle(ctx, -r * 0.1, -r * 1.55, r * 0.15);
    }
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
    const cx = cw / 2 + r * 0.1, cy = ch / 2 + (o.bob ? Math.sin(t * 3) * r * 0.25 : r * 0.1);
    if (skin.trail && o.trail) {
      const pts = [];
      for (let k = 13; k >= 0; k--) pts.push({ x: cx - k * r * 0.32, y: cy + Math.sin((t - k * 0.05) * 3) * r * 0.25 - Math.sin(t * 3) * r * 0.25 });
      R.trail(ctx, pts, skin, r, t);
    }
    R.bird(ctx, cx, cy, r, skin, { dir: 1, flap: o.flap || 0, t, rot: o.rot || 0 });
  };

  // ---------- cave darkness ----------
  let dark = null;
  R.darkness = function (ctx, a, angleDeg, reveal) {
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
    const tilt = U.clamp(b.alive ? b.vy * 0.0006 : 0, -0.4, 0.4);
    const ang = b.vx >= 0 ? tilt : Math.PI - tilt;
    const half = (angleDeg * Math.PI) / 360;
    const len = a.w * 1.2;
    const cone = (spread, alpha) => {
      const g = d.createRadialGradient(b.x, b.y, 0, b.x, b.y, len);
      g.addColorStop(0, `rgba(0,0,0,${alpha})`);
      g.addColorStop(0.7, `rgba(0,0,0,${alpha * 0.85})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.beginPath();
      d.moveTo(b.x, b.y);
      d.arc(b.x, b.y, len, ang - half * spread, ang + half * spread);
      d.closePath();
      d.fill();
    };
    cone(1.18, 0.35);
    cone(1, 1);
    const hg = d.createRadialGradient(b.x, b.y, 0, b.x, b.y, 48);
    hg.addColorStop(0, 'rgba(0,0,0,0.95)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = hg;
    d.fillRect(b.x - 50, b.y - 50, 100, 100);
    d.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(dark, 0, 0);
    ctx.restore();

    // crystals glow faintly through the dark, and a warm tint inside the beam
    ctx.save();
    ctx.translate(a.x, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const it of a.items) {
      const y = it.y + Math.sin(it.t * 3) * 5;
      const g = ctx.createRadialGradient(it.x, y, 0, it.x, y, 26);
      g.addColorStop(0, `rgba(80,200,255,${0.35 + 0.15 * Math.sin(it.t * 4)})`);
      g.addColorStop(1, 'rgba(80,200,255,0)');
      ctx.fillStyle = g;
      circle(ctx, it.x, y, 26);
    }
    ctx.restore();
    if (a.showScore) R.text(ctx, String(a.score), a.x + a.w / 2, a.h / 2, 92, 'rgba(255,255,255,0.12)');
  };

  // Flashlight preview for the shop.
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
    const bx = cw * 0.18, by = ch / 2 + Math.sin(t * 2.5) * 6;
    const len = cw * 0.95;
    const drawCone = (deg) => {
      const h = (deg * Math.PI) / 360;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.arc(bx, by, len, -h, h);
      ctx.closePath();
    };
    const g = ctx.createRadialGradient(bx, by, 0, bx, by, len);
    g.addColorStop(0, 'rgba(255,240,200,0.55)');
    g.addColorStop(1, 'rgba(255,240,200,0.02)');
    ctx.save();
    drawCone(angle);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = '#c2cadc';
    for (let i = 0; i < 7; i++) {
      const y = ch * 0.08 + i * ch * 0.14;
      ctx.beginPath();
      ctx.moveTo(cw, y - 9);
      ctx.lineTo(cw - 20, y);
      ctx.lineTo(cw, y + 9);
      ctx.fill();
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
    R.bird(ctx, bx, by, Math.min(18, ch * 0.12), BB.getSkin(BB.Storage.data.equippedSkin), { dir: 1, flap: (Math.sin(t * 10) + 1) / 2, t });
    R.text(ctx, `${angle}°`, cw - 14, ch - 18, 18, '#ffd166', { align: 'right' });
  };
})();
