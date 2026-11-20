// Album : les autocollants et les pochettes surprises, « Ma planète » à décorer, le Mémory.
import { h, mascot, confetti, modal, wait } from '../ui.js';
import * as state from '../state.js';
import { go } from '../router.js';
import { STICKERS, packsAvailable, openPack, starsToNextPack } from '../rewards.js';
import { sfxWhoosh, sfxStar, sfxBigSuccess } from '../audio.js';
import { topBar, bottomNav } from './hub.js';
import { decoPanel } from './deco.js';
import { memoryMenu } from './memory.js';

// Onglets de l'album
const TABS = [
  ['stickers', '🌟', 'Autocollants'],
  ['deco', '🪐', 'Ma planète'],
  ['memory', '🃏', 'Mémory'],
];

// Un autocollant (grand), avec ses badges « Nouveau » / « Brillant ».
export function stickerCard(s, { shiny = false, isNew = false } = {}) {
  return h(
    'div',
    { class: 'reveal-card' + (shiny ? ' shiny' : '') },
    h('span', { class: 'reveal-e' }, s.e),
    h('span', { class: 'reveal-n' }, s.name),
    h(
      'span',
      { class: 'reveal-tags' },
      isNew ? h('span', { class: 'tag new' }, 'Nouveau !') : null,
      shiny ? h('span', { class: 'tag glitter' }, '✨ Brillant !') : null,
    ),
  );
}

// Une pochette à toucher : elle tremble, s'ouvre, et l'autocollant apparaît.
// onOpened(result) est appelé après l'animation.
export function packOpener({ onOpened } = {}) {
  const wrap = h('div', { class: 'pack-zone' });
  const pack = h(
    'button',
    { class: 'pack', 'aria-label': 'Ouvrir la pochette' },
    h('span', { class: 'pack-star' }, '🌟'),
    h('span', { class: 'pack-label' }, 'Pochette surprise'),
    h('span', { class: 'pack-tap' }, 'Touche-moi !'),
  );
  let busy = false;
  pack.addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    const res = openPack();
    if (!res) return;
    sfxWhoosh();
    pack.classList.add('shake');
    await wait(700);
    pack.classList.add('burst');
    await wait(260);
    wrap.innerHTML = '';
    wrap.append(stickerCard(res.sticker, res));
    if (res.shiny) {
      sfxBigSuccess();
      confetti(60);
    } else sfxStar(2);
    if (onOpened) onOpened(res);
  });
  wrap.append(pack);
  return wrap;
}

export function albumScreen(app, params = {}) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });
  let tab = TABS.some((t) => t[0] === params.tab) ? params.tab : 'stickers';

  const top = h('div', { class: 'talk inline' });
  const packs = h('div', { class: 'packs' });
  const grid = h('div', { class: 'album' });
  let fresh = null; // dernier autocollant obtenu (mis en avant)

  function renderTalk() {
    const have = (p.stickers || []).length;
    const shiny = (p.shiny || []).length;
    const toNext = starsToNextPack(p);
    top.innerHTML = '';
    top.append(
      mascot('excited', 'small'),
      h(
        'div',
        { class: 'bubble' },
        `Tu as ${have} autocollant${have > 1 ? 's' : ''} sur ${STICKERS.length}${shiny ? `, dont ${shiny} brillant${shiny > 1 ? 's' : ''} ✨` : ''} !`,
        toNext ? h('div', { class: 'bubble-sub' }, `Encore ${toNext} ⭐ pour une pochette surprise.`) : null,
      ),
    );
  }

  function renderPacks() {
    packs.innerHTML = '';
    const n = packsAvailable(p);
    if (!n) return;
    packs.append(
      h('div', { class: 'packs-title' }, n > 1 ? `🎁 Tu as ${n} pochettes à ouvrir !` : '🎁 Tu as une pochette à ouvrir !'),
      packOpener({
        onOpened: (res) => {
          fresh = res.sticker.id;
          packs.firstChild.textContent = res.shiny ? '🎉 Un autocollant brillant !' : '🎉 Voici ton autocollant !';
          renderTalk();
          renderGrid();
          const left = packsAvailable(p);
          // la pastille de l'onglet Album suit le nombre de pochettes restantes
          const badge = document.querySelector('.bottom-nav .nav-badge');
          if (badge) {
            if (left) badge.textContent = left;
            else badge.remove();
          }
          packs.append(
            h(
              'button',
              { class: 'btn primary', onclick: () => renderPacks() },
              left ? `Ouvrir la suivante 🎁 (${left})` : 'Super ! ✓',
            ),
          );
        },
      }),
    );
  }

  function zoom(s) {
    const shiny = (p.shiny || []).includes(s.id);
    const m = modal(
      h(
        'div',
        { class: 'sticker-zoom' },
        stickerCard(s, { shiny }),
        h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Fermer'),
      ),
    );
  }

  function renderGrid() {
    const have = new Set(p.stickers || []);
    const shiny = new Set(p.shiny || []);
    grid.innerHTML = '';
    for (const s of STICKERS) {
      if (!have.has(s.id)) {
        grid.append(
          h('div', { class: 'sticker' }, h('span', { class: 'sticker-e' }, '?'), h('span', { class: 'sticker-n' }, '???')),
        );
        continue;
      }
      grid.append(
        h(
          'button',
          {
            class: 'sticker on' + (shiny.has(s.id) ? ' shiny' : '') + (s.id === fresh ? ' fresh' : ''),
            onclick: () => zoom(s),
          },
          h('span', { class: 'sticker-e' }, s.e),
          h('span', { class: 'sticker-n' }, s.name),
        ),
      );
    }
  }

  const tabsBar = h('div', { class: 'tabs' });
  const body = h('div', { class: 'tab-body' });
  function renderTabs() {
    tabsBar.innerHTML = '';
    for (const [id, ic, label] of TABS) {
      tabsBar.append(
        h(
          'button',
          {
            class: 'tab' + (id === tab ? ' on' : ''),
            onclick: () => {
              if (id === tab) return;
              tab = id;
              renderTabs();
              renderBody();
            },
          },
          h('span', { class: 'tab-ic' }, ic),
          h('span', {}, label),
        ),
      );
    }
  }
  function renderBody() {
    body.innerHTML = '';
    if (tab === 'deco') {
      body.append(decoPanel(p));
      return;
    }
    if (tab === 'memory') {
      body.append(memoryMenu(p));
      return;
    }
    renderTalk();
    renderPacks();
    renderGrid();
    body.append(top, packs, grid);
  }

  renderTabs();
  renderBody();
  app.append(h('div', { class: 'page with-nav' }, topBar(p, { title: 'Mon album' }), tabsBar, body), bottomNav('album'));
}
