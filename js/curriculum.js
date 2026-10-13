// Le voyage : planètes et missions.
import { totalStars } from './state.js';

const C4 = 60;
const WHITE_C4_C5 = [60, 62, 64, 65, 67, 69, 71, 72];

export const PLANETS = [
  {
    id: 'p1',
    name: 'Planète Clavier',
    desc: 'Découvre ton piano',
    look: 'earth',
    missions: [
      {
        id: 'p1-intro',
        type: 'intro',
        title: 'Bonjour le piano !',
        slides: [
          {
            text: 'Salut ! Moi, c’est Cosmo, un petit extraterrestre qui adore la musique. On part explorer le piano ensemble ? 🚀',
            mood: 'excited',
          },
          {
            text: 'Regarde ton piano : il y a des touches blanches et des touches noires.',
            kb: { range: 'piano' },
          },
          {
            text: 'À gauche, les sons sont graves, comme un gros ours : BOUM ! 🐻',
            kb: { range: 'piano', targets: 'low' },
            sound: 'low',
          },
          {
            text: 'À droite, les sons sont aigus, comme un petit oiseau : cui-cui ! 🐦',
            kb: { range: 'piano', targets: 'high' },
            sound: 'high',
          },
          {
            text: 'À toi ! Joue une note sur ton piano, n’importe laquelle. Je vais t’écouter. 👂',
            kb: { range: 'piano' },
            try: { any: true, count: 3, prompt: 'Joue 3 notes' },
          },
        ],
      },
      { id: 'p1-highlow', type: 'highlow', title: 'Grave ou aigu ?', rounds: 8 },
      {
        id: 'p1-black2',
        type: 'findkey',
        title: 'Les jumelles noires',
        intro: 'Les touches noires vont par 2 ou par 3. Trouve un groupe de 2 touches noires !',
        prompts: [{ text: 'Joue une touche noire d’un groupe de 2', pcs: [1, 3] }],
        rounds: 5,
      },
      {
        id: 'p1-black3',
        type: 'findkey',
        title: 'Les triplées noires',
        intro: 'Maintenant, cherche les groupes de 3 touches noires !',
        prompts: [{ text: 'Joue une touche noire d’un groupe de 3', pcs: [6, 8, 10] }],
        rounds: 5,
      },
      {
        id: 'p1-black23',
        type: 'findkey',
        title: '2 ou 3 ?',
        intro: 'Attention, ça se corse : parfois 2, parfois 3 !',
        prompts: [
          { text: 'Groupe de 2 touches noires !', pcs: [1, 3] },
          { text: 'Groupe de 3 touches noires !', pcs: [6, 8, 10] },
        ],
        rounds: 8,
      },
    ],
  },
  {
    id: 'p2',
    name: 'Planète Do',
    desc: 'La note Do, ta maison',
    look: 'do',
    missions: [
      {
        id: 'p2-intro',
        type: 'intro',
        title: 'Voici le Do',
        slides: [
          { text: 'Bienvenue sur la planète Do ! Ici, tout est rouge. 🔴', mood: 'excited' },
          {
            text: 'Le Do se cache juste à gauche des 2 touches noires.',
            kb: { range: [C4, 76], targets: [60, 72], label: true },
          },
          {
            text: 'Colle une gommette ROUGE sur chaque Do de ton piano. Tu peux demander de l’aide !',
            img: 'sticker',
            stickerPc: 0,
            kb: { range: 'piano', pcs: [0], label: true },
          },
          {
            text: 'Le Do du milieu, c’est ta maison. C’est là que se pose ton pouce droit. 👍',
            kb: { range: 'piano', targets: [60], label: true },
            sound: [60],
          },
          { text: 'À toi : joue un Do !', kb: { range: 'piano', names: 'c' }, try: { seq: [0], prompt: 'Joue un Do' } },
        ],
      },
      {
        id: 'p2-finddo',
        type: 'findkey',
        title: 'Tous les Do !',
        findAll: { pc: 0 },
        intro: 'Trouve tous les Do ! Ils sont juste à gauche des 2 touches noires.',
      },
      {
        id: 'p2-zones',
        type: 'findkey',
        title: 'Do grave, Do aigu',
        intro: 'Il y a plusieurs Do : des graves à gauche, des aigus à droite.',
        range: [48, 72],
        prompts: [
          { text: 'Joue le Do du milieu', pcs: [0], zone: 'middle' },
          { text: 'Joue un Do grave, à gauche', pcs: [0], zone: 'low' },
          { text: 'Joue un Do aigu, à droite', pcs: [0], zone: 'high' },
        ],
        rounds: 6,
      },
      {
        id: 'p2-rhythm',
        type: 'rhythm',
        title: 'Le tambour martien',
        patterns: [
          [1, 1, 1, 1],
          [1, 1, 2],
          [2, 1, 1],
          [1, 2, 1],
          [2, 2],
        ],
      },
    ],
  },
  {
    id: 'p3',
    name: 'Planète Ré-Mi',
    desc: 'Do, Ré, Mi et tes premières chansons',
    look: 'remi',
    missions: [
      {
        id: 'p3-intro',
        type: 'intro',
        title: 'Ré et Mi',
        slides: [
          {
            text: 'Après Do vient Ré, puis Mi. Do, Ré, Mi ! 🎵',
            kb: { range: [C4, 72], targets: [60, 62, 64], label: true },
            sound: [60, 62, 64],
          },
          {
            text: 'Ré est entre les 2 touches noires. Mi est juste à droite.',
            kb: { range: [C4, 72], targets: [62, 64], label: true },
          },
          {
            text: 'Colle une gommette ORANGE sur les Ré et JAUNE sur les Mi.',
            img: 'sticker',
            stickerPc: [2, 4],
            kb: { range: 'piano', pcs: [2, 4], label: true },
          },
          {
            text: 'Tes doigts ont des numéros ! Le pouce, c’est 1. L’index, c’est 2. Le majeur, c’est 3.',
            img: 'hand',
          },
          {
            text: 'Pouce sur Do, index sur Ré, majeur sur Mi. À toi : joue Do, Ré, Mi !',
            kb: { range: [C4, 72], targets: [60, 62, 64], label: true },
            try: { seq: [0, 2, 4], prompt: 'Joue Do, Ré, Mi' },
          },
        ],
      },
      { id: 'p3-name', type: 'namenote', title: 'Comment je m’appelle ?', notes: [60, 62, 64] },
      { id: 'p3-play', type: 'playnote', title: 'La fusée Do-Ré-Mi', notes: [60, 62, 64] },
      { id: 'p3-song1', type: 'song', title: 'Chanson : Mi Ré Do', song: 'mi-re-do' },
      { id: 'p3-simon', type: 'simon', title: 'Le code des Martiens', notes: [60, 62, 64], goal: 4 },
      { id: 'p3-song2', type: 'song', title: 'Chanson : Au clair de la lune', song: 'clair-debut' },
    ],
  },
  {
    id: 'p4',
    name: 'Planète Fa-Sol',
    desc: 'Cinq notes pour cinq doigts',
    look: 'fasol',
    missions: [
      {
        id: 'p4-intro',
        type: 'intro',
        title: 'Fa et Sol',
        slides: [
          {
            text: 'Voici Fa et Sol ! Fa est juste à gauche des 3 touches noires.',
            kb: { range: [C4, 72], targets: [65, 67], label: true },
            sound: [65, 67],
          },
          {
            text: 'Colle une gommette VERTE sur les Fa et BLEU CLAIR sur les Sol.',
            img: 'sticker',
            stickerPc: [5, 7],
            kb: { range: 'piano', pcs: [5, 7], label: true },
          },
          {
            text: 'Avec tes 5 doigts : Do, Ré, Mi, Fa, Sol. Chaque doigt a sa touche !',
            img: 'hand',
            kb: { range: [C4, 72], targets: [60, 62, 64, 65, 67], label: true },
            sound: [60, 62, 64, 65, 67],
          },
          {
            text: 'À toi : joue Do, Ré, Mi, Fa, Sol !',
            kb: { range: [C4, 72], targets: [60, 62, 64, 65, 67], label: true },
            try: { seq: [0, 2, 4, 5, 7], prompt: 'Do Ré Mi Fa Sol' },
          },
        ],
      },
      { id: 'p4-name', type: 'namenote', title: 'Qui est-ce ?', notes: [60, 62, 64, 65, 67] },
      { id: 'p4-play', type: 'playnote', title: 'La fusée à 5 notes', notes: [60, 62, 64, 65, 67] },
      { id: 'p4-song1', type: 'song', title: 'Chanson : Marie avait un petit agneau', song: 'marie' },
      {
        id: 'p4-rhythm',
        type: 'rhythm',
        title: 'Le tam-tam des étoiles',
        patterns: [
          [1, 1, 1, 1],
          [1, 0.5, 0.5, 1, 1],
          [0.5, 0.5, 1, 0.5, 0.5, 1],
          [1, 1, 2],
          [0.5, 0.5, 0.5, 0.5, 2],
          [1, 0.5, 0.5, 2],
        ],
      },
      { id: 'p4-song2', type: 'song', title: 'Chanson : Hymne à la joie', song: 'hymne' },
      { id: 'p4-simon', type: 'simon', title: 'Le code secret', notes: [60, 62, 64, 65, 67], goal: 5 },
    ],
  },
  {
    id: 'p5',
    name: 'Planète La-Si',
    desc: 'Toute la gamme, de Do à Do',
    look: 'lasi',
    missions: [
      {
        id: 'p5-intro',
        type: 'intro',
        title: 'La, Si… et Do !',
        slides: [
          {
            text: 'Les deux dernières notes : La et Si ! Et après Si… on retrouve Do !',
            kb: { range: [C4, 72], targets: [69, 71, 72], label: true },
            sound: [69, 71, 72],
          },
          {
            text: 'Colle une gommette BLEU FONCÉ sur les La et VIOLETTE sur les Si.',
            img: 'sticker',
            stickerPc: [9, 11],
            kb: { range: 'piano', pcs: [9, 11], label: true },
          },
          {
            text: 'Do, Ré, Mi, Fa, Sol, La, Si, Do : c’est la gamme ! 🌈 Écoute.',
            kb: { range: [C4, 72], targets: WHITE_C4_C5, label: true },
            sound: WHITE_C4_C5,
          },
          {
            text: 'À toi : joue la gamme, de Do jusqu’au Do suivant !',
            kb: { range: [C4, 72], names: 'all' },
            try: { seq: [0, 2, 4, 5, 7, 9, 11, 0], prompt: 'Do Ré Mi Fa Sol La Si Do' },
          },
        ],
      },
      { id: 'p5-name', type: 'namenote', title: 'Toutes les notes', notes: WHITE_C4_C5.slice(0, 7) },
      { id: 'p5-play', type: 'playnote', title: 'La fusée arc-en-ciel', notes: WHITE_C4_C5 },
      { id: 'p5-song1', type: 'song', title: 'Chanson : Ah ! vous dirai-je, maman', song: 'maman' },
      { id: 'p5-simon', type: 'simon', title: 'Le grand code', notes: WHITE_C4_C5.slice(0, 7), goal: 6 },
      { id: 'p5-song2', type: 'song', title: 'Chanson : Vive le vent', song: 'vive-le-vent' },
    ],
  },
  {
    id: 'p6',
    name: 'Planète Grave',
    desc: 'Les notes à gauche du Do du milieu',
    look: 'grave',
    missions: [
      {
        id: 'p6-intro',
        type: 'intro',
        title: 'Les notes graves',
        slides: [
          {
            text: 'À gauche du Do du milieu, il y a aussi Sol, La et Si : les mêmes notes, mais plus graves ! 🐻',
            kb: { range: [53, 72], targets: [55, 57, 59], label: true },
            sound: [55, 57, 59, 60],
          },
          {
            text: 'Pour les jouer, glisse ta main un peu vers la gauche. Garde les mêmes couleurs !',
            kb: { range: 'piano', targets: [55, 57, 59, 60], label: true },
          },
          {
            text: 'À toi : joue Si, La, Sol en descendant vers la gauche.',
            kb: { range: [53, 72], targets: [59, 57, 55], label: true },
            try: { seq: [11, 9, 7], prompt: 'Si La Sol' },
          },
        ],
      },
      { id: 'p6-play', type: 'playnote', title: 'La fusée des profondeurs', notes: [55, 57, 59, 60, 62, 64, 65, 67] },
      { id: 'p6-song1', type: 'song', title: 'Chanson : Frère Jacques', song: 'frere-jacques' },
      {
        id: 'p6-rhythm',
        type: 'rhythm',
        title: 'Le tambour des comètes',
        patterns: [
          [1, 0.5, 0.5, 1, 0.5, 0.5],
          [0.5, 0.5, 1, 2],
          [2, 0.5, 0.5, 1],
          [1, 1, 0.5, 0.5, 1],
          [0.5, 0.5, 0.5, 0.5, 1, 1],
          [1, 0.5, 0.5, 0.5, 0.5, 1],
        ],
      },
      { id: 'p6-song2', type: 'song', title: 'Chanson : Au clair de la lune', song: 'clair' },
      { id: 'p6-song3', type: 'song', title: 'Chanson : Joyeux anniversaire', song: 'anniversaire' },
    ],
  },
  { id: 'p7', name: 'Planète Main gauche', desc: 'Jouer avec les deux mains', look: 'left', comingSoon: true, missions: [] },
  {
    id: 'p8',
    name: 'Étoile des partitions',
    desc: 'Lire les notes sur la portée',
    look: 'score',
    comingSoon: true,
    missions: [],
  },
];

const MISSIONS = [];
PLANETS.forEach((p, pi) => p.missions.forEach((m, mi) => MISSIONS.push({ ...m, planetId: p.id, pi, mi })));

export function findMission(id) {
  return MISSIONS.find((m) => m.id === id) || null;
}

export function findPlanet(id) {
  return PLANETS.find((p) => p.id === id) || null;
}

export function isDone(profile, id) {
  return !!(profile.done && profile.done[id]);
}

export function planetUnlocked(profile, planetId, unlockAll = false) {
  const i = PLANETS.findIndex((p) => p.id === planetId);
  const p = PLANETS[i];
  if (!p || p.comingSoon) return false;
  if (i === 0 || unlockAll) return true;
  return PLANETS[i - 1].missions.every((m) => isDone(profile, m.id));
}

export function missionUnlocked(profile, id, unlockAll = false) {
  const m = findMission(id);
  if (!m || !planetUnlocked(profile, m.planetId, unlockAll)) return false;
  if (m.mi === 0 || unlockAll) return true;
  return isDone(profile, PLANETS[m.pi].missions[m.mi - 1].id);
}

export function nextMission(id) {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i >= 0 && i + 1 < MISSIONS.length ? MISSIONS[i + 1] : null;
}

// La prochaine mission à faire (pour le bouton « Continuer »).
export function currentMission(profile, unlockAll = false) {
  return MISSIONS.find((m) => !isDone(profile, m.id) && missionUnlocked(profile, m.id, unlockAll)) || null;
}

export function planetProgress(profile, planet) {
  let stars = 0;
  let max = 0;
  let done = 0;
  for (const m of planet.missions) {
    if (m.type !== 'intro') {
      max += 3;
      stars += (profile.stars && profile.stars[m.id]) || 0;
    }
    if (isDone(profile, m.id)) done++;
  }
  return { stars, max, done, total: planet.missions.length };
}

export { totalStars };
