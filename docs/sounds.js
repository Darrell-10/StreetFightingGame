// ═══════════════════════════════════════════════════════
//  BATTLE ARENA — Web Audio procedural sound engine
// ═══════════════════════════════════════════════════════
const SFX = (function () {
  let ctx = null;

  function ac() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function osc(freq1, freq2, vol, dur, type = 'square', delay = 0) {
    try {
      const a = ac();
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type;
      o.connect(g); g.connect(a.destination);
      const t = a.currentTime + delay;
      o.frequency.setValueAtTime(freq1, t);
      if (freq2 !== freq1) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t + dur * 0.9);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur + 0.01);
    } catch (_) {}
  }

  function noise(vol, dur, delay = 0) {
    try {
      const a = ac();
      const len = Math.ceil(a.sampleRate * dur);
      const buf = a.createBuffer(1, len, a.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource();
      const g = a.createGain();
      src.buffer = buf;
      src.connect(g); g.connect(a.destination);
      const t = a.currentTime + delay;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85);
      src.start(t);
    } catch (_) {}
  }

  return {
    punch()  { osc(220, 70, 0.35, 0.09, 'square');   noise(0.22, 0.07); },
    kick()   { osc(160, 55, 0.40, 0.12, 'sawtooth');  noise(0.18, 0.10); },
    hurt()   { osc(280, 40, 0.50, 0.18, 'square');    noise(0.35, 0.14); },
    block()  { osc(600, 350, 0.25, 0.09, 'square');   osc(400, 250, 0.15, 0.07, 'sine', 0.04); },
    jump()   { osc(180, 360, 0.18, 0.22, 'sine'); },
    land()   { osc(90,  30,  0.30, 0.10, 'square');   noise(0.15, 0.08); },
    duck()   { osc(140, 100, 0.12, 0.08, 'sine'); },

    super_() {
      noise(0.15, 0.08);
      osc(100, 900, 0.30, 0.35, 'sawtooth');
      osc(150, 600, 0.25, 0.30, 'square',   0.05);
      osc(500, 200, 0.45, 0.25, 'square',   0.35);
      noise(0.40, 0.20, 0.35);
    },

    ko() {
      osc(300, 40,  0.55, 0.55, 'square');
      osc(200, 25,  0.40, 0.80, 'sawtooth', 0.40);
      noise(0.30, 0.40, 0.10);
    },

    win() {
      const melody = [523, 659, 784, 1047, 784, 1047];
      melody.forEach((f, i) => osc(f, f, 0.22, 0.18, 'square', i * 0.14));
    },

    lose() {
      const melody = [400, 350, 300, 220];
      melody.forEach((f, i) => osc(f, f, 0.22, 0.22, 'square', i * 0.20));
    },

    fight() {
      osc(300, 300, 0.30, 0.14, 'square', 0.00);
      osc(400, 400, 0.30, 0.14, 'square', 0.18);
      osc(600, 600, 0.40, 0.20, 'square', 0.36);
    },

    tick() { osc(880, 880, 0.08, 0.05, 'square'); },
  };
})();
