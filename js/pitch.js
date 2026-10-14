// Micro : écoute du piano dans le navigateur.

import { getCtx, unlockAudio, isBusy } from './audio.js';
import { isSpeaking } from './speech.js';
import { NoteTracker } from './pitchcore.js';

class Mic {
  constructor() {
    this.listeners = new Set();
    this.levelListeners = new Set();
    this.tracker = new NoteTracker();
    this.running = false;
    this.stopTimer = null;
    this.sensitivity = 0.5;
    this.octaveShift = 0; // certains claviers sonnent une octave plus haut ou plus bas
  }

  // Décalage (en demi-tons, multiple de 12) entre ce que le piano fait entendre et ses touches.
  setOctaveShift(semitones) {
    this.octaveShift = semitones || 0;
  }

  setSensitivity(s) {
    this.sensitivity = s;
    // 0 -> peu sensible (0.03), 1 -> très sensible (0.002)
    this.tracker.gate = 0.03 * Math.pow(0.067, s);
  }

  static supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async start() {
    clearTimeout(this.stopTimer);
    if (this.running) return;
    if (this.starting) return this.starting;
    this.starting = (async () => {
      const ctx = await unlockAudio();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      this.src = ctx.createMediaStreamSource(this.stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 4096;
      this.buf = new Float32Array(this.analyser.fftSize);
      this.src.connect(this.analyser);
      this.tracker.reset();
      this.running = true;
      this.timer = setInterval(() => this.tick(), 25);
    })();
    try {
      await this.starting;
    } finally {
      this.starting = null;
    }
  }

  stop() {
    clearInterval(this.timer);
    this.running = false;
    if (this.src) this.src.disconnect();
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.src = null;
  }

  tick() {
    if (!this.analyser) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    const now = performance.now();
    if (isBusy() || isSpeaking()) {
      // L'app parle ou joue : on n'écoute pas pour ne pas se tromper
      this.tracker.reset();
      this.mutedUntil = now + 120;
      this.levelListeners.forEach((fn) => fn(0, true));
      return;
    }
    if (now < (this.mutedUntil || 0)) return;
    const found = this.tracker.process(this.buf, getCtx().sampleRate, now);
    this.levelListeners.forEach((fn) => fn(this.tracker.level, false));
    if (found) {
      // plusieurs notes si on joue un accord (la principale d'abord)
      const notes = found.map((m) => m - this.octaveShift);
      this.listeners.forEach((fn) => fn(notes));
    }
  }

  // S'abonne aux notes détectées : fn(notes) avec un tableau de numéros MIDI.
  // Renvoie une fonction de désabonnement.
  async subscribe(fn) {
    this.listeners.add(fn);
    await this.start();
    return () => this.unsubscribe(fn);
  }

  unsubscribe(fn) {
    this.listeners.delete(fn);
    this.scheduleStop();
  }

  onLevel(fn) {
    this.levelListeners.add(fn);
    return () => this.levelListeners.delete(fn);
  }

  scheduleStop() {
    clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => {
      if (this.listeners.size === 0) this.stop();
    }, 4000);
  }
}

export const mic = typeof window !== 'undefined' ? new Mic() : null;
export const micSupported = () => typeof window !== 'undefined' && Mic.supported();
