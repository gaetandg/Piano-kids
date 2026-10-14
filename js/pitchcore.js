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

// ---------- Spectre (FFT) ----------

// FFT radix 2 qui réutilise ses tableaux (une analyse toutes les 25 ms).
class FFT {
  constructor(n) {
    this.n = n;
    this.re = new Float32Array(n);
    this.im = new Float32Array(n);
    this.rev = new Uint32Array(n);
    const bits = Math.round(Math.log2(n));
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
    this.cos = new Float32Array(n / 2);
    this.sin = new Float32Array(n / 2);
    for (let i = 0; i < n / 2; i++) {
      this.cos[i] = Math.cos((2 * Math.PI * i) / n);
      this.sin[i] = -Math.sin((2 * Math.PI * i) / n);
    }
    this.win = new Float32Array(n);
    for (let i = 0; i < n; i++) this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  }

  // Amplitudes des n/2 premières fréquences de `input` (fenêtre de Hann).
  magnitudes(input, out) {
    const { n, re, im, rev, cos, sin, win } = this;
    const off = input.length - n;
    for (let i = 0; i < n; i++) {
      const j = rev[i];
      re[j] = input[off + i] * win[i];
      im[j] = 0;
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j++, k += step) {
          const a = i + j;
          const b = a + half;
          const tr = re[b] * cos[k] - im[b] * sin[k];
          const ti = re[b] * sin[k] + im[b] * cos[k];
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
    for (let i = 0; i < n / 2; i++) out[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
  }
}

// Poids des harmoniques (décroissants : la note la plus grave qui explique
// toutes les harmoniques gagne, sans tomber une octave trop bas).
const HARM_W = [0, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.35];
const MAX_HZ = 6000;

// Trouve la note dont les harmoniques expliquent le mieux le spectre `D`.
// Renvoie {midi, harmonicity} ou null.
export function noteFromSpectrum(D, binHz, minMidi = 36, maxMidi = 100) {
  const nb = D.length;
  const peak = (fHz) => {
    const bin = fHz / binHz;
    const tol = Math.max(0.5, bin * 0.012);
    let lo = Math.max(1, Math.round(bin - tol));
    const hi = Math.min(nb - 1, Math.round(bin + tol));
    let m = 0;
    for (; lo <= hi; lo++) if (D[lo] > m) m = D[lo];
    return m;
  };
  let best = -1;
  let bestS = 0;
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const f = 440 * Math.pow(2, (midi - 69) / 12);
    let s = 0;
    for (let k = 1; k < HARM_W.length; k++) {
      const fk = f * k * Math.sqrt(1 + 0.0004 * k * k);
      if (fk > MAX_HZ) break;
      s += HARM_W[k] * peak(fk);
    }
    if (s > bestS) {
      bestS = s;
      best = midi;
    }
  }
  if (best < 0) return null;
  // Harmonicité : les harmoniques doivent ressortir par rapport à ce qu'il y a entre elles
  const f = 440 * Math.pow(2, (best - 69) / 12);
  let on = 0;
  let off = 0;
  for (let k = 1; k <= 6; k++) {
    const fk = f * k * Math.sqrt(1 + 0.0004 * k * k);
    if (fk * 1.0 > MAX_HZ) break;
    on += peak(fk);
    off += (peak(fk * (1 + 0.5 / k)) + peak(fk * (1 - 0.5 / k))) / 2;
  }
  return { midi: best, harmonicity: on / (off + 1e-9) };
}

// Transforme une suite de trames audio en événements « note jouée ».
// Principe : à chaque attaque (de nouvelles fréquences apparaissent), on regarde ce qui
// a été ajouté au spectre par rapport à juste avant. La note précédente, qui sonne encore,
// est ainsi ignorée : on ne trouve que la nouvelle note, à la bonne octave.
// Indépendant du navigateur pour pouvoir être testé.
export class NoteTracker {
  constructor({ gate = 0.01 } = {}) {
    this.gate = gate;
    this.noiseFloor = 0.002;
    this.fft = null;
    this.reset();
  }

  reset() {
    this.history = []; // derniers spectres
    this.levels = []; // derniers volumes
    this.pending = null;
    this.lastOnset = -1e9;
    this.lastMidi = null;
    this.lastEmit = -1e9;
    this.frame = 0;
  }

  // `buf` : les derniers échantillons (4096 conseillés). Renvoie un numéro MIDI ou null.
  process(buf, sr, now) {
    const n = buf.length >= 4096 ? 4096 : 2048;
    if (!this.fft || this.fft.n !== n) {
      this.fft = new FFT(n);
      this.history = [];
    }
    this.frame++;
    const rms = rmsOf(buf.length > n ? buf.subarray(buf.length - n) : buf);
    this.level = rms;
    this.levels.push(rms);
    if (this.levels.length > 6) this.levels.shift();

    // Bruit de fond : suit lentement le minimum quand c'est calme
    if (rms < this.noiseFloor) this.noiseFloor = rms;
    else this.noiseFloor += (rms - this.noiseFloor) * 0.002;
    const gate = Math.max(this.gate, this.noiseFloor * 3);

    const binHz = sr / n;
    const maxBin = Math.min(n / 2 - 1, Math.floor(MAX_HZ / binHz));
    const mag = this.history.length >= 6 ? this.history.shift() : new Float32Array(n / 2);
    this.fft.magnitudes(buf, mag);
    const prev = this.history[this.history.length - 1];
    this.history.push(mag);

    if (rms < gate) {
      this.pending = null;
      return null;
    }

    // Attaque : part de « nouvelles » fréquences dans le spectre
    if (prev) {
      let flux = 0;
      let tot = 0;
      for (let b = 2; b <= maxBin; b++) {
        const d = mag[b] - prev[b];
        if (d > 0) flux += d;
        tot += mag[b];
      }
      const fr = flux / (tot + 1e-9);
      // nouvelle attaque (ou attaque nettement plus forte que celle en attente)
      const stronger = this.pending && fr > Math.max(0.35, 1.5 * this.pending.flux);
      if (fr > 0.2 && (now - this.lastOnset > 150 || stronger)) {
        this.lastOnset = now;
        // spectre « d'avant » : le maximum des spectres des ~125 ms précédant l'attaque
        // (une note qui sonne encore et « bat » légèrement ne passe pas pour une nouvelle note)
        const pre = new Float32Array(n / 2);
        const H = this.history;
        for (let h = 0; h < H.length - 1; h++) {
          const sp = H[h];
          for (let b = 0; b < n / 2; b++) if (sp[b] > pre[b]) pre[b] = sp[b];
        }
        const L = this.levels;
        const before = Math.max(...L.slice(0, -1), 0);
        this.pending = { at: this.frame + 2, pre, before, flux: fr };
      }
    }

    if (this.pending && this.frame >= this.pending.at) {
      const { pre, before } = this.pending;
      this.pending = null;
      // si l'attaque est rejetée, elle ne doit pas masquer la suivante
      const reject = () => {
        this.lastOnset = -1e9;
        return null;
      };
      const rise = rms / (before + 1e-9);
      // ce qui a été ajouté depuis l'attaque (racine carrée : équilibre les harmoniques)
      const D = new Float32Array(n / 2);
      let added = 0;
      let total = 0;
      for (let b = 1; b <= maxBin; b++) {
        const d = mag[b] - pre[b];
        if (d > 0) {
          D[b] = Math.sqrt(d);
          added += d;
        }
        total += mag[b];
      }
      if (added < 0.12 * total) return reject();
      const r = noteFromSpectrum(D, binHz);
      if (!r || r.harmonicity <= 2) return reject();
      // l'écho d'une attaque ne doit pas compter comme une deuxième note
      // même note rejouée : il faut que le volume remonte vraiment
      if (r.midi === this.lastMidi && (now - this.lastEmit < 260 || rise < 1.1)) return reject();
      this.lastMidi = r.midi;
      this.lastEmit = now;
      return r.midi;
    }
    return null;
  }
}
