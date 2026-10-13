// La carte de la galaxie (planètes) et l'écran d'une planète (missions).
import { h, mascot, starsRow } from '../ui.js';
import * as state from '../state.js';
import { go, back } from '../router.js';
import { PLANETS, findPlanet, planetUnlocked, missionUnlocked, planetProgress, isDone, currentMission } from '../curriculum.js';
import { planetEl } from '../games/art.js';
import { starsToNextSticker } from '../rewards.js';

export function topBar(p, { title = null, onBack = null } = {}) {
  return h(
    'div',
    { class: 'topbar' },
    onBack
      ? h('button', { class: 'icon-btn', onclick: onBack, 'aria-label': 'Retour' }, '←')
      : h(
          'button',
          { class: 'me', onclick: () => go('profiles') },
          h('span', { class: 'avatar sm', style: { '--pc': p.color } }, p.avatar),
          h('span', {}, p.name),
        ),
    title ? h('div', { class: 'topbar-title' }, title) : h('span', { class: 'spacer' }),
    h('div', { class: 'chip' }, '⭐ ', state.totalStars(p)),
  );
}

export function bottomNav(active) {
  const items = [
    ['hub', '🚀', 'Voyage'],
    ['songs', '🎵', 'Chansons'],
    ['free', '🎹', 'Piano libre'],
    ['album', '🏆', 'Album'],
  ];
  return h(
    'nav',
    { class: 'bottom-nav' },
    items.map(([name, icon, label]) =>
      h(
        'button',
        { class: name === active ? 'on' : '', onclick: () => name !== active && go(name, {}, { replace: true }) },
        h('span', { class: 'nav-ic' }, icon),
        h('span', {}, label),
      ),
    ),
  );
}

export function hubScreen(app) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });
  const s = state.settings();
  const cur = currentMission(p, s.unlockAll);

  const page = h('div', { class: 'page with-nav' });
  page.append(topBar(p));

  // Message de Cosmo
  const toNext = starsToNextSticker(p);
  const msg = cur
    ? state.totalStars(p) === 0 && !Object.keys(p.done || {}).length
      ? `Bonjour ${p.name} ! Prêt pour le décollage ? Appuie sur la première planète !`
      : `Salut ${p.name} ! On continue le voyage ?`
    : `Bravo ${p.name}, tu as visité toutes les planètes ! Rejoue tes chansons préférées 🎵`;
  page.append(
    h(
      'div',
      { class: 'talk inline' },
      mascot('happy', 'small float'),
      h(
        'div',
        { class: 'bubble' },
        msg,
        toNext ? h('div', { class: 'bubble-sub' }, `Encore ${toNext} ⭐ pour un nouvel autocollant !`) : null,
      ),
    ),
  );

  if (!s.stickerGuideSeen) {
    page.append(
      h(
        'button',
        { class: 'banner', onclick: () => go('stickerGuide') },
        h('span', { class: 'banner-ic' }, '🎨'),
        h('span', {}, h('b', {}, 'Prépare ton piano !'), h('br'), 'Colle des gommettes de couleur sur les touches.'),
      ),
    );
  }

  if (cur) {
    page.append(
      h(
        'button',
        { class: 'btn primary big continue', onclick: () => go('game', { mission: cur.id }) },
        '▶ Continuer : ',
        cur.title,
      ),
    );
  }

  const path = h('div', { class: 'galaxy' });
  PLANETS.forEach((pl, i) => {
    const unlocked = planetUnlocked(p, pl.id, s.unlockAll);
    const prog = planetProgress(p, pl);
    const complete = prog.total > 0 && prog.done === prog.total;
    const card = h(
      'button',
      {
        class: 'planet-card' + (unlocked ? '' : ' locked') + (complete ? ' complete' : '') + (i % 2 ? ' right' : ' left'),
        onclick: () => unlocked && go('planet', { planet: pl.id }),
      },
      planetEl(pl.look, 86, !unlocked),
      h(
        'div',
        { class: 'planet-info' },
        h('div', { class: 'planet-name' }, pl.name),
        h('div', { class: 'planet-desc' }, pl.desc),
        pl.comingSoon
          ? h('div', { class: 'planet-prog soon' }, '🔭 Bientôt !')
          : unlocked
            ? h('div', { class: 'planet-prog' }, complete ? '✅ ' : '', `⭐ ${prog.stars} / ${prog.max}`)
            : h('div', { class: 'planet-prog' }, '🔒 Termine la planète d’avant'),
      ),
    );
    path.append(card);
  });
  page.append(path);
  app.append(page, bottomNav('hub'));

  // fait défiler jusqu'à la planète en cours
  if (cur) {
    const idx = PLANETS.findIndex((pl) => pl.id === cur.planetId);
    const el = path.children[idx];
    if (el && idx > 1) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 200);
  }
}

const TYPE_ICONS = {
  intro: '📖',
  highlow: '👂',
  findkey: '🎯',
  namenote: '🔤',
  playnote: '🚀',
  simon: '👽',
  song: '🎵',
  rhythm: '🥁',
};

export function planetScreen(app, params) {
  const p = state.currentProfile();
  const pl = findPlanet(params.planet);
  if (!p || !pl) return go('hub', {}, { replace: true });
  const s = state.settings();
  const prog = planetProgress(p, pl);

  const page = h('div', { class: 'page' });
  page.append(topBar(p, { title: pl.name, onBack: () => back('hub') }));
  page.append(
    h(
      'div',
      { class: 'planet-hero' },
      planetEl(pl.look, 110),
      h('div', {}, h('h2', {}, pl.name), h('p', {}, pl.desc), h('p', { class: 'chip' }, `⭐ ${prog.stars} / ${prog.max}`)),
    ),
  );

  const list = h('div', { class: 'missions' });
  let firstOpen = null;
  pl.missions.forEach((m, i) => {
    const unlocked = missionUnlocked(p, m.id, s.unlockAll);
    const done = isDone(p, m.id);
    const stars = (p.stars || {})[m.id] || 0;
    if (unlocked && !done && !firstOpen) firstOpen = m.id;
    const node = h(
      'button',
      {
        class:
          'mission' +
          (unlocked ? '' : ' locked') +
          (done ? ' done' : '') +
          (m.id === firstOpen ? ' next' : '') +
          (i % 2 ? ' odd' : ''),
        onclick: () => unlocked && go('game', { mission: m.id }),
      },
      h('span', { class: 'mission-ic' }, unlocked ? TYPE_ICONS[m.type] || '⭐' : '🔒'),
      h(
        'span',
        { class: 'mission-body' },
        h('span', { class: 'mission-title' }, m.title),
        m.type === 'intro' ? h('span', { class: 'mission-sub' }, done ? '✅ Vu' : 'Découverte') : starsRow(stars, 3, 'small'),
      ),
      m.id === firstOpen ? h('span', { class: 'go-tag' }, 'À toi !') : null,
    );
    list.append(node);
  });
  page.append(list);
  app.append(page);
}
