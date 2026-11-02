/* Bird Bounce — boot, resize/letterboxing, fixed-step game loop and input routing. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const C = BB.CONFIG;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 };
  let session = null;

  function fit() {
    if (!session) return;
    const s = Math.min(view.w / session.worldW, view.h / session.worldH);
    view.scale = s;
    view.ox = (view.w - session.worldW * s) / 2;
    view.oy = (view.h - session.worldH * s) / 2;
  }

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * view.dpr);
    canvas.height = Math.round(view.h * view.dpr);
    fit();
  }

  BB.Main = {
    view,
    get session() {
      return session;
    },
    setSession(s) {
      session = s;
      fit();
    },
  };

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = session ? session.letterbox() : '#1f2337';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!session) return;
    const [sx, sy] = session.shakeOffset();
    const k = view.dpr * view.scale;
    ctx.setTransform(k, 0, 0, k, view.dpr * (view.ox + sx * view.scale), view.dpr * (view.oy + sy * view.scale));
    session.render(ctx);
  }

  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (session) {
      acc += dt;
      while (acc >= C.STEP) {
        session.update(C.STEP);
        acc -= C.STEP;
      }
    }
    render();
    BB.UI.tick(dt);
    requestAnimationFrame(frame);
  }

  // ---- input ----
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    BB.Audio.unlock();
    if (!session || BB.UI.screen !== null) return;
    session.press(e.clientX < view.w / 2 ? 0 : 1);
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const P1_KEYS = ['KeyA', 'KeyS', 'KeyW', 'ShiftLeft'];
  const P2_KEYS = ['KeyL', 'KeyK', 'ArrowUp', 'ShiftRight', 'Enter'];
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const scr = BB.UI.screen;
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (scr === null) BB.UI.pause();
      else if (scr === 'pause') BB.UI.resume();
      return;
    }
    if ((scr === 'gameover' || scr === 'match') && (e.code === 'Space' || e.code === 'Enter')) {
      e.preventDefault();
      BB.UI.retry();
      return;
    }
    if (scr !== null || !session) return;
    if (session instanceof BB.VersusSession && !session.bot) {
      if (P1_KEYS.includes(e.code)) session.press(0);
      else if (P2_KEYS.includes(e.code)) session.press(1);
      else return;
    } else if (['Space', 'ArrowUp', 'KeyW', 'Enter'].concat(P1_KEYS).includes(e.code)) {
      session.press(0);
    } else return;
    e.preventDefault();
    BB.Audio.unlock();
  });

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // ---- boot ----
  BB.Storage.load();
  resize();
  BB.UI.init();
  BB.UI.goMenu();
  BB.Achievements.check();
  requestAnimationFrame(frame);
})();
