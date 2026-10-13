// Chansons (mélodies en Do majeur, main droite).
// Notes : "C4" = 1 temps, "C4:2" = 2 temps, "C4:.5" = un demi-temps.
// Paroles : une syllabe par note, séparées par des espaces.
import { parseNote, FINGERS_C } from './music.js';

const RAW = [
  {
    id: 'mi-re-do',
    title: 'Mi Ré Do',
    emoji: '🥐',
    planet: 'p3',
    level: 1,
    bpm: 92,
    notes: 'E4 D4 C4:2 E4 D4 C4:2 C4:.5 C4:.5 C4:.5 C4:.5 D4:.5 D4:.5 D4:.5 D4:.5 E4 D4 C4:2',
    lyrics: null,
  },
  {
    id: 'clair-debut',
    title: 'Au clair de la lune (début)',
    emoji: '🌙',
    planet: 'p3',
    level: 1,
    bpm: 96,
    notes: 'C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4 C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4',
    lyrics: 'Au clair de la lu- ne, mon a- mi Pier- rot, prê- te- moi ta plu- me pour é- crire un mot.',
  },
  {
    id: 'marie',
    title: 'Marie avait un petit agneau',
    emoji: '🐑',
    planet: 'p4',
    level: 2,
    bpm: 100,
    notes: 'E4 D4 C4 D4 E4 E4 E4:2 D4 D4 D4:2 E4 G4 G4:2 E4 D4 C4 D4 E4 E4 E4 E4 D4 D4 E4 D4 C4:4',
    lyrics: null,
  },
  {
    id: 'hymne',
    title: 'Hymne à la joie',
    emoji: '🎉',
    planet: 'p4',
    level: 2,
    bpm: 100,
    notes: 'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2',
    lyrics: null,
  },
  {
    id: 'maman',
    title: 'Ah ! vous dirai-je, maman',
    emoji: '⭐',
    planet: 'p5',
    level: 2,
    bpm: 100,
    notes:
      'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2',
    lyrics:
      'Ah ! vous di- rai- je, ma- man, ce qui cau- se mon tour- ment. Pa- pa veut que je rai- sonne com- m’u- ne gran- de per- sonne. Moi, je dis que les bon- bons va- lent mieux que la rai- son.',
  },
  {
    id: 'vive-le-vent',
    title: 'Vive le vent',
    emoji: '❄️',
    planet: 'p5',
    level: 3,
    bpm: 112,
    notes:
      'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 E4 D4 D4 E4 D4:2 G4:2 ' +
      'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 G4 G4 F4 D4 C4:4',
    lyrics: null,
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    emoji: '🔔',
    planet: 'p6',
    level: 3,
    bpm: 100,
    notes:
      'C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 C4 G3 C4:2 C4 G3 C4:2',
    lyrics:
      'Frè- re Jac- ques, frè- re Jac- ques, dor- mez- vous, dor- mez- vous ? Son- nez les ma- ti- nes, son- nez les ma- ti- nes, ding, dang, dong, ding, dang, dong !',
  },
  {
    id: 'clair',
    title: 'Au clair de la lune (en entier)',
    emoji: '🕯️',
    planet: 'p6',
    level: 3,
    bpm: 96,
    notes:
      'C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4 C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4 ' +
      'D4 D4 D4 D4 A3:2 A3:2 D4 C4 B3 A3 G3:4 C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4',
    lyrics:
      'Au clair de la lu- ne, mon a- mi Pier- rot, prê- te- moi ta plu- me pour é- crire un mot. ' +
      'Ma chan- delle est mor- te, je n’ai plus de feu. Ou- vre- moi ta por- te pour l’a- mour de Dieu.',
  },
  {
    id: 'anniversaire',
    title: 'Joyeux anniversaire',
    emoji: '🎂',
    planet: 'p6',
    level: 3,
    bpm: 90,
    notes: 'G3:.75 G3:.25 A3 G3 C4 B3:2 G3:.75 G3:.25 A3 G3 D4 C4:2 G3:.75 G3:.25 G4 E4 C4 B3 A3:1.5 F4:.75 F4:.25 E4 C4 D4 C4:2',
    lyrics:
      'Joy- eux an- ni- ver- saire, joy- eux an- ni- ver- saire, joy- eux an- ni- ver- saire {name}, joy- eux an- ni- ver- saire !',
  },
];

// Ponctuation isolée (« ? », « ! ») : on la colle à la syllabe précédente.
function syllables(text) {
  const out = [];
  for (const t of text.split(/\s+/).filter(Boolean)) {
    if (/^[?!:;»]+$/.test(t) && out.length) out[out.length - 1] += ' ' + t;
    else out.push(t);
  }
  return out;
}

function build(raw) {
  const notes = raw.notes
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const [n, d] = tok.split(':');
      return { midi: parseNote(n), dur: d ? parseFloat(d) : 1 };
    });
  if (raw.lyrics) {
    const syl = syllables(raw.lyrics);
    if (syl.length !== notes.length) {
      console.warn(`Paroles de « ${raw.title} » : ${syl.length} syllabes pour ${notes.length} notes`);
    }
    notes.forEach((n, i) => (n.lyric = syl[i] || ''));
  }
  // Doigts : seulement si toute la chanson tient dans la position Do-Sol
  if (notes.every((n) => FINGERS_C[n.midi])) notes.forEach((n) => (n.finger = FINGERS_C[n.midi]));
  return { ...raw, notes };
}

export const SONGS = RAW.map(build);

export function getSong(id) {
  return SONGS.find((s) => s.id === id);
}
