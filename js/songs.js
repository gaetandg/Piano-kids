// Chansons (mélodies en Do majeur, main droite).
// Notes : "C4" = 1 temps, "C4:2" = 2 temps, "C4:.5" = un demi-temps, "F#4" = Fa dièse.
// "<C3" = note jouée avec la main gauche (chansons à deux mains).
// Paroles : une syllabe par note, séparées par des espaces.
import { parseNote, FINGERS_C, FINGERS_LEFT } from './music.js';

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
  {
    id: 'clair-gauche',
    title: 'Au clair de la lune (main gauche)',
    emoji: '🌛',
    planet: 'p7',
    level: 2,
    bpm: 96,
    notes: '<C3 <C3 <C3 <D3 <E3:2 <D3:2 <C3 <E3 <D3 <D3 <C3:4 <C3 <C3 <C3 <D3 <E3:2 <D3:2 <C3 <E3 <D3 <D3 <C3:4',
    lyrics: 'Au clair de la lu- ne, mon a- mi Pier- rot, prê- te- moi ta plu- me pour é- crire un mot.',
  },
  {
    id: 'maman-2mains',
    title: 'Ah ! vous dirai-je, maman (deux mains)',
    emoji: '🌟',
    planet: 'p7',
    level: 3,
    bpm: 100,
    notes:
      'C4 C4 G4 G4 A4 A4 G4:2 <F3 <F3 <E3 <E3 <D3 <D3 <C3:2 <G3 <G3 <F3 <F3 <E3 <E3 <D3:2 G4 G4 F4 F4 E4 E4 D4:2 ' +
      'C4 C4 G4 G4 A4 A4 G4:2 <F3 <F3 <E3 <E3 <D3 <D3 <C3:2',
    lyrics:
      'Ah ! vous di- rai- je, ma- man, ce qui cau- se mon tour- ment. Pa- pa veut que je rai- sonne com- m’u- ne gran- de per- sonne. Moi, je dis que les bon- bons va- lent mieux que la rai- son.',
  },
  {
    id: 'clair-2mains',
    title: 'Au clair de la lune (deux mains)',
    emoji: '🌕',
    planet: 'p7',
    level: 3,
    bpm: 96,
    notes:
      '<C3 <C3 <C3 <D3 <E3:2 <D3:2 <C3 <E3 <D3 <D3 <C3:4 C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4 ' +
      'D4 D4 D4 D4 A3:2 A3:2 D4 C4 B3 A3 G3:4 <C3 <C3 <C3 <D3 <E3:2 <D3:2 <C3 <E3 <D3 <D3 <C3:4',
    lyrics:
      'Au clair de la lu- ne, mon a- mi Pier- rot, prê- te- moi ta plu- me pour é- crire un mot. Ma chan- delle est mor- te, je n’ai plus de feu. Ou- vre- moi ta por- te pour l’a- mour de Dieu.',
  },
  {
    id: 'douce-nuit',
    title: 'Douce nuit',
    emoji: '🌌',
    planet: 'p9',
    level: 3,
    bpm: 80,
    notes:
      'G4:1.5 A4:.5 G4 E4:3 G4:1.5 A4:.5 G4 E4:3 D5:2 D5 B4:3 C5:2 C5 G4:3 ' +
      'A4:2 A4 C5:1.5 B4:.5 A4 G4:1.5 A4:.5 G4 E4:3 A4:2 A4 C5:1.5 B4:.5 A4 G4:1.5 A4:.5 G4 E4:3 ' +
      'D5:2 D5 F5:1.5 D5:.5 B4 C5:3 E5:3 C5:1.5 G4:.5 E4 G4:1.5 F4:.5 D4 C4:6',
    lyrics: null,
  },
  {
    id: 'we-wish',
    title: 'Nous vous souhaitons un joyeux Noël',
    emoji: '🎁',
    planet: 'p9',
    level: 3,
    bpm: 110,
    notes:
      'G4 C5 C5:.5 D5:.5 C5:.5 B4:.5 A4 A4 A4 D5 D5:.5 E5:.5 D5:.5 C5:.5 B4 G4 G4 ' +
      'E5 E5:.5 F5:.5 E5:.5 D5:.5 C5 A4 G4:.5 G4:.5 A4 D5 B4 C5:3',
    lyrics: null,
  },
  {
    id: 'gamme-sol',
    title: 'La gamme de Sol (avec Fa♯)',
    emoji: '🪜',
    planet: 'p10',
    level: 3,
    bpm: 90,
    notes: 'G4 A4 B4 C5 D5 E5 F#5 G5:2 G5 F#5 E5 D5 C5 B4 A4 G4:2',
    lyrics: null,
  },
  {
    id: 'anniversaire-sol',
    title: 'Joyeux anniversaire (en Sol, avec Fa♯)',
    emoji: '🎈',
    planet: 'p10',
    level: 3,
    bpm: 90,
    notes:
      'D4:.75 D4:.25 E4 D4 G4 F#4:2 D4:.75 D4:.25 E4 D4 A4 G4:2 D4:.75 D4:.25 D5 B4 G4 F#4 E4:1.5 C5:.75 C5:.25 B4 G4 A4 G4:2',
    lyrics:
      'Joy- eux an- ni- ver- saire, joy- eux an- ni- ver- saire, joy- eux an- ni- ver- saire {name}, joy- eux an- ni- ver- saire !',
  },
  {
    id: 'clair-sol',
    title: 'Au clair de la lune (en Sol, avec Fa♯)',
    emoji: '🌙',
    planet: 'p10',
    level: 3,
    bpm: 96,
    notes:
      'G4 G4 G4 A4 B4:2 A4:2 G4 B4 A4 A4 G4:4 G4 G4 G4 A4 B4:2 A4:2 G4 B4 A4 A4 G4:4 ' +
      'A4 A4 A4 A4 E4:2 E4:2 A4 G4 F#4 E4 D4:4 G4 G4 G4 A4 B4:2 A4:2 G4 B4 A4 A4 G4:4',
    lyrics:
      'Au clair de la lu- ne, mon a- mi Pier- rot, prê- te- moi ta plu- me pour é- crire un mot. Ma chan- delle est mor- te, je n’ai plus de feu. Ou- vre- moi ta por- te pour l’a- mour de Dieu.',
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
      const left = tok.startsWith('<');
      const [n, d] = (left ? tok.slice(1) : tok).split(':');
      return { midi: parseNote(n), dur: d ? parseFloat(d) : 1, hand: left ? 'left' : 'right' };
    });
  if (raw.lyrics) {
    const syl = syllables(raw.lyrics);
    if (syl.length !== notes.length) {
      console.warn(`Paroles de « ${raw.title} » : ${syl.length} syllabes pour ${notes.length} notes`);
    }
    notes.forEach((n, i) => (n.lyric = syl[i] || ''));
  }
  // Doigts : pour chaque main, seulement si toutes ses notes tiennent dans sa position de Do
  for (const [hand, map] of [
    ['right', FINGERS_C],
    ['left', FINGERS_LEFT],
  ]) {
    const hn = notes.filter((n) => n.hand === hand);
    if (hn.length && hn.every((n) => map[n.midi])) hn.forEach((n) => (n.finger = map[n.midi]));
  }
  const twoHands = notes.some((n) => n.hand === 'left') && notes.some((n) => n.hand === 'right');
  return { ...raw, notes, hands: twoHands ? 'both' : notes[0].hand };
}

export const SONGS = RAW.map(build);

export function getSong(id) {
  return SONGS.find((s) => s.id === id);
}
