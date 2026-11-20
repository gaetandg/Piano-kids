// « Mémory musical » : retrouver les paires d'autocollants ; chaque paire a sa note.
// Niveau « yeux » : on voit l'autocollant et on entend la note.
// Niveau « oreilles » : on n'entend que la note ; l'autocollant apparaît quand la paire est trouvée.
import { h, starsRow, confetti, modal, wait } from '../ui.js';
import * as state from '../state.js';
import { go } from '../router.js';
import { STICKERS, packsAvailable } from '../rewards.js';
import { playNote, sfxSuccess, sfxBigSuccess, sfxStar } from '../audio.js';
import { noteColor, noteName, shuffle } from '../music.js';
import { packOpener, trophyLines } from './album.js';
import { markDay, newTrophies, markTrophiesSeen } from '../trophies.js';

export const LEVELS = {
  eyes: { icon: '👀', label: 'Avec les yeux', pairs: 6, notes: [60, 62, 64, 65, 67, 69], three: 10, two: 14 },
  ears: { icon: '👂', label: 'Avec les oreilles', pairs: 4, notes: [60, 64, 67, 72], three: 7, two: 10 },
};
// autocollants prêtés par Cosmo quand l'enfant n'en a pas encore assez
const LOANED = ['rocket', 'moon', 'saturn', 'alien', 'comet', 'ufo'];

// Le menu du Mémory (dans l'album).
export function memoryMenu(p) {
  const best = p.memoStars || {};
  return h(
    'div',
    { class: 'memo-menu' },
    h('p', { class: 'lead small' }, 'Retrouve les paires ! Chaque paire d’autocollants chante la même note. 🎵'),
    ...Object.entries(LEVELS).map(([id, L]) =>
      h(
        'button',
        { class: 'memo-level', onclick: () => go('memory', { level: id }) },
        h('span', { class: 'memo-level-ic' }, L.icon),
        h(
          'span',
          { class: 'memo-level-body' },
          h('b', {}, L.label),
          h(
            'small',
            {},
            id === 'eyes'
              ? `${L.pairs} paires : regarde et écoute`
              : `${L.pairs} paires : écoute bien, les images sont cachées !`,
          ),
        ),
        starsRow(best[id] || 0, 3, 'small'),
      ),
    ),
  );
}

export function memoryScreen(app, params) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });
  const level = LEVELS[params.level] ? params.level : 'eyes';
  const L = LEVELS[level];
  const ears = level === 'ears';

  // les paires : des autocollants de l'enfant (complétés par ceux de Cosmo), chacun avec sa note
  const own = shuffle(STICKERS.filter((s) => (p.stickers || []).includes(s.id)));
  const pool = [...own, ...STICKERS.filter((s) => LOANED.includes(s.id) && !own.includes(s))];
  const pairs = pool.slice(0, L.pairs).map((s, i) => ({ s, note: L.notes[i] }));
  const cards = shuffle([...pairs, ...pairs].map((pair, i) => ({ ...pair, key: i, open: false, found: false })));

  const toAlbum = () => go('album', { tab: 'memory' }, { replace: true });
  let tries = 0;
  let first = null;
  let lock = false;
  let alive = true;

  const triesEl = h('span', { class: 'chip' }, '🔁 0');
  const grid = h('div', { class: 'memo-grid' + (ears ? ' ears' : '') });
  grid._cards = cards; // pour les tests automatiques
  const page = h(
    'div',
    { class: 'memo-page' },
    h(
      'div',
      { class: 'memo-head' },
      h('button', { class: 'icon-btn', 'aria-label': 'Quitter', onclick: () => toAlbum() }, '✕'),
      h('div', { class: 'memo-title' }, `${L.icon} Mémory ${ears ? 'des oreilles' : 'des yeux'}`),
      triesEl,
    ),
    grid,
  );

  function face(c) {
    // face visible : l'autocollant (sauf au niveau oreilles tant que la paire n'est pas trouvée)
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
    best[level] = Math.max(best[level] || 0, stars);
    state.updateProfile(p.id, { memoStars: best });
    markDay(p);
    const newPacks = packsAvailable(p) - before;
    // la mélodie des paires trouvées, en récompense
    pairs.forEach((pair, i) => playNote(pair.note, { when: i * 0.18, dur: 0.4 }));
    const starEl = starsRow(0, 3, 'big');
    const prize = h('div', { class: 'sticker-new-box' });
    const m = modal(
      h(
        'div',
        { class: 'result' },
        h('h2', {}, stars === 3 ? 'Mémoire d’éléphant ! 🐘' : 'Bravo, tout est trouvé !'),
        h('p', {}, `${L.pairs} paires en ${tries} essais.`),
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
          h('button', { class: 'btn primary', onclick: () => (m.close(), toAlbum()) }, '🃏 Album'),
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
