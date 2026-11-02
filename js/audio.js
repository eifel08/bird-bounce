/* Bird Bounce — tiny WebAudio synth for sound effects (no audio files needed). */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});

  let ctx = null, master = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone({ freq = 440, to = null, dur = 0.12, type = 'sine', vol = 0.5, delay = 0 }) {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, delay = 0) {
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(master);
    src.start(t0);
  }

  const SFX = {
    flap: () => tone({ freq: 480, to: 760, dur: 0.07, type: 'triangle', vol: 0.3 }),
    bounce: () => tone({ freq: 260, to: 520, dur: 0.09, type: 'square', vol: 0.12 }),
    collect: () => {
      tone({ freq: 880, dur: 0.07, vol: 0.35 });
      tone({ freq: 1320, dur: 0.14, vol: 0.3, delay: 0.06 });
    },
    diamond: () => [988, 1319, 1568, 1976].forEach((f, i) => tone({ freq: f, dur: 0.14, vol: 0.28, type: 'triangle', delay: i * 0.06 })),
    die: () => {
      tone({ freq: 420, to: 70, dur: 0.42, type: 'sawtooth', vol: 0.22 });
      noise(0.25, 0.35);
    },
    tick: () => tone({ freq: 660, dur: 0.09, type: 'square', vol: 0.12 }),
    go: () => tone({ freq: 990, dur: 0.2, type: 'square', vol: 0.14 }),
    point: () => [660, 880].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'triangle', vol: 0.3, delay: 0.15 + i * 0.09 })),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.3, delay: i * 0.11 })),
    lose: () => [392, 330, 262].forEach((f, i) => tone({ freq: f, dur: 0.25, type: 'triangle', vol: 0.26, delay: i * 0.14 })),
    click: () => tone({ freq: 700, dur: 0.05, type: 'triangle', vol: 0.18 }),
    buy: () => [784, 988, 1175].forEach((f, i) => tone({ freq: f, dur: 0.12, type: 'sine', vol: 0.3, delay: i * 0.07 })),
    error: () => tone({ freq: 180, dur: 0.18, type: 'square', vol: 0.12 }),
    achieve: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'sine', vol: 0.25, delay: i * 0.08 })),
  };

  BB.Audio = {
    unlock: ensure,
    play(name) {
      if (!BB.Storage.data.settings.sound) return;
      if (!ensure()) return;
      try {
        SFX[name] && SFX[name]();
      } catch (e) {
        /* ignore audio failures */
      }
    },
  };
})();
