// Le voyage : planètes et missions.
import { totalStars } from './state.js';

const C4 = 60;
const WHITE_C4_C5 = [60, 62, 64, 65, 67, 69, 71, 72];
const LH_C = 48; // Do grave : position de la main gauche
const LH_NOTES = [48, 50, 52, 53, 55];
const HIGH_NOTES = [72, 74, 76, 77]; // Do, Ré, Mi, Fa aigus

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
  {
    id: 'p7',
    name: 'Planète Main gauche',
    desc: 'Jouer avec les deux mains',
    look: 'left',
    missions: [
      {
        id: 'p7-intro',
        type: 'intro',
        title: 'La main gauche',
        slides: [
          {
            text: 'Bienvenue sur la planète Main gauche ! Jusqu’ici, tu jouais avec la main droite. Maintenant, la main gauche entre en piste ! 🖐️',
            mood: 'excited',
          },
          {
            text: 'Ta main gauche aussi a des numéros : le pouce, c’est 1, et le petit doigt, c’est 5.',
            img: 'hand-left',
          },
          {
            text: 'Pose ta main gauche sur le Do grave, à gauche : le petit doigt sur Do, puis Ré, Mi, Fa… et le pouce sur Sol.',
            img: 'hand-left',
            kb: { range: [LH_C, 72], targets: LH_NOTES, label: true },
            sound: LH_NOTES,
          },
          {
            text: 'À toi : joue Do, Ré, Mi, Fa, Sol avec la main gauche, en commençant par le petit doigt.',
            kb: { range: [LH_C, 72], targets: LH_NOTES, label: true },
            try: { seq: [0, 2, 4, 5, 7], prompt: 'Do Ré Mi Fa Sol, main gauche' },
          },
          {
            text: 'Et maintenant à l’envers : Sol, Fa, Mi, Ré, Do, en commençant par le pouce !',
            kb: { range: [LH_C, 72], targets: LH_NOTES, label: true },
            try: { seq: [7, 5, 4, 2, 0], prompt: 'Sol Fa Mi Ré Do, main gauche' },
          },
        ],
      },
      { id: 'p7-play', type: 'playnote', title: 'La fusée de gauche', notes: LH_NOTES, hand: 'left', exact: true },
      { id: 'p7-song1', type: 'song', title: 'Chanson : Au clair de la lune (main gauche)', song: 'clair-gauche' },
      {
        id: 'p7-intro2',
        type: 'intro',
        title: 'Les deux mains',
        slides: [
          {
            text: 'Maintenant, les deux mains ensemble ! La main gauche joue les notes graves, la main droite les notes aiguës.',
            img: 'hands',
            mood: 'excited',
          },
          {
            text: 'Main gauche sur le Do grave, main droite sur le Do du milieu. Dans les chansons, les bulles BLEUES sont pour la main gauche et les ORANGE pour la main droite.',
            kb: { range: [LH_C, 72], targets: [LH_C, C4], label: true },
            sound: [LH_C, C4],
          },
          {
            text: 'À toi : joue Do avec la main gauche et Mi avec la main droite, en même temps !',
            kb: { range: [LH_C, 72], targets: [LH_C, 64], label: true },
            try: { chord: [LH_C, 64], prompt: 'Do à gauche + Mi à droite' },
          },
          {
            text: 'Encore un : Mi avec la main gauche et Sol avec la main droite !',
            kb: { range: [LH_C, 72], targets: [52, 67], label: true },
            try: { chord: [52, 67], prompt: 'Mi à gauche + Sol à droite' },
          },
        ],
      },
      { id: 'p7-song2', type: 'song', title: 'Chanson : Ah ! vous dirai-je, maman (2 mains)', song: 'maman-2mains' },
      { id: 'p7-song3', type: 'song', title: 'Chanson : Au clair de la lune (2 mains)', song: 'clair-2mains' },
    ],
  },
  {
    id: 'p8',
    name: 'Étoile des partitions',
    desc: 'Lire les notes sur la portée',
    look: 'score',
    missions: [
      {
        id: 'p8-intro',
        type: 'intro',
        title: 'La portée',
        slides: [
          {
            text: 'Bienvenue sur l’étoile des partitions ! Les musiciens écrivent les notes sur 5 lignes : c’est la portée. 🎼',
            mood: 'excited',
            staff: { notes: [] },
          },
          {
            text: 'Au début, il y a la clé de sol. Elle s’enroule autour de la 2e ligne : la note posée sur cette ligne s’appelle Sol !',
            staff: { notes: [67], names: true },
          },
          {
            text: 'Plus la note est haute sur la portée, plus le son est aigu. Écoute : Do, Ré, Mi, Fa, Sol.',
            staff: { notes: [60, 62, 64, 65, 67], names: true },
            kb: { range: [C4, 72], targets: [60, 62, 64, 65, 67], label: true },
            sound: [60, 62, 64, 65, 67],
          },
          {
            text: 'Le Do du milieu a sa petite ligne à lui, sous la portée. Mi est sur la 1re ligne, Sol sur la 2e.',
            staff: { notes: [60, 64, 67], names: true },
          },
          {
            text: 'À toi : lis les notes sur la portée et joue-les !',
            staff: { notes: [60, 64, 67] },
            kb: { range: [C4, 72] },
            try: { seq: [0, 4, 7], prompt: 'Joue les notes de la portée' },
          },
        ],
      },
      { id: 'p8-name1', type: 'namenote', title: 'Quelle est cette note ?', notes: [60, 62, 64, 65, 67], display: 'staff' },
      { id: 'p8-play1', type: 'playnote', title: 'Lis et joue', notes: [60, 62, 64, 65, 67], display: 'staff' },
      { id: 'p8-song1', type: 'song', title: 'Partition : Mi Ré Do', song: 'mi-re-do', display: 'staff' },
      {
        id: 'p8-intro2',
        type: 'intro',
        title: 'Plus haut sur la portée',
        slides: [
          {
            text: 'On continue de monter : La entre la 2e et la 3e ligne, Si sur la 3e ligne, et Do juste au-dessus.',
            staff: { notes: [67, 69, 71, 72], names: true },
            kb: { range: [C4, 72], targets: [67, 69, 71, 72], label: true },
            sound: [67, 69, 71, 72],
          },
          {
            text: 'Une note sur une ligne, une note entre deux lignes, une note sur une ligne… La gamme monte comme une échelle ! 🪜',
            staff: { notes: WHITE_C4_C5, names: true },
            sound: WHITE_C4_C5,
          },
        ],
      },
      {
        id: 'p8-name2',
        type: 'namenote',
        title: 'Le grand quiz de la portée',
        notes: WHITE_C4_C5.slice(0, 7),
        display: 'staff',
      },
      {
        id: 'p8-play2',
        type: 'playnote',
        title: 'Lis sans les couleurs',
        notes: WHITE_C4_C5,
        display: 'staff',
        colors: false,
      },
      {
        id: 'p8-song2',
        type: 'song',
        title: 'Partition : Au clair de la lune',
        song: 'clair-debut',
        display: 'staff',
        colors: false,
      },
      { id: 'p8-song3', type: 'song', title: 'Partition : Hymne à la joie', song: 'hymne', display: 'staff', colors: false },
    ],
  },
  {
    id: 'p9',
    name: 'Planète Noël',
    desc: 'Les notes aiguës et les chansons de Noël',
    look: 'noel',
    missions: [
      {
        id: 'p9-intro',
        type: 'intro',
        title: 'Les notes aiguës',
        slides: [
          {
            text: 'Bienvenue sur la planète Noël ! ❄️ Les lutins de l’espace ont besoin de toi pour jouer les chansons de Noël.',
            mood: 'excited',
          },
          {
            text: 'Après le Do aigu, les notes continuent vers la droite : Ré, Mi, Fa… Les mêmes noms, mais plus aigus, comme des clochettes ! 🔔',
            kb: { range: [C4, 79], targets: HIGH_NOTES, label: true },
            sound: HIGH_NOTES,
          },
          {
            text: 'Pour les jouer, glisse ta main droite vers la droite. Les gommettes t’aident : ce sont les mêmes couleurs !',
            kb: { range: 'piano', targets: HIGH_NOTES, label: true },
          },
          {
            text: 'À toi : joue Do, Ré, Mi, Fa, tout en haut du piano !',
            kb: { range: [C4, 79], targets: HIGH_NOTES, label: true },
            try: { seq: [0, 2, 4, 5], prompt: 'Do Ré Mi Fa aigus' },
          },
        ],
      },
      {
        id: 'p9-find',
        type: 'findkey',
        title: 'Les clochettes aiguës',
        intro: 'Les clochettes sonnent tout en haut du piano. Trouve les notes aiguës, à droite du Do aigu !',
        range: [C4, 84],
        prompts: [
          { text: 'Joue le Do aigu', pcs: [0], min: 72, max: 72 },
          { text: 'Joue le Ré aigu, juste après le Do aigu', pcs: [2], min: 73, max: 83 },
          { text: 'Joue le Mi aigu', pcs: [4], min: 73, max: 83 },
          { text: 'Joue le Fa aigu', pcs: [5], min: 73, max: 83 },
        ],
        rounds: 8,
      },
      { id: 'p9-song1', type: 'song', title: 'Chanson : Mon beau sapin', song: 'mon-sapin' },
      {
        id: 'p9-rhythm',
        type: 'rhythm',
        title: 'Les grelots du traîneau',
        patterns: [
          [1, 1, 2],
          [1, 1, 1, 1],
          [1, 1, 1.5, 0.5, 2],
          [0.5, 0.5, 1, 0.5, 0.5, 1],
          [1, 1, 2, 2],
        ],
      },
      { id: 'p9-song2', type: 'song', title: 'Chanson : Nous vous souhaitons un joyeux Noël', song: 'we-wish' },
      { id: 'p9-simon', type: 'simon', title: 'Les cloches de Noël', notes: [67, 69, 71, 72, 74, 76], goal: 5 },
      { id: 'p9-song3', type: 'song', title: 'Chanson : Douce nuit', song: 'douce-nuit' },
    ],
  },
  {
    id: 'p10',
    name: 'Planète Dièse',
    desc: 'Les touches noires ont un nom',
    look: 'diese',
    missions: [
      {
        id: 'p10-intro',
        type: 'intro',
        title: 'Les dièses',
        slides: [
          {
            text: 'Bienvenue sur la planète Dièse ! Ici, on joue enfin les touches noires ! ♯',
            mood: 'excited',
          },
          {
            text: 'Une touche noire prend le nom de sa voisine blanche de gauche, avec « dièse ». Juste à droite de Fa, c’est Fa dièse !',
            kb: { range: [C4, 72], targets: [65, 66], label: true },
            sound: [65, 66, 67],
          },
          {
            text: 'Fa dièse est un tout petit peu plus aigu que Fa. Sur la portée, on dessine un dièse ♯ devant la note.',
            staff: { notes: [65, 66, 67], names: true },
          },
          {
            text: 'Toutes les touches noires ont un nom : Do dièse, Ré dièse, Fa dièse, Sol dièse et La dièse.',
            kb: { range: [C4, 72], targets: [61, 63, 66, 68, 70], label: true },
            sound: [61, 63, 66, 68, 70],
          },
          {
            text: 'À toi : joue Fa, puis Fa dièse, puis Sol. Ça monte tout doucement !',
            kb: { range: [C4, 72], targets: [65, 66, 67], label: true },
            try: { seq: [5, 6, 7], prompt: 'Fa, Fa dièse, Sol' },
          },
        ],
      },
      {
        id: 'p10-find',
        type: 'findkey',
        title: 'Tous les Fa dièse !',
        findAll: { pc: 6, help: 'Fa dièse, c’est la touche noire juste à droite de Fa.' },
        range: [53, 79],
        intro: 'Trouve tous les Fa dièse ! C’est la touche noire juste à droite de chaque Fa.',
      },
      { id: 'p10-name', type: 'namenote', title: 'Le nom des touches noires', notes: [61, 63, 66, 68, 70] },
      { id: 'p10-play', type: 'playnote', title: 'La fusée dièse', notes: [60, 61, 62, 63, 64, 65, 66, 67] },
      { id: 'p10-song1', type: 'song', title: 'Chanson : La gamme de Sol', song: 'gamme-sol' },
      {
        id: 'p10-staff',
        type: 'playnote',
        title: 'Lis les dièses',
        notes: [62, 64, 66, 67, 69, 71],
        display: 'staff',
      },
      { id: 'p10-song2', type: 'song', title: 'Chanson : Au clair de la lune (en Sol)', song: 'clair-sol' },
      { id: 'p10-song3', type: 'song', title: 'Chanson : Joyeux anniversaire (en Sol)', song: 'anniversaire-sol' },
    ],
  },
  {
    id: 'p11',
    name: 'Planète Écho',
    desc: 'Retrouver les notes à l’oreille',
    look: 'echo',
    missions: [
      {
        id: 'p11-intro',
        type: 'intro',
        title: 'Joue avec tes oreilles',
        slides: [
          {
            text: 'Bienvenue sur la planète Écho ! 👂 Ici, on joue avec les oreilles : Cosmo joue une note, et toi tu la retrouves.',
            mood: 'excited',
          },
          {
            text: 'Écoute : voici Do, la note de la maison… et voici Sol, plus aiguë. Tu entends la différence ?',
            kb: { range: [C4, 72], targets: [60, 67], label: true },
            sound: [60, 67, 60, 67],
          },
          {
            text: 'L’astuce des musiciens : compare avec le Do de la maison. Si la note est plus aiguë, elle est plus à droite sur le piano !',
            kb: { range: [C4, 72], targets: [60], label: true },
            sound: [60, 64, 60, 67],
          },
          {
            text: 'À toi : joue Do, puis Sol, et écoute bien le son de chacune.',
            kb: { range: [C4, 72], targets: [60, 67], label: true },
            try: { seq: [0, 7], prompt: 'Joue Do puis Sol' },
          },
        ],
      },
      { id: 'p11-same', type: 'samediff', title: 'Pareil ou différent ?', rounds: 8 },
      { id: 'p11-ear1', type: 'playnote', title: 'Do ou Sol ?', notes: [60, 67], ear: true, rounds: 8 },
      { id: 'p11-ear2', type: 'playnote', title: 'Do, Mi ou Sol ?', notes: [60, 64, 67], ear: true, rounds: 8 },
      { id: 'p11-echo1', type: 'simon', title: 'L’écho de Cosmo', notes: [60, 64, 67], goal: 4, hidden: true },
      { id: 'p11-ear3', type: 'playnote', title: 'L’oreille d’or', notes: [60, 62, 64, 65, 67], ear: true },
      { id: 'p11-echo2', type: 'simon', title: 'Le grand écho', notes: [60, 62, 64, 65, 67], goal: 5, hidden: true },
    ],
  },
  {
    id: 'p12',
    name: 'Planète Rythme',
    desc: 'Rondes, blanches, noires et silences',
    look: 'rythme',
    missions: [
      {
        id: 'p12-intro',
        type: 'intro',
        title: 'Les figures de notes',
        slides: [
          {
            text: 'Bienvenue sur la planète Rythme ! 🥁 Ici, les notes n’ont pas toutes la même forme : la forme dit combien de temps on tient la note.',
            mood: 'excited',
          },
          {
            text: 'La noire est toute pleine, avec une queue. Elle dure 1 temps : ta !',
            staff: {
              colors: false,
              notes: [
                { midi: 67, dur: 1 },
                { midi: 67, dur: 1 },
                { midi: 67, dur: 1 },
              ],
              labels: ['ta', 'ta', 'ta'],
            },
            rhythm: [1, 1, 1],
          },
          {
            text: 'La blanche est creuse. Elle dure 2 temps : ta-a !',
            staff: {
              colors: false,
              notes: [
                { midi: 67, dur: 2 },
                { midi: 67, dur: 2 },
              ],
              labels: ['ta-a', 'ta-a'],
            },
            rhythm: [2, 2],
          },
          {
            text: 'La ronde est creuse et n’a pas de queue. Elle dure 4 temps : ta-a-a-a !',
            staff: { colors: false, notes: [{ midi: 67, dur: 4 }], labels: ['ta-a-a-a'] },
            rhythm: [4],
          },
          {
            text: 'Les croches ont un petit drapeau. Elles sont rapides, deux croches pour 1 temps : ti-ti !',
            staff: {
              colors: false,
              notes: [0.5, 0.5, 0.5, 0.5].map((dur) => ({ midi: 67, dur })),
              labels: ['ti', 'ti', 'ti', 'ti'],
            },
            rhythm: [0.5, 0.5, 0.5, 0.5],
          },
          {
            text: 'On récapitule : la ronde dure 4 temps, la blanche 2, la noire 1 et la croche un demi.',
            staff: {
              colors: false,
              notes: [4, 2, 1, 0.5].map((dur) => ({ midi: 67, dur })),
              labels: ['ronde', 'blanche', 'noire', 'croche'],
            },
            rhythm: [4, 2, 1, 0.5, 0.5],
          },
        ],
      },
      {
        id: 'p12-figures',
        type: 'rhythm',
        title: 'Lis les figures',
        notation: true,
        patterns: [[1, 1, 1, 1], [2, 2], [1, 1, 2], [4], [0.5, 0.5, 1, 2]],
      },
      {
        id: 'p12-intro2',
        type: 'intro',
        title: 'Les silences',
        slides: [
          {
            text: 'En musique, on a aussi le droit de se taire ! Un silence, c’est un moment où on ne joue pas. 🤫',
            mood: 'excited',
          },
          {
            text: 'Le soupir est un silence de 1 temps. On le dessine comme un petit éclair.',
            staff: { colors: false, notes: [{ rest: true, dur: 1 }], labels: ['soupir'] },
          },
          {
            text: 'La demi-pause dure 2 temps : c’est un petit chapeau posé sur la ligne. La pause dure 4 temps : elle est accrochée sous la ligne.',
            staff: {
              colors: false,
              notes: [
                { rest: true, dur: 2 },
                { rest: true, dur: 4 },
              ],
              labels: ['demi-pause', 'pause'],
            },
          },
          {
            text: 'Écoute : ta, ta, chut, ta. Pendant le soupir, on ne joue pas !',
            staff: {
              colors: false,
              notes: [
                { midi: 67, dur: 1 },
                { midi: 67, dur: 1 },
                { rest: true, dur: 1 },
                { midi: 67, dur: 1 },
              ],
              labels: ['ta', 'ta', 'chut', 'ta'],
            },
            rhythm: [1, 1, -1, 1],
          },
        ],
      },
      {
        id: 'p12-rests',
        type: 'rhythm',
        title: 'Chut, un silence !',
        notation: true,
        patterns: [
          [1, 1, -1, 1],
          [1, -1, 1, -1],
          [2, -1, 1],
          [1, 1, -2],
          [0.5, 0.5, 1, -1, 1],
        ],
      },
      {
        id: 'p12-concert',
        type: 'rhythm',
        title: 'Le grand concert du tambour',
        notation: true,
        patterns: [[1, 0.5, 0.5, -1, 1], [2, 1, -1], [0.5, 0.5, 0.5, 0.5, -1, 1], [1, -1, 0.5, 0.5, 1], [4], [2, -2]],
      },
      { id: 'p12-song', type: 'song', title: 'Partition : Frère Jacques', song: 'frere-jacques', display: 'staff' },
    ],
  },
  {
    id: 'p13',
    name: 'Planète Clé de fa',
    desc: 'Lire les notes de la main gauche',
    look: 'cledefa',
    missions: [
      {
        id: 'p13-intro',
        type: 'intro',
        title: 'La clé de fa',
        slides: [
          {
            text: 'Bienvenue sur la planète Clé de fa ! 🎼 Pour lire les notes graves de la main gauche, les musiciens utilisent une autre clé : la clé de fa.',
            mood: 'excited',
            staff: { clef: 'fa', notes: [] },
          },
          {
            text: 'La clé de fa a deux petits points. La ligne qui passe entre les deux points, c’est la note Fa !',
            staff: { clef: 'fa', notes: [53], names: true },
          },
          {
            text: 'Ta main gauche sur le Do grave : Do, Ré, Mi, Fa, Sol. En clé de fa, ce Do est dans le 2e espace, en partant du bas.',
            staff: { clef: 'fa', notes: LH_NOTES, names: true },
            kb: { range: [LH_C, 72], targets: LH_NOTES, label: true },
            sound: LH_NOTES,
          },
          {
            text: 'Tout en haut, sur une petite ligne au-dessus de la portée : c’est le Do du milieu ! En clé de sol, il a sa petite ligne en dessous.',
            staff: { clef: 'fa', notes: [55, 57, 59, 60], names: true },
            sound: [55, 57, 59, 60],
          },
          {
            text: 'À toi : lis ces notes et joue-les avec la main gauche !',
            staff: { clef: 'fa', notes: [48, 52, 55] },
            kb: { range: [LH_C, 72] },
            try: { seq: [0, 4, 7], prompt: 'Joue les notes de la clé de fa' },
          },
        ],
      },
      {
        id: 'p13-name1',
        type: 'namenote',
        title: 'Quelle note en clé de fa ?',
        notes: LH_NOTES,
        display: 'staff',
        clef: 'fa',
      },
      {
        id: 'p13-play1',
        type: 'playnote',
        title: 'Lis et joue, main gauche',
        notes: LH_NOTES,
        display: 'staff',
        clef: 'fa',
        hand: 'left',
        exact: true,
      },
      {
        id: 'p13-song1',
        type: 'song',
        title: 'Partition : Au clair de la lune (main gauche)',
        song: 'clair-gauche',
        display: 'staff',
        clef: 'fa',
      },
      {
        id: 'p13-name2',
        type: 'namenote',
        title: 'Le grand quiz de la clé de fa',
        notes: [48, 50, 52, 53, 55, 57, 59],
        display: 'staff',
        clef: 'fa',
      },
      {
        id: 'p13-song2',
        type: 'song',
        title: 'Partition : Marie avait un petit agneau',
        song: 'marie-gauche',
        display: 'staff',
        clef: 'fa',
      },
      {
        id: 'p13-play2',
        type: 'playnote',
        title: 'Lis sans les couleurs, main gauche',
        notes: [48, 50, 52, 53, 55, 57, 59, 60],
        display: 'staff',
        clef: 'fa',
        hand: 'left',
        exact: true,
        colors: false,
      },
      {
        id: 'p13-song3',
        type: 'song',
        title: 'Partition : Hymne à la joie (main gauche)',
        song: 'hymne-gauche',
        display: 'staff',
        clef: 'fa',
        colors: false,
      },
    ],
  },
  {
    id: 'p14',
    name: 'Planète Bémol',
    desc: 'Si bémol et les chansons en Fa',
    look: 'bemol',
    missions: [
      {
        id: 'p14-intro',
        type: 'intro',
        title: 'Le bémol',
        slides: [
          {
            text: 'Bienvenue sur la planète Bémol ! ♭ Tu connais déjà le dièse. Voici un autre mot magique des musiciens : bémol !',
            mood: 'excited',
          },
          {
            text: 'Bémol veut dire « un tout petit peu plus grave ». La touche noire juste à gauche de Si, c’est Si bémol !',
            kb: { range: [C4, 72], targets: [70, 71], label: true, flat: true },
            sound: [71, 70],
          },
          {
            text: 'Sur la portée, le bémol ressemble à un petit b. On le dessine devant la note : Si bémol est sur la ligne du Si.',
            staff: { notes: [71, { midi: 70, flat: true }], names: true },
          },
          {
            text: 'Surprise : Si bémol et La dièse, c’est la même touche noire ! Une seule touche, deux noms, comme un surnom. 😄',
            staff: { notes: [70, { midi: 70, flat: true }], names: true },
            kb: { range: [C4, 72], targets: [70], label: true, flat: true },
            sound: [70],
          },
          {
            text: 'Toutes les touches noires ont aussi un nom en bémol : Ré bémol, Mi bémol, Sol bémol, La bémol et Si bémol.',
            kb: { range: [C4, 72], targets: [61, 63, 66, 68, 70], label: true, flat: true },
            sound: [61, 63, 66, 68, 70],
          },
          {
            text: 'À toi : joue Do, Si bémol, puis La. Ça descend tout doucement !',
            kb: { range: [C4, 72], targets: [72, 70, 69], label: true, flat: true },
            try: { seq: [0, 10, 9], prompt: 'Do, Si bémol, La', flat: true },
          },
        ],
      },
      {
        id: 'p14-find',
        type: 'findkey',
        title: 'Tous les Si bémol !',
        findAll: { pc: 10, flat: true, help: 'Si bémol, c’est la touche noire juste à gauche de Si.' },
        range: [53, 79],
        intro: 'Trouve tous les Si bémol ! C’est la touche noire juste à gauche de chaque Si.',
      },
      { id: 'p14-name', type: 'namenote', title: 'Les noms en bémol', notes: [61, 63, 66, 68, 70], flats: true },
      { id: 'p14-play', type: 'playnote', title: 'La fusée en Fa', notes: [65, 67, 69, 70, 72, 74], flats: true },
      { id: 'p14-song1', type: 'song', title: 'Chanson : La gamme de Fa', song: 'gamme-fa' },
      {
        id: 'p14-staff',
        type: 'playnote',
        title: 'Lis les bémols',
        notes: [65, 67, 69, 70, 72],
        display: 'staff',
        flats: true,
      },
      { id: 'p14-song2', type: 'song', title: 'Chanson : Ah ! vous dirai-je, maman (en Fa)', song: 'maman-fa' },
      { id: 'p14-song3', type: 'song', title: 'Chanson : Frère Jacques (en Fa)', song: 'frere-fa' },
      {
        id: 'p14-song4',
        type: 'song',
        title: 'Partition : Hymne à la joie (en Fa)',
        song: 'hymne-fa',
        display: 'staff',
      },
    ],
  },
  {
    id: 'p15',
    name: 'Planète Compositeur',
    desc: 'Invente ta propre musique',
    look: 'compo',
    missions: [
      {
        id: 'p15-intro',
        type: 'intro',
        title: 'Deviens compositeur',
        slides: [
          {
            text: 'Bienvenue sur la planète Compositeur ! ✍️ Un compositeur, c’est quelqu’un qui invente de la musique. Aujourd’hui, c’est toi !',
            mood: 'excited',
          },
          {
            text: 'La musique, c’est comme une conversation : Cosmo joue une question… et tu réponds ! Écoute.',
            kb: { range: [C4, 72], targets: [60, 64, 67, 65], label: true },
            sound: [60, 64, 67, 65, 64, 62, 62, 60],
          },
          {
            text: 'Une mélodie qui finit sur Do sonne comme une fin : on est rentré à la maison ! 🏠 Écoute.',
            kb: { range: [C4, 72], targets: [60], label: true },
            sound: [67, 65, 64, 62, 60],
          },
          {
            text: 'À toi : joue 4 notes de ton choix, pour échauffer tes doigts de compositeur !',
            kb: { range: [C4, 72] },
            try: { any: true, count: 4, prompt: 'Joue 4 notes' },
          },
        ],
      },
      {
        id: 'p15-answer1',
        type: 'compose',
        title: 'Question, réponse',
        mode: 'answer',
        notes: [60, 62, 64, 65, 67],
        len: 4,
        questions: [
          [60, 62, 64, 65],
          [67, 65, 64, 62],
          [60, 64, 67, 65],
          [64, 64, 65, 67],
        ],
      },
      { id: 'p15-free1', type: 'compose', title: 'Ta première chanson', mode: 'free', notes: [60, 62, 64, 65, 67], len: 8 },
      { id: 'p15-black', type: 'compose', title: 'La magie des touches noires', mode: 'black', len: 8 },
      {
        id: 'p15-answer2',
        type: 'compose',
        title: 'Le duo des étoiles',
        mode: 'answer',
        notes: WHITE_C4_C5,
        len: 4,
        questions: [
          [67, 69, 71, 72],
          [72, 71, 69, 67],
          [64, 67, 69, 67],
          [65, 69, 72, 71],
        ],
      },
      { id: 'p15-free2', type: 'compose', title: 'Ta grande chanson', mode: 'free', notes: WHITE_C4_C5, len: 12 },
    ],
  },
  {
    id: 'p16',
    name: 'Planète des Émotions',
    desc: 'Joyeux ou triste, fort ou doux, vite ou lent',
    look: 'emotions',
    missions: [
      {
        id: 'p16-intro',
        type: 'intro',
        title: 'Joyeux ou triste',
        slides: [
          {
            text: 'Bienvenue sur la planète des Émotions ! 🎭 La musique peut être joyeuse, triste, calme ou pleine d’énergie.',
            mood: 'excited',
          },
          {
            text: 'Écoute : Do, Mi, Sol. Ça sonne joyeux ! C’est un accord majeur. 😊',
            kb: { range: [C4, 72], targets: [60, 64, 67], label: true },
            sound: [60, 64, 67, 72],
          },
          {
            text: 'Maintenant Do, Mi bémol, Sol : ça sonne triste ! C’est un accord mineur. 😢',
            kb: { range: [C4, 72], targets: [60, 63, 67], label: true, flat: true },
            sound: [60, 63, 67, 72],
          },
          {
            text: 'Une seule note change : Mi devient Mi bémol, et toute la musique devient triste. Magique !',
            kb: { range: [C4, 72], targets: [64, 63], label: true, flat: true },
            sound: [60, 64, 67, 60, 63, 67],
          },
          {
            text: 'À toi : joue l’accord triste, une note après l’autre : Do, Mi bémol, Sol.',
            kb: { range: [C4, 72], targets: [60, 63, 67], label: true, flat: true },
            try: { seq: [0, 3, 7], prompt: 'Do, Mi bémol, Sol', flat: true },
          },
        ],
      },
      { id: 'p16-mood', type: 'listen', title: 'Joyeux ou triste ?', kinds: ['mood'], rounds: 8 },
      { id: 'p16-song1', type: 'song', title: 'Chanson : Frère Jacques triste', song: 'frere-mineur' },
      {
        id: 'p16-intro2',
        type: 'intro',
        title: 'Fort, doux, vite, lent',
        slides: [
          {
            text: 'Les musiciens jouent plus fort ou plus doux. En italien, fort se dit « forte » 🦁 et doux se dit « piano » 🐭… comme ton instrument !',
            mood: 'excited',
          },
          {
            text: 'Écoute : la musique devient de plus en plus forte… c’est un crescendo ! 🦁',
            demo: { kind: 'volume', answer: 'loud' },
          },
          {
            text: 'Et là, de plus en plus douce, comme si elle s’endormait : c’est un decrescendo. 🐭',
            demo: { kind: 'volume', answer: 'soft' },
          },
          {
            text: 'La musique peut aussi aller vite, comme un lapin : allegro ! 🐇',
            demo: { kind: 'tempo', answer: 'fast' },
          },
          {
            text: '… ou lentement, comme une tortue : lento. 🐢',
            demo: { kind: 'tempo', answer: 'slow' },
          },
          {
            text: 'À toi : joue Do, Ré, Mi, Fa, Sol tout doucement, comme une souris. Chut ! 🐭',
            kb: { range: [C4, 72], targets: [60, 62, 64, 65, 67], label: true },
            try: { seq: [0, 2, 4, 5, 7], prompt: 'Do Ré Mi Fa Sol, tout doux' },
          },
        ],
      },
      { id: 'p16-volume', type: 'listen', title: 'Crescendo ou decrescendo ?', kinds: ['volume'], rounds: 6 },
      { id: 'p16-tempo', type: 'listen', title: 'Vite ou lent ?', kinds: ['tempo'], rounds: 6 },
      { id: 'p16-song2', type: 'song', title: 'Chanson : Au clair de la lune (en mineur)', song: 'clair-mineur' },
      {
        id: 'p16-mix',
        type: 'listen',
        title: 'Le grand quiz des émotions',
        kinds: ['mood', 'volume', 'tempo'],
        rounds: 9,
      },
    ],
  },
  {
    id: 'p17',
    name: 'Planète des Grands Compositeurs',
    desc: 'Mozart, Beethoven et Brahms',
    look: 'compositeurs',
    missions: [
      {
        id: 'p17-intro',
        type: 'intro',
        title: 'Mozart',
        slides: [
          {
            text: 'Bienvenue sur la planète des Grands Compositeurs ! 🎩 Il y a très longtemps, des musiciens ont écrit des mélodies que le monde entier joue encore aujourd’hui.',
            mood: 'excited',
          },
          {
            text: 'Voici Wolfgang Amadeus Mozart. Il a composé ses premiers morceaux à 5 ans… presque ton âge ! Écoute le début d’« Une petite musique de nuit ».',
            kb: { range: [C4, 76], targets: [62, 67, 71, 74], label: true },
            sound: [67, 62, 67, 62, 67, 62, 67, 71, 74],
          },
          {
            text: 'Mozart a aussi inventé 12 façons différentes de jouer « Ah ! vous dirai-je, maman ». Tu la connais déjà !',
            kb: { range: [C4, 72], targets: [60, 67, 69], label: true },
            sound: [60, 60, 67, 67, 69, 69, 67],
          },
          {
            text: 'À toi : joue le début de la musique de nuit : Sol, Ré, Sol, Ré, Sol !',
            kb: { range: [C4, 72], targets: [62, 67], label: true },
            try: { seq: [7, 2, 7, 2, 7], prompt: 'Sol Ré Sol Ré Sol' },
          },
        ],
      },
      { id: 'p17-nuit', type: 'song', title: 'Mozart : Une petite musique de nuit', song: 'mozart-nuit' },
      {
        id: 'p17-nuit-rain',
        type: 'rain',
        title: '🌠 Pluie de notes : la musique de nuit',
        song: 'mozart-nuit',
        speed: 'tortue',
      },
      {
        id: 'p17-intro2',
        type: 'intro',
        title: 'Beethoven',
        slides: [
          {
            text: 'Voici Ludwig van Beethoven. En vieillissant, il est devenu sourd… et il a continué à composer, en imaginant la musique dans sa tête !',
            mood: 'excited',
          },
          {
            text: 'Tu connais déjà sa musique la plus célèbre : l’Hymne à la joie. Écoute !',
            kb: { range: [C4, 72], targets: [62, 64, 65, 67], label: true },
            sound: [64, 64, 65, 67, 67, 65, 64, 62],
          },
          {
            text: 'Il a aussi écrit la « Lettre à Élise ». Elle commence par deux notes voisines qui se balancent : Mi, Ré dièse, Mi, Ré dièse…',
            kb: { range: [C4, 76], targets: [75, 76], label: true },
            sound: [76, 75, 76, 75, 76, 71, 74, 72, 69],
          },
          {
            text: 'À toi : Mi, Ré dièse, Mi, Ré dièse, Mi !',
            kb: { range: [C4, 76], targets: [75, 76], label: true },
            try: { seq: [4, 3, 4, 3, 4], prompt: 'Mi Ré♯ Mi Ré♯ Mi' },
          },
        ],
      },
      { id: 'p17-elise', type: 'song', title: 'Beethoven : Lettre à Élise', song: 'beethoven-elise' },
      {
        id: 'p17-intro3',
        type: 'intro',
        title: 'Brahms',
        slides: [
          {
            text: 'Voici Johannes Brahms. Il a écrit une berceuse si douce que, depuis 150 ans, les parents la chantent aux bébés pour les endormir. 🌙',
            mood: 'excited',
          },
          {
            text: 'Écoute le début de la berceuse. Joue-la tout doucement, comme pour un bébé. 👶',
            kb: { range: [C4, 72], targets: [64, 67], label: true },
            sound: [64, 64, 67, 64, 64, 67],
          },
          {
            text: 'À toi : Mi, Mi, Sol !',
            kb: { range: [C4, 72], targets: [64, 67], label: true },
            try: { seq: [4, 4, 7], prompt: 'Mi Mi Sol' },
          },
        ],
      },
      { id: 'p17-berceuse', type: 'song', title: 'Brahms : Berceuse', song: 'brahms-berceuse' },
      { id: 'p17-quiz', type: 'listen', title: 'Qui a composé cette musique ?', kinds: ['composer'], rounds: 6 },
    ],
  },
  {
    id: 'p18',
    name: 'Planète des Accords',
    desc: 'Trois notes ensemble : Do, Fa, Sol',
    look: 'accords',
    missions: [
      {
        id: 'p18-intro',
        type: 'intro',
        title: 'Le sandwich de notes',
        slides: [
          {
            text: 'Bienvenue sur la planète des Accords ! 🎶 Un accord, c’est plusieurs notes jouées ensemble, comme une petite équipe.',
            mood: 'excited',
          },
          {
            text: 'Le plus célèbre : Do, Mi, Sol. On prend une touche, on en saute une, on prend la suivante, on en saute une… comme un sandwich ! 🥪',
            kb: { range: [C4, 72], targets: [60, 64, 67], label: true },
            chordSound: [60, 64, 67],
          },
          {
            text: 'Avec la main droite : le pouce (1) sur Do, le majeur (3) sur Mi et le petit doigt (5) sur Sol.',
            img: 'hand',
            kb: { range: [C4, 72], targets: [60, 64, 67], label: true },
          },
          {
            text: 'À toi : joue Do, Mi et Sol ensemble. Tu peux aussi les jouer l’une après l’autre.',
            kb: { range: [C4, 72], targets: [60, 64, 67], label: true },
            try: { chord: [60, 64, 67], oneHand: true, prompt: 'Do + Mi + Sol' },
          },
          {
            text: 'Même recette en partant de Fa : Fa, La, Do. Et en partant de Sol : Sol, Si, Ré. Tu as trois accords magiques !',
            kb: { range: [C4, 76], targets: [65, 69, 72], label: true },
            chordSound: [65, 69, 72],
          },
        ],
      },
      {
        id: 'p18-chord1',
        type: 'chord',
        title: 'Do, Fa, Sol : les accords magiques',
        chords: ['C', 'F', 'G'],
        show: true,
        rounds: 6,
      },
      { id: 'p18-chord2', type: 'chord', title: 'Construis l’accord', chords: ['C', 'F', 'G'], rounds: 8 },
      {
        id: 'p18-accomp1',
        type: 'chord',
        title: 'Accompagne Cosmo : Ah ! vous dirai-je, maman',
        bpm: 100,
        segments: [
          { melody: 'C4 C4 G4 G4', chord: 'C' },
          { melody: 'A4 A4', chord: 'F' },
          { melody: 'G4:2', chord: 'C' },
          { melody: 'F4 F4', chord: 'F' },
          { melody: 'E4 E4', chord: 'C' },
          { melody: 'D4 D4', chord: 'G' },
          { melody: 'C4:2', chord: 'C' },
        ],
      },
      {
        id: 'p18-intro2',
        type: 'intro',
        title: 'Les accords tristes',
        slides: [
          {
            text: 'Tu te souviens de la planète des Émotions ? Le même sandwich, en partant de La : La, Do, Mi… ça sonne triste ! C’est La mineur. 😢',
            kb: { range: [55, 72], targets: [57, 60, 64], label: true },
            chordSound: [57, 60, 64],
          },
          {
            text: 'Et en partant de Ré : Ré, Fa, La. C’est Ré mineur, triste lui aussi.',
            kb: { range: [55, 72], targets: [62, 65, 69], label: true },
            chordSound: [62, 65, 69],
          },
          {
            text: 'À toi : joue La mineur, La, Do et Mi ensemble !',
            kb: { range: [55, 72], targets: [57, 60, 64], label: true },
            try: { chord: [57, 60, 64], oneHand: true, prompt: 'La + Do + Mi' },
          },
        ],
      },
      {
        id: 'p18-chord3',
        type: 'chord',
        title: 'Accords joyeux et tristes',
        chords: ['C', 'Am', 'Dm', 'G'],
        rounds: 8,
      },
      {
        id: 'p18-accomp2',
        type: 'chord',
        title: 'Accompagne Cosmo : Au clair de la lune',
        bpm: 96,
        segments: [
          { melody: 'C4 C4 C4 D4', chord: 'C' },
          { melody: 'E4:2', chord: 'C' },
          { melody: 'D4:2', chord: 'G' },
          { melody: 'C4 E4', chord: 'C' },
          { melody: 'D4 D4', chord: 'G' },
          { melody: 'C4:4', chord: 'C' },
        ],
      },
    ],
  },
  {
    id: 'p19',
    name: 'Planète Octave',
    desc: 'Les notes jumelles, du grave à l’aigu',
    look: 'octave',
    missions: [
      {
        id: 'p19-intro',
        type: 'intro',
        title: 'Les notes jumelles',
        slides: [
          {
            text: 'Bienvenue sur la planète Octave ! 🐙 Ici, chaque note a des jumelles, en bas et en haut du piano.',
            mood: 'excited',
          },
          {
            text: 'Regarde : il y a quatre Do sur ton piano ! Même nom, même couleur de gommette. Écoute-les, du plus grave au plus aigu.',
            kb: { range: 'piano', targets: [48, 60, 72, 84], label: true },
            sound: [48, 60, 72, 84],
          },
          {
            text: 'C’est la même note, en plus grave ou en plus aigu : comme un papa ours 🐻, une maman, un enfant et un bébé oiseau 🐦 qui chantent ensemble.',
            kb: { range: 'piano', targets: [48, 60, 72, 84], label: true },
            chordSound: [48, 60, 72, 84],
          },
          {
            text: 'D’un Do au Do suivant, il y a huit touches blanches : Do, Ré, Mi, Fa, Sol, La, Si, Do. C’est une octave ! « Octo » veut dire huit, comme les huit bras de la pieuvre. 🐙',
            kb: { range: [C4, 72], targets: WHITE_C4_C5, label: true },
            sound: WHITE_C4_C5,
          },
          {
            text: 'À toi : joue les quatre Do, de gauche à droite !',
            kb: { range: 'piano', targets: [48, 60, 72, 84], label: true },
            try: { seq: [0, 0, 0, 0], prompt: 'Les 4 Do' },
          },
        ],
      },
      {
        id: 'p19-find',
        type: 'findkey',
        title: 'Tous les Sol du piano',
        findAll: { pc: 7, help: 'Sol, c’est la touche blanche juste après la première touche noire du groupe de 3.' },
        range: [48, 84],
        intro: 'Trouve tous les Sol du piano : le grave, celui du milieu et l’aigu !',
      },
      {
        id: 'p19-where',
        type: 'findkey',
        title: 'Le papa ours ou le bébé oiseau ?',
        intro: 'Écoute bien Cosmo : il veut la note tout en bas, au milieu ou tout en haut !',
        range: [48, 84],
        prompts: [
          { text: 'Joue le Do tout en bas : le papa ours 🐻', pcs: [0], min: 48, max: 48 },
          { text: 'Joue le Do du milieu', pcs: [0], zone: 'middle' },
          { text: 'Joue le Do aigu, juste au-dessus du Do du milieu', pcs: [0], min: 72, max: 72 },
          { text: 'Joue le Do tout en haut : le bébé oiseau 🐦', pcs: [0], min: 84, max: 84 },
          { text: 'Joue un Sol grave 🐻, à gauche du Do du milieu', pcs: [7], min: 48, max: 59 },
          { text: 'Joue un Sol aigu 🐦, à droite du Do aigu', pcs: [7], min: 73, max: 84 },
          { text: 'Joue un Mi grave 🐻', pcs: [4], min: 48, max: 59 },
          { text: 'Joue un La aigu 🐦', pcs: [9], min: 73, max: 84 },
        ],
        rounds: 8,
      },
      { id: 'p19-twins', type: 'listen', title: 'Jumelles ou pas ?', kinds: ['twins'], rounds: 8 },
      { id: 'p19-song1', type: 'song', title: 'Chanson : Frère Jacques en écho', song: 'frere-echo', exact: true },
      {
        id: 'p19-intro2',
        type: 'intro',
        title: 'L’octave sur la portée',
        slides: [
          {
            text: 'Sur la portée aussi, on voit les jumelles ! Le Do du milieu est tout en bas, sur sa petite ligne. Le Do aigu est beaucoup plus haut.',
            staff: { notes: [60, 72], names: true },
            sound: [60, 72],
          },
          {
            text: 'Entre les deux, chaque note monte d’une marche : Do, Ré, Mi, Fa, Sol, La, Si, Do. Huit marches : une octave !',
            staff: { notes: WHITE_C4_C5, names: true },
            sound: WHITE_C4_C5,
          },
          {
            text: 'Ré aigu et Mi aigu sont juste au-dessus du Do aigu, sur la portée et sur le piano.',
            staff: { notes: [72, 74, 76], names: true },
            kb: { range: [C4, 79], targets: [72, 74, 76], label: true },
            sound: [72, 74, 76],
          },
          {
            text: 'À toi : joue le Do du milieu, puis le Do aigu !',
            kb: { range: [C4, 79], targets: [60, 72], label: true },
            try: { seq: [0, 0], prompt: 'Do, puis Do aigu' },
          },
        ],
      },
      {
        id: 'p19-staff',
        type: 'playnote',
        title: 'Lis la bonne octave',
        notes: [60, 62, 64, 72, 74, 76],
        display: 'staff',
        exact: true,
      },
      { id: 'p19-song2', type: 'song', title: 'Chanson : la souris, la maman et l’ours', song: 'clair-octaves' },
      {
        id: 'p19-rain',
        type: 'rain',
        title: '🌠 Pluie de notes : Frère Jacques en écho',
        song: 'frere-echo',
        speed: 'lapin',
        exact: true,
      },
    ],
  },
  {
    id: 'mystery',
    name: 'Planète Mystère',
    desc: 'Une surprise t’attend…',
    look: 'mystery',
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
