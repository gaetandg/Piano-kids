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

const midiHz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const harmHz = (f, k) => f * k * Math.sqrt(1 + 0.0004 * k * k); // légère inharmonicité du piano

// Valeur maximale du spectre autour d'une fréquence.
function peakAt(D, binHz, fHz) {
  const bin = fHz / binHz;
  const tol = Math.max(0.5, bin * 0.012);
  let lo = Math.max(1, Math.round(bin - tol));
  const hi = Math.min(D.length - 1, Math.round(bin + tol));
  let m = 0;
  for (; lo <= hi; lo++) if (D[lo] > m) m = D[lo];
  return m;
}

function harmonicScore(D, binHz, midi) {
  const f = midiHz(midi);
  let s = 0;
  for (let k = 1; k < HARM_W.length; k++) {
    const fk = harmHz(f, k);
    if (fk > MAX_HZ) break;
    s += HARM_W[k] * peakAt(D, binHz, fk);
  }
  return s;
}

// Les harmoniques doivent ressortir par rapport à ce qu'il y a entre elles.
function harmonicity(D, binHz, midi) {
  const f = midiHz(midi);
  let on = 0;
  let off = 0;
  for (let k = 1; k <= 6; k++) {
    const fk = harmHz(f, k);
    if (fk > MAX_HZ) break;
    on += peakAt(D, binHz, fk);
    off += (peakAt(D, binHz, fk * (1 + 0.5 / k)) + peakAt(D, binHz, fk * (1 - 0.5 / k))) / 2;
  }
  return on / (off + 1e-9);
}

// Efface les harmoniques d'une note (pour chercher les autres notes d'un accord).
function removeHarmonics(D, binHz, midi) {
  const f = midiHz(midi);
  for (let k = 1; k <= 16; k++) {
    const fk = harmHz(f, k);
    if (fk > MAX_HZ) break;
    const bin = fk / binHz;
    const w = Math.max(0.5, bin * 0.012) + 1.5; // + largeur du pic (fenêtre de Hann)
    for (let b = Math.max(1, Math.floor(bin - w)); b <= Math.min(D.length - 1, Math.ceil(bin + w)); b++) D[b] = 0;
  }
}

// Trouve la note dont les harmoniques expliquent le mieux le spectre `D`.
// Renvoie {midi, score, harmonicity} ou null.
export function noteFromSpectrum(D, binHz, minMidi = 36, maxMidi = 100) {
  let best = -1;
  let bestS = 0;
  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const s = harmonicScore(D, binHz, midi);
    if (s > bestS) {
      bestS = s;
      best = midi;
    }
  }
  if (best < 0) return null;
  return { midi: best, score: bestS, harmonicity: harmonicity(D, binHz, best) };
}

// Cherche dans le spectre R des notes dont la fondamentale est bien présente
// (efface au fur et à mesure les harmoniques des notes trouvées).
function findNotesWithFundamental(R, binHz, refScore, maxPeak, count, minMidi, maxMidi) {
  const notes = [];
  while (notes.length < count) {
    let best = -1;
    let bestS = 0;
    for (let midi = minMidi; midi <= maxMidi; midi++) {
      if (peakAt(R, binHz, midiHz(midi)) < 0.3 * maxPeak) continue;
      const sc = harmonicScore(R, binHz, midi);
      if (sc > bestS) {
        bestS = sc;
        best = midi;
      }
    }
    if (best < 0 || bestS < 0.25 * refScore) break;
    notes.push(best);
    removeHarmonics(R, binHz, best);
  }
  return notes;
}

// Part de l'énergie ajoutée qui tombe sur les harmoniques des notes trouvées :
// presque tout pour de vraies notes, peu pour un bruit (claquement, voix, objet qui tombe).
export function explainedEnergy(D, binHz, notes) {
  const inside = new Uint8Array(D.length);
  for (const midi of notes) {
    const f = midiHz(midi);
    for (let k = 1; k <= 16; k++) {
      const fk = harmHz(f, k);
      if (fk > MAX_HZ) break;
      const bin = fk / binHz;
      const w = Math.max(0.5, bin * 0.012) + 1.5;
      for (let b = Math.max(1, Math.floor(bin - w)); b <= Math.min(D.length - 1, Math.ceil(bin + w)); b++) inside[b] = 1;
    }
  }
  const top = Math.min(D.length - 1, Math.floor(MAX_HZ / binHz));
  let all = 0;
  let inn = 0;
  // à partir de 100 Hz : les grondements (chocs, touches qui cognent) ne comptent pas
  for (let b = Math.ceil(100 / binHz); b <= top; b++) {
    const e = D[b] * D[b];
    all += e;
    if (inside[b]) inn += e;
  }
  return inn / (all + 1e-12);
}

// Une vraie note forme des pics nets (fondamentale + au moins une harmonique) ; le bruit non.
function hasClearPeaks(D, binHz, midi) {
  const f = midiHz(midi);
  const contrast = (fHz) => {
    const bin = fHz / binHz;
    const p = peakAt(D, binHz, fHz);
    // un vrai pic domine les creux de chaque côté (même si une autre note est juste à côté)
    const valley = (from, to) => {
      let m = Infinity;
      for (let b = Math.round(from); b <= Math.round(to); b++) if (b > 0 && b < D.length && D[b] < m) m = D[b];
      return m === Infinity ? 0 : m;
    };
    return p / (Math.max(valley(bin - 4, bin - 2), valley(bin + 2, bin + 4)) + 1e-9);
  };
  if (contrast(f) < 2) return false;
  return contrast(harmHz(f, 2)) >= 1.6 || contrast(harmHz(f, 3)) >= 1.6;
}

// Plusieurs notes jouées ensemble (accord) : on trouve la note principale, on efface ses
// harmoniques, puis on cherche les notes qui restent. Une note supplémentaire doit avoir
// sa fondamentale bien présente et assez d'énergie, pour ne pas inventer de notes.
// Renvoie un tableau de numéros MIDI (la note principale d'abord), éventuellement vide.
export function notesFromSpectrum(D, binHz, { max = 4, minMidi = 36, maxMidi = 100 } = {}) {
  const first = noteFromSpectrum(D, binHz, minMidi, maxMidi);
  if (!first) return [];
  let maxPeak = 0;
  for (let b = 1; b < D.length; b++) if (D[b] > maxPeak) maxPeak = D[b];
  // Accord : chaque note doit avoir sa fondamentale et des pics nets
  const chordNotes = () =>
    findNotesWithFundamental(D.slice(), binHz, first.score, maxPeak, max, minMidi, maxMidi).filter((m) =>
      hasClearPeaks(D, binHz, m),
    );
  if (first.harmonicity <= 2) {
    // les autres notes d'un accord tombent entre les harmoniques de la principale
    const chord = chordNotes();
    return chord.length >= 2 ? chord : [];
  }
  const R = D.slice();
  removeHarmonics(R, binHz, first.midi);
  const single = [first.midi, ...findNotesWithFundamental(R, binHz, first.score, maxPeak, max - 1, minMidi, maxMidi)];
  if (peakAt(D, binHz, midiHz(first.midi)) >= 0.25 * maxPeak) return single;

  // La note principale n'a pas de fondamentale : c'est peut-être la « basse virtuelle »
  // d'un accord (Do-Mi-Sol ressemble aux harmoniques d'un Do plus grave). Si une des notes
  // trouvées n'est pas une harmonique de cette basse, c'est bien un accord.
  const chord = chordNotes();
  const harmonics = [12, 19, 24, 28, 31, 34, 36].map((i) => first.midi + i);
  if (chord.length >= 2 && chord.some((m) => !harmonics.includes(m))) return chord;
  return single;
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

  // `buf` : les derniers échantillons (4096 conseillés).
  // Renvoie les notes qui viennent d'être jouées (tableau de numéros MIDI, la principale d'abord) ou null.
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
      const pending = this.pending;
      const { pre, before } = pending;
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
      const found = notesFromSpectrum(D, binHz);
      if (!found.length) return reject();
      // Chaque note gardée doit expliquer une bonne part de l'énergie ajoutée, et l'ensemble
      // presque toute : sinon c'est un bruit (claquement de mains, objet qui tombe, voix…).
      const notes = [found[0]];
      let explained = explainedEnergy(D, binHz, notes);
      for (const m of found.slice(1)) {
        const e = explainedEnergy(D, binHz, [...notes, m]);
        if (e - explained >= 0.1) {
          notes.push(m);
          explained = e;
        }
      }
      // Même note rejouée : l'ancienne sonne encore, la partie « nouvelle » est faible face au
      // bruit de l'attaque. Un bruit imite rarement la note qu'on vient de jouer : on est plus souple.
      const again = notes[0] === this.lastMidi;
      if (again) {
        const e1 = explainedEnergy(D, binHz, [notes[0]]);
        if (e1 >= 0.6) {
          notes.length = 1;
          explained = e1;
        }
      }
      if (explained < (notes.length > 1 ? 0.82 : again ? 0.6 : 0.78)) {
        // Note qui démarre après un silence : la fenêtre contient encore le silence, les pics
        // sont flous. On regarde à nouveau 50 ms plus tard plutôt que de rejeter.
        if (!pending.retried && rise > 4) {
          this.pending = { ...pending, at: this.frame + 2, retried: true };
          return null;
        }
        return reject(); // accords : plus exigeant
      }
      const r = { midi: notes[0] };
      // l'écho d'une attaque ne doit pas compter comme une deuxième note
      // même note rejouée : il faut que le volume remonte vraiment
      if (r.midi === this.lastMidi && (now - this.lastEmit < 260 || rise < 1.1)) return reject();
      this.lastMidi = r.midi;
      this.lastEmit = now;
      return notes;
    }
    return null;
  }
}
