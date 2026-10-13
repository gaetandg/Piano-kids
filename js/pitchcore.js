// Écoute du piano par le micro : détection de hauteur (YIN) + détection des notes jouées.

// Renvoie {freq, clarity} ou null. `buf` = échantillons (Float32Array).
export function detectPitch(buf, sr, minF = 70, maxF = 2100, threshold = 0.15) {
  const n = buf.length;
  const maxTau = Math.min(Math.floor(sr / minF), n >> 1);
  const minTau = Math.max(2, Math.floor(sr / maxF));
  const W = n - maxTau;
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) {
      const x = buf[i] - buf[i + tau];
      s += x * x;
    }
    d[tau] = s;
  }
  // Différence moyenne cumulée normalisée
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    d[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  let tauEst = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (d[tau] < threshold) {
      while (tau + 1 <= maxTau && d[tau + 1] < d[tau]) tau++;
      tauEst = tau;
      break;
    }
  }
  if (tauEst < 0) {
    // pas de creux sous le seuil : on prend le minimum global s'il est assez net
    let best = minTau;
    for (let tau = minTau; tau <= maxTau; tau++) if (d[tau] < d[best]) best = tau;
    if (d[best] > 0.3) return null;
    tauEst = best;
  }
  let better = tauEst;
  if (tauEst > 1 && tauEst < maxTau) {
    const a = d[tauEst - 1];
    const b = d[tauEst];
    const c = d[tauEst + 1];
    const den = a + c - 2 * b;
    if (den !== 0) better = tauEst + (a - c) / (2 * den);
  }
  return { freq: sr / better, clarity: 1 - d[tauEst] };
}

export function rmsOf(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

// Transforme une suite de trames audio en événements "note jouée".
// Indépendant du navigateur pour pouvoir être testé.
export class NoteTracker {
  constructor({ gate = 0.01 } = {}) {
    this.gate = gate;
    this.noiseFloor = 0.002;
    this.reset();
  }

  reset() {
    this.hist = [];
    this.candidate = null;
    this.stable = 0;
    this.lastEmitted = null;
    this.lastEmitTime = -1e9;
    this.onsetAt = -1e9;
    this.silent = 0;
    this.peak = 0;
  }

  // Renvoie un numéro MIDI quand une nouvelle note est détectée, sinon null.
  process(buf, sr, now) {
    const rms = rmsOf(buf);
    this.level = rms;
    const h = this.hist;
    h.push(rms);
    if (h.length > 6) h.shift();

    // Bruit de fond : suit lentement le minimum quand c'est calme
    if (rms < this.noiseFloor) this.noiseFloor = rms;
    else this.noiseFloor += (rms - this.noiseFloor) * 0.002;
    const gate = Math.max(this.gate, this.noiseFloor * 3);

    // Attaque : forte hausse d'énergie par rapport à il y a 2 trames
    const ref = h.length >= 3 ? h[h.length - 3] : 0;
    if (rms > gate && rms > ref * 1.6 + gate * 0.3 && now - this.onsetAt > 90) {
      this.onsetAt = now;
    }

    if (rms < gate) {
      this.silent++;
      if (this.silent >= 3) this.lastEmitted = null;
      this.candidate = null;
      this.stable = 0;
      return null;
    }
    this.silent = 0;

    const res = detectPitch(buf, sr);
    if (!res || res.clarity < 0.8) {
      this.stable = 0;
      return null;
    }
    const m = 69 + 12 * Math.log2(res.freq / 440);
    const midi = Math.round(m);
    if (Math.abs(m - midi) > 0.4) return null;

    if (midi === this.candidate) this.stable++;
    else {
      this.candidate = midi;
      this.stable = 1;
    }

    const reattack = this.onsetAt > this.lastEmitTime;
    const newPitch = midi !== this.lastEmitted;
    if (reattack && this.stable >= 2) return this._emit(midi, now);
    if (newPitch && this.stable >= 3) {
      // Sans nouvelle attaque, on se méfie des sauts d'octave (harmoniques)
      const iv = this.lastEmitted == null ? 0 : Math.abs(midi - this.lastEmitted);
      if (this.lastEmitted == null || ![12, 19, 24].includes(iv)) return this._emit(midi, now);
    }
    return null;
  }

  _emit(midi, now) {
    this.lastEmitted = midi;
    this.lastEmitTime = now;
    return midi;
  }
}
