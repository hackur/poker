/**
 * Audio Manager — singleton for poker game sound effects.
 * Uses Web Audio API with procedurally generated sounds.
 */

import { SOUNDS, type SoundName } from './sounds';

const STORAGE_KEY = 'poker-audio-prefs';

interface AudioPrefs {
  muted: boolean;
  volume: number; // 0-1
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private prefs: AudioPrefs = { muted: false, volume: 0.7 };
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadPrefs();
    }
  }

  private loadPrefs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) this.prefs = JSON.parse(stored);
    } catch { /* use defaults */ }
  }

  private savePrefs() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.prefs));
    } catch { /* noop */ }
    this.listeners.forEach((fn) => fn());
  }

  private ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.applyVolume();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return { ctx: this.ctx, gain: this.masterGain! };
  }

  private applyVolume() {
    if (this.masterGain) {
      this.masterGain.gain.value = this.prefs.muted ? 0 : this.prefs.volume;
    }
  }

  play(name: SoundName) {
    if (this.prefs.muted) return;
    const generator = SOUNDS[name];
    if (!generator) return;
    try {
      const { ctx, gain } = this.ensureContext();
      generator(ctx, gain);
    } catch { /* audio not available */ }
  }

  get muted() { return this.prefs.muted; }
  get volume() { return this.prefs.volume; }

  toggleMute() {
    this.prefs.muted = !this.prefs.muted;
    this.applyVolume();
    this.savePrefs();
  }

  setVolume(v: number) {
    this.prefs.volume = Math.max(0, Math.min(1, v));
    this.applyVolume();
    this.savePrefs();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }
}

// Singleton
export const audioManager = typeof window !== 'undefined'
  ? new AudioManager()
  : (null as unknown as AudioManager);

export type { SoundName };
