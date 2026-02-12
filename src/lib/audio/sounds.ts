/**
 * Procedurally generated sounds using Web Audio API.
 * No external audio files needed — all sounds are synthesized.
 */

type SoundGenerator = (ctx: AudioContext, gain: GainNode) => void;

export const SOUNDS: Record<string, SoundGenerator> = {
  // Card dealing — short swoosh (filtered noise burst)
  deal: (ctx, gain) => {
    const t = ctx.currentTime;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.12);
    filter.Q.value = 1.5;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.4, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    src.connect(filter).connect(env).connect(gain);
    src.start(t);
    src.stop(t + 0.12);
  },

  // Chip clink
  chip: (ctx, gain) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200, t);
    osc.frequency.exponentialRampToValueAtTime(2800, t + 0.06);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.3, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc.connect(env).connect(gain);
    osc.start(t);
    osc.stop(t + 0.08);
    // Second click
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3800, t + 0.04);
    osc2.frequency.exponentialRampToValueAtTime(2500, t + 0.1);
    const env2 = ctx.createGain();
    env2.gain.setValueAtTime(0.2, t + 0.04);
    env2.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc2.connect(env2).connect(gain);
    osc2.start(t + 0.04);
    osc2.stop(t + 0.12);
  },

  // Check action — soft tap
  check: (ctx, gain) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.2, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.06);
    osc.connect(env).connect(gain);
    osc.start(t);
    osc.stop(t + 0.06);
  },

  // Call — slightly richer tap
  call: (ctx, gain) => {
    const t = ctx.currentTime;
    [600, 900].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.15, t + i * 0.03);
      env.gain.exponentialRampToValueAtTime(0.01, t + 0.08 + i * 0.03);
      osc.connect(env).connect(gain);
      osc.start(t + i * 0.03);
      osc.stop(t + 0.1 + i * 0.03);
    });
  },

  // Raise — ascending tone
  raise: (ctx, gain) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.25, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
    osc.connect(env).connect(gain);
    osc.start(t);
    osc.stop(t + 0.18);
  },

  // Fold — descending tone
  fold: (ctx, gain) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.15, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    osc.connect(env).connect(gain);
    osc.start(t);
    osc.stop(t + 0.2);
  },

  // Timer warning tick
  tick: (ctx, gain) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.15, t);
    env.gain.setValueAtTime(0, t + 0.03);
    osc.connect(env).connect(gain);
    osc.start(t);
    osc.stop(t + 0.04);
  },

  // Win celebration — happy ascending arpeggio
  win: (ctx, gain) => {
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const env = ctx.createGain();
      const start = t + i * 0.1;
      env.gain.setValueAtTime(0.25, start);
      env.gain.exponentialRampToValueAtTime(0.01, start + 0.3);
      osc.connect(env).connect(gain);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  },

  // Your turn notification — two-tone chime
  yourTurn: (ctx, gain) => {
    const t = ctx.currentTime;
    [880, 1100].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const env = ctx.createGain();
      const start = t + i * 0.12;
      env.gain.setValueAtTime(0.2, start);
      env.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
      osc.connect(env).connect(gain);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  },

  // All-in — dramatic rising tone
  allIn: (ctx, gain) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.2, t);
    env.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    osc.connect(filter).connect(env).connect(gain);
    osc.start(t);
    osc.stop(t + 0.35);
  },
};

export type SoundName = keyof typeof SOUNDS;
