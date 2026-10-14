// Test de la détection de notes avec des sons de piano synthétiques.
// Lancer : node tests/pitch.test.mjs
import { detectPitch, NoteTracker } from '../js/pitchcore.js';

const SR = 48000;
const FRAME = 2048; // fenêtre de l'analyse de hauteur seule
const TFRAME = 4096; // fenêtre utilisée par le micro de l'app
const HOP = Math.round(SR * 0.025); // une analyse toutes les 25 ms (comme dans l'app)

const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Son de "piano" : harmoniques décroissantes + bruit
function renderNotes(notes, { noise = 0.003, fundamental = 1 } = {}) {
  const total = notes.reduce((t, n) => Math.max(t, n.t + n.dur + 0.6), 0);
  const out = new Float32Array(Math.ceil(total * SR));
  for (const n of notes) {
    const f = freq(n.midi);
    const start = Math.floor(n.t * SR);
    const len = Math.floor((n.dur + 0.4) * SR);
    for (let i = 0; i < len && start + i < out.length; i++) {
      const t = i / SR;
      const att = Math.min(1, t / 0.004);
      const rel = t > n.dur ? Math.exp(-(t - n.dur) / 0.06) : 1;
      const env = att * Math.exp(-t / 0.9) * rel * (n.vel ?? 0.4);
      let s = 0;
      [fundamental, 0.6, 0.35, 0.2, 0.12, 0.06].forEach((a, k) => {
        s += (a * Math.exp(-t * k * 0.8) * Math.sin(2 * Math.PI * f * (k + 1) * t)) / 1.5;
      });
      out[start + i] += s * env;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] += (Math.random() * 2 - 1) * noise;
  return out;
}

function track(signal) {
  const tr = new NoteTracker({ gate: 0.01 });
  const events = [];
  for (let pos = 0; pos + TFRAME <= signal.length; pos += HOP) {
    const now = ((pos + TFRAME) / SR) * 1000;
    const m = tr.process(signal.subarray(pos, pos + TFRAME), SR, now);
    if (m != null) events.push({ midi: m, t: Math.round(now) });
  }
  return events;
}

let fails = 0;
function check(name, cond, info = '') {
  console.log(`${cond ? '✔' : '✘'} ${name} ${info}`);
  if (!cond) fails++;
}

// 1. Précision de la hauteur sur toute la plage du piano 37 touches
let worst = 0;
for (let m = 48; m <= 84; m++) {
  const sig = renderNotes([{ midi: m, t: 0, dur: 0.5 }], { noise: 0 });
  const r = detectPitch(sig.subarray(4800, 4800 + FRAME), SR);
  const det = r ? 69 + 12 * Math.log2(r.freq / 440) : NaN;
  worst = Math.max(worst, Math.abs(det - m));
  if (!(Math.abs(det - m) < 0.3)) check(`hauteur MIDI ${m}`, false, `détecté ${det.toFixed(2)}`);
}
check('hauteur juste de Do3 à Do6', worst < 0.3, `(écart max ${worst.toFixed(3)} demi-ton)`);

// 1b. Fondamentale faible (petit haut-parleur) : la classe de note doit rester juste
let pcOk = true;
for (let m = 48; m <= 84; m++) {
  const sig = renderNotes([{ midi: m, t: 0, dur: 0.5 }], { noise: 0, fundamental: 0.2 });
  const r = detectPitch(sig.subarray(4800, 4800 + FRAME), SR);
  const det = r ? Math.round(69 + 12 * Math.log2(r.freq / 440)) : null;
  if (det == null || det % 12 !== m % 12) {
    pcOk = false;
    console.log('   fondamentale faible, MIDI', m, '->', det);
  }
}
check('nom de note juste même avec fondamentale faible', pcOk);

// 2. Au clair de la lune (début) : notes répétées
const clair = [60, 60, 60, 62, 64, 62, 60, 64, 62, 62, 60];
const durs = [0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 1.5];
let t = 0.2;
const seq = clair.map((m, i) => {
  const n = { midi: m, t, dur: durs[i] * 0.9 };
  t += durs[i];
  return n;
});
const ev = track(renderNotes(seq));
check(
  'Au clair de la lune : 11 notes détectées dans l’ordre',
  ev.length === clair.length && ev.every((e, i) => e.midi === clair[i]),
  JSON.stringify(ev.map((e) => e.midi)),
);

// 3. Notes rapides et legato (la note précédente sonne encore)
const fast = [60, 62, 64, 65, 67, 65, 64, 62, 60];
const fastSeq = fast.map((m, i) => ({ midi: m, t: 0.2 + i * 0.3, dur: 0.45 }));
const ev2 = track(renderNotes(fastSeq));
check(
  'gamme rapide en legato',
  ev2.length === fast.length && ev2.every((e, i) => e.midi === fast[i]),
  JSON.stringify(ev2.map((e) => e.midi)),
);

// 4. Silence + bruit : aucune note
const ev3 = track(renderNotes([{ midi: 60, t: 5, dur: 0.1, vel: 0 }], { noise: 0.004 }));
check('pas de fausse note dans le bruit', ev3.length === 0, JSON.stringify(ev3));

// 5. Note tenue longtemps : une seule détection
const ev4 = track(renderNotes([{ midi: 67, t: 0.2, dur: 2.5 }]));
check('note tenue = un seul événement', ev4.length === 1 && ev4[0].midi === 67, JSON.stringify(ev4));

// 6. Notes graves et aiguës du clavier
const ends = [48, 84, 50, 81];
const ev5 = track(renderNotes(ends.map((m, i) => ({ midi: m, t: 0.2 + i * 0.6, dur: 0.5 }))));
check('extrémités du clavier', ev5.map((e) => e.midi).join() === ends.join(), JSON.stringify(ev5.map((e) => e.midi)));

// 7. Jeu « legato » réaliste : la note précédente sonne encore (avec écho, sons
//    légèrement désaccordés). C'est là que l'ancienne détection se trompait d'octave.
let seed = 3;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function renderLegato(notes, { hold = 1.0, gap = 0.5, detune = 4, reverb = 0.5, noise = 0.004, fund = 0.6 } = {}) {
  const out = new Float32Array(Math.ceil((notes.length * gap + hold + 1) * SR));
  notes.forEach((m, j) => {
    const start = Math.floor((0.3 + j * gap) * SR);
    const len = Math.floor((hold + 0.4) * SR);
    for (const dc of [-detune, detune]) {
      const f = freq(m) * Math.pow(2, dc / 1200);
      [fund, 0.6, 0.4, 0.25, 0.15, 0.1].forEach((a, k) => {
        const fn = f * (k + 1) * Math.sqrt(1 + 0.0005 * (k + 1) ** 2);
        const ph = rnd() * 6.28;
        for (let i = 0; i < len && start + i < out.length; i++) {
          const t = i / SR;
          const env = Math.min(1, t / 0.004) * Math.exp(-t * (1.2 + k)) * (t > hold ? Math.exp(-(t - hold) / 0.08) : 1);
          out[start + i] += 0.12 * a * env * Math.sin(2 * Math.PI * fn * t + ph);
        }
      });
    }
  });
  if (reverb)
    for (const [d, g] of [
      [0.023, 0.5],
      [0.037, 0.35],
      [0.051, 0.25],
      [0.079, 0.15],
    ]) {
      const D = Math.floor(d * SR);
      for (let i = out.length - 1; i >= D; i--) out[i] += reverb * g * out[i - D];
    }
  for (let i = 0; i < out.length; i++) out[i] += (rnd() * 2 - 1) * noise;
  return out;
}
const melodies = [
  [60, 62, 64, 65, 67, 65, 64, 62, 60],
  [61, 63, 66, 68, 70, 73, 75, 78, 80, 82],
  [60, 64, 62, 65, 64, 67, 65, 69, 67, 71, 69, 72],
  [48, 60, 72, 84, 55, 67, 79, 50, 74],
  [48, 50, 52, 53, 55, 57, 59, 49, 51, 54],
  [60, 60, 60, 62, 64, 62, 60, 64, 62, 62, 60],
];
let ok = 0;
let total = 0;
let octave = 0;
let extra = 0;
for (const mel of melodies) {
  for (const opt of [{}, { gap: 0.35, hold: 1.2 }, { fund: 0.2, reverb: 0.8 }]) {
    const ev = track(renderLegato(mel, opt)).map((e) => e.midi);
    // alignement (distance d'édition) entre notes attendues et détectées
    const n = mel.length;
    const m = ev.length;
    const D = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= m; j++)
        D[i][j] = Math.min(D[i - 1][j - 1] + (mel[i - 1] === ev[j - 1] ? 0 : 1), D[i - 1][j] + 1, D[i][j - 1] + 1);
    let i = n;
    let j = m;
    while (i > 0 && j > 0) {
      if (D[i][j] === D[i - 1][j - 1] + (mel[i - 1] === ev[j - 1] ? 0 : 1)) {
        if (mel[i - 1] === ev[j - 1]) ok++;
        else if ((ev[j - 1] - mel[i - 1]) % 12 === 0) octave++;
        i--;
        j--;
      } else if (D[i][j] === D[i - 1][j] + 1) i--;
      else {
        extra++;
        j--;
      }
    }
    extra += j;
    total += n;
  }
}
check('jeu legato : au moins 95 % de notes justes', ok / total >= 0.95, `(${ok}/${total})`);
check('jeu legato : aucune erreur d’octave', octave === 0, `(${octave})`);
check('jeu legato : pas de notes en trop', extra <= 2, `(${extra})`);

console.log(fails ? `\n${fails} échec(s)` : '\nTout est OK');
process.exit(fails ? 1 : 0);
