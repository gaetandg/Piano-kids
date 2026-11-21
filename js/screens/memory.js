// « Mémory musical » : retrouver les paires d'autocollants ; chaque paire a sa note.
// Mode « yeux » : on voit l'autocollant et on entend la note.
// Mode « oreilles » : on n'entend que la note ; l'autocollant apparaît quand la paire est trouvée.
// Chaque mode a quatre niveaux : plus de paires, et (aux oreilles) des notes de plus en plus proches.
import { h, starsRow, confetti, modal, wait } from '../ui.js';
import * as state from '../state.js';
import { go } from '../router.js';
import { STICKERS, packsAvailable } from '../rewards.js';
import { playNote, sfxSuccess, sfxBigSuccess, sfxStar } from '../audio.js';
import { noteColor, noteName, shuffle } from '../music.js';
import { packOpener, trophyLines } from './album.js';
import { markDay, newTrophies, markTrophiesSeen } from '../trophies.js';

export const MODES = {
  eyes: { icon: '👀', label: 'Avec les yeux', title: 'des yeux', help: 'Regarde les images et écoute les notes.' },
  ears: { icon: '👂', label: 'Avec les oreilles', title: 'des oreilles', help: 'Les images sont cachées : écoute bien !' },
};
export const TIERS = [
  { icon: '🐣', name: 'Facile' },
  { icon: '🦊', name: 'Moyen' },
  { icon: '🦁', name: 'Difficile' },
  { icon: '🐉', name: 'Expert' },
];
const SCALE = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76];
// three / two : nombre d'essais maximum pour 3 et 2 étoiles (réglés pour une très bonne mémoire)
// « eyes » et « ears » : les niveaux d'avant, gardés pour ne pas perdre les étoiles déjà gagnées
export const LEVELS = [
  { id: 'eyes-1', mode: 'eyes', tier: 0, pairs: 4, notes: SCALE, three: 6, two: 9 },
  { id: 'eyes', mode: 'eyes', tier: 1, pairs: 6, notes: SCALE, three: 10, two: 13 },
  { id: 'eyes-3', mode: 'eyes', tier: 2, pairs: 8, notes: SCALE, three: 13, two: 17 },
  { id: 'eyes-4', mode: 'eyes', tier: 3, pairs: 10, notes: SCALE, three: 17, two: 22 },
  // aux oreilles : d'abord des notes très éloignées, puis voisines (et Do / Do aigu pour finir)
  { id: 'ears-1', mode: 'ears', tier: 0, pairs: 3, notes: [60, 67, 76], three: 5, two: 7 },
  { id: 'ears', mode: 'ears', tier: 1, pairs: 4, notes: [60, 64, 67, 72], three: 7, two: 10 },
  { id: 'ears-3', mode: 'ears', tier: 2, pairs: 6, notes: [60, 62, 64, 67, 69, 72], three: 11, two: 15 },
  { id: 'ears-4', mode: 'ears', tier: 3, pairs: 8, notes: [60, 62, 64, 65, 67, 69, 71, 72], three: 15, two: 20 },
];
const findLevel = (id) => LEVELS.find((L) => L.id === id) || null;
const sameMode = (L) => LEVELS.filter((x) => x.mode === L.mode);
const nextLevel = (L) => sameMode(L).find((x) => x.tier === L.tier + 1) || null;

// Facile et Moyen sont ouverts ; les suivants s'ouvrent quand on a fini le niveau d'avant.
export function levelOpen(p, L) {
  const best = p.memoStars || {};
  if (L.tier <= 1 || state.settings().unlockAll || best[L.id]) return true;
  const prev = sameMode(L).find((x) => x.tier === L.tier - 1);
  return !!(prev && best[prev.id]);
}

// autocollants prêtés par Cosmo quand l'enfant n'en a pas encore assez
const LOANED = ['rocket', 'moon', 'saturn', 'alien', 'comet', 'ufo', 'astro', 'earth', 'sun', 'robot'];

// Le menu du Mémory (dans l'album).
export function memoryMenu(p) {
  const best = p.memoStars || {};
  const tile = (L) => {
    const T = TIERS[L.tier];
    const open = levelOpen(p, L);
    return h(
      'button',
      {
        class: 'memo-level' + (open ? '' : ' locked'),
        'data-level': L.id,
        onclick: () => (open ? go('memory', { level: L.id }) : null),
      },
      h('span', { class: 'memo-level-ic' }, open ? T.icon : '🔒'),
      h('b', {}, T.name),
      h('small', {}, `${L.pairs} paires`),
      open ? starsRow(best[L.id] || 0, 3, 'small') : h('small', { class: 'memo-lock' }, 'Finis le niveau d’avant'),
    );
  };
  return h(
    'div',
    { class: 'memo-menu' },
    h('p', { class: 'lead small' }, 'Retrouve les paires ! Chaque paire d’autocollants chante la même note. 🎵'),
    ...Object.entries(MODES).map(([mode, M]) =>
      h(
        'section',
        { class: 'memo-mode' },
        h(
          'div',
          { class: 'memo-mode-head' },
          h('span', { class: 'memo-mode-ic' }, M.icon),
          h('span', { class: 'memo-level-body' }, h('b', {}, M.label), h('small', {}, M.help)),
        ),
        h('div', { class: 'memo-levels' }, ...LEVELS.filter((L) => L.mode === mode).map(tile)),
      ),
    ),
  );
}

// Colonnes et rangées de la grille (téléphone debout / couché).
function gridShape(cards) {
  const cols = cards === 6 ? 3 : cards === 12 ? 3 : 4;
  const lrows = cards >= 16 ? 3 : 2; // couché : 3 rangées pour les grands niveaux, sinon les cartes sont trop petites
  return { cols, rows: Math.ceil(cards / cols), lcols: Math.ceil(cards / lrows), lrows };
}

export function memoryScreen(app, params) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });
  let L = findLevel(params.level);
  if (!L || !levelOpen(p, L)) L = LEVELS[1];
  const level = L.id;
  const M = MODES[L.mode];
  const T = TIERS[L.tier];
  const ears = L.mode === 'ears';

  // les paires : des autocollants de l'enfant (complétés par ceux de Cosmo), chacun avec sa note
  const own = shuffle(STICKERS.filter((s) => (p.stickers || []).includes(s.id)));
  const pool = [
    ...own,
    ...STICKERS.filter((s) => LOANED.includes(s.id) && !own.includes(s)),
    ...shuffle(STICKERS.filter((s) => !LOANED.includes(s.id) && !own.includes(s))),
  ];
  const notes = shuffle(L.notes.slice(0, L.pairs));
  const pairs = pool.slice(0, L.pairs).map((s, i) => ({ s, note: notes[i] }));
  const cards = shuffle([...pairs, ...pairs].map((pair, i) => ({ ...pair, key: i, open: false, found: false })));

  const toAlbum = () => go('album', { tab: 'memory' }, { replace: true });
  let tries = 0;
  let first = null;
  let lock = false;
  let alive = true;

  const triesEl = h('span', { class: 'chip' }, '🔁 0');
  const shape = gridShape(cards.length);
  const grid = h('div', { class: 'memo-grid' + (ears ? ' ears' : '') });
  Object.entries(shape).forEach(([k, v]) => grid.style.setProperty('--' + k, v));
  grid._cards = cards; // pour les tests automatiques
  const page = h(
    'div',
    { class: 'memo-page' },
    h(
      'div',
      { class: 'memo-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Quitter', onclick: () => toAlbum() }, '✕'),
      h('div', { class: 'memo-title' }, `${M.icon} Mémory ${M.title}`, h('small', {}, ` ${T.icon} ${T.name}`)),
      triesEl,
    ),
    grid,
  );

  function face(c) {
    // face visible : l'autocollant (sauf au mode oreilles tant que la paire n'est pas trouvée)
    if (ears && !c.found) return h('span', { class: 'memo-sound' }, '🔊');
    return h(
      'span',
      { class: 'memo-face-in' },
      h('span', { class: 'memo-e' }, c.s.e),
      h('span', { class: 'memo-note', style: { background: noteColor(c.note) } }, noteName(c.note)),
    );
  }

  function render() {
    grid.innerHTML = '';
    cards.forEach((c) => {
      const el = h(
        'button',
        {
          class: 'memo-card' + (c.open || c.found ? ' open' : '') + (c.found ? ' found' : ''),
          'aria-label': c.open || c.found ? c.s.name : 'Carte cachée',
          onclick: () => flip(c),
        },
        h('span', { class: 'memo-back' }, '🌟'),
        h('span', { class: 'memo-face' }, face(c)),
      );
      if (c.found || (!ears && c.open)) el.style.setProperty('--nc', noteColor(c.note));
      c.el = el;
      grid.append(el);
    });
  }

  async function flip(c) {
    if (lock || c.open || c.found || !alive) return;
    c.open = true;
    playNote(c.note, { dur: 0.9 });
    render();
    if (!first) {
      first = c;
      return;
    }
    tries++;
    triesEl.textContent = `🔁 ${tries}`;
    const a = first;
    first = null;
    if (a.s.id === c.s.id) {
      a.found = c.found = true;
      await wait(350);
      sfxSuccess();
      render();
      if (cards.every((x) => x.found)) end();
      return;
    }
    lock = true;
    await wait(ears ? 1200 : 950);
    if (!alive) return;
    a.open = c.open = false;
    lock = false;
    render();
  }

  async function end() {
    await wait(500);
    if (!alive) return;
    const stars = tries <= L.three ? 3 : tries <= L.two ? 2 : 1;
    const before = packsAvailable(p);
    const best = { ...(p.memoStars || {}) };
    const wasOpen = nextLevel(L) && levelOpen(p, nextLevel(L));
    best[level] = Math.max(best[level] || 0, stars);
    state.updateProfile(p.id, { memoStars: best });
    markDay(p);
    const newPacks = packsAvailable(p) - before;
    const next = nextLevel(L);
    // la mélodie des paires trouvées (de la plus grave à la plus aiguë), en récompense
    [...notes].sort((x, y) => x - y).forEach((n, i) => playNote(n, { when: i * 0.18, dur: 0.4 }));
    const starEl = starsRow(0, 3, 'big');
    const prize = h('div', { class: 'sticker-new-box' });
    if (next && !wasOpen)
      prize.append(h('p', { class: 'memo-unlock' }, `🔓 Nouveau niveau : ${TIERS[next.tier].icon} ${TIERS[next.tier].name} !`));
    const m = modal(
      h(
        'div',
        { class: 'result' },
        h('h2', {}, stars === 3 ? 'Mémoire d’éléphant ! 🐘' : 'Bravo, tout est trouvé !'),
        h('p', {}, `${T.icon} ${T.name} : ${L.pairs} paires en ${tries} essais.`),
        starEl,
        prize,
        h(
          'div',
          { class: 'result-buttons' },
          h(
            'button',
            { class: 'btn ghost', onclick: () => (m.close(), go('memory', { level }, { replace: true })) },
            '↺ Rejouer',
          ),
          next
            ? h(
                'button',
                { class: 'btn primary', onclick: () => (m.close(), go('memory', { level: next.id }, { replace: true })) },
                `${TIERS[next.tier].icon} Niveau suivant`,
              )
            : h('button', { class: 'btn primary', onclick: () => (m.close(), toAlbum()) }, '🃏 Album'),
        ),
      ),
      { dismissable: false },
    );
    for (let i = 0; i < 3; i++) {
      await wait(350);
      if (i < stars) {
        starEl.children[i].classList.add('on', 'pop');
        sfxStar(i);
      }
    }
    if (stars === 3) {
      confetti();
      sfxBigSuccess();
    }
    const tr = newTrophies(p);
    markTrophiesSeen(p, tr.slice(0, 2));
    if (tr.length) prize.append(trophyLines(tr));
    if (newPacks > 0) prize.append(h('div', { class: 'packs-title' }, '🎁 Tu as gagné une pochette surprise !'), packOpener());
  }

  render();
  app.append(page);
  return {
    destroy() {
      alive = false;
    },
  };
}
