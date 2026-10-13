// Notes, couleurs et modèle de clavier.
// Convention : numéros MIDI (60 = Do du milieu = C4).

export const NOTE_NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];

// Couleurs des gommettes (touches blanches).
export const NOTE_COLORS = {
  0: '#ff4757', // Do  rouge
  2: '#ff9f1c', // Ré  orange
  4: '#ffd60a', // Mi  jaune
  5: '#2ed573', // Fa  vert
  7: '#38c6f4', // Sol bleu clair
  9: '#3d5afe', // La  bleu foncé
  11: '#a55eea', // Si  violet
};

export const STICKER_NAMES = {
  0: 'rouge',
  2: 'orange',
  4: 'jaune',
  5: 'verte',
  7: 'bleu clair',
  9: 'bleu foncé',
  11: 'violette',
};

export const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PCS = [1, 3, 6, 8, 10];
const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const pc = (midi) => ((midi % 12) + 12) % 12;
export const isBlack = (midi) => BLACK_PCS.includes(pc(midi));
export const noteName = (midi) => NOTE_NAMES[pc(midi)];
export const octaveOf = (midi) => Math.floor(midi / 12) - 1;
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const freqToMidi = (f) => 69 + 12 * Math.log2(f / 440);

export function noteColor(midi) {
  return NOTE_COLORS[pc(midi)] || '#222';
}

// Texte lisible sur la couleur de la note (le jaune et le bleu clair veulent du noir).
export function noteTextColor(midi) {
  const p = pc(midi);
  return p === 4 || p === 7 || p === 2 || p === 5 ? '#1a1a2e' : '#fff';
}

// Groupe de touches noires : 2 (Do♯, Ré♯) ou 3 (Fa♯, Sol♯, La♯).
export function blackGroup(midi) {
  const p = pc(midi);
  if (p === 1 || p === 3) return 2;
  if (p === 6 || p === 8 || p === 10) return 3;
  return 0;
}

// "C4", "F#3", "Bb3" -> MIDI
export function parseNote(s) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s.trim());
  if (!m) throw new Error('Note invalide : ' + s);
  let v = LETTERS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return v + (parseInt(m[3], 10) + 1) * 12;
}

// Pianos possibles (réglage parents).
export const PIANO_PRESETS = [
  { id: '37C', label: '37 touches (commence par Do)', from: 48, to: 84 },
  { id: '37F', label: '37 touches (commence par Fa)', from: 53, to: 89 },
  { id: '25C', label: '25 touches (commence par Do)', from: 48, to: 72 },
  { id: '32F', label: '32 touches (commence par Fa)', from: 53, to: 84 },
  { id: '44F', label: '44 touches (commence par Fa)', from: 41, to: 84 },
  { id: '49C', label: '49 touches', from: 36, to: 84 },
  { id: '61C', label: '61 touches', from: 36, to: 96 },
  { id: '76E', label: '76 touches', from: 28, to: 103 },
  { id: '88A', label: '88 touches (piano complet)', from: 21, to: 108 },
];

export function pianoPreset(id) {
  return PIANO_PRESETS.find((p) => p.id === id) || PIANO_PRESETS[0];
}

export function whiteCount(from, to) {
  let n = 0;
  for (let m = from; m <= to; m++) if (!isBlack(m)) n++;
  return n;
}

// Plage du clavier à l'écran.
// Si tout le piano tient (touches blanches d'au moins 34 px), on l'affiche en entier, comme le vrai.
// Sinon (téléphone en portrait) : des octaves complètes, de Do à Do, autour des notes utiles [a, b].
export function screenRange(a, b, piano, width) {
  if (width / whiteCount(piano.from, piano.to) >= 34) return { from: piano.from, to: piano.to, full: true };
  let from = a - pc(a);
  let to = b + ((12 - pc(b)) % 12);
  // une octave de plus de chaque côté si les touches restent assez larges
  while (whiteCount(from, to + 12) * 44 <= width && to + 12 <= Math.max(piano.to, b)) to += 12;
  while (whiteCount(from - 12, to) * 44 <= width && from - 12 >= Math.min(piano.from, a)) from -= 12;
  return { from, to, full: false };
}

// Ramène une note dans la plage affichée en la décalant d'octaves.
export function foldIntoRange(midi, from, to) {
  let m = midi;
  while (m < from) m += 12;
  while (m > to) m -= 12;
  return m < from ? null : m;
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Numéros de doigts de la main droite en position de Do.
export const FINGERS_C = { 60: 1, 62: 2, 64: 3, 65: 4, 67: 5 };
