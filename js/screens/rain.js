// Menu de la « Pluie de notes » : choisir la vitesse et la chanson, voir ses records.
import { h, starsRow } from '../ui.js';
import * as state from '../state.js';
import { go } from '../router.js';
import { SONGS } from '../songs.js';
import { planetUnlocked, findPlanet } from '../curriculum.js';
import { SPEEDS } from '../games/rain.js';
import { topBar, bottomNav } from './hub.js';

export function rainScreen(app) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });
  const s = state.settings();
  let speed = SPEEDS[p.rainSpeed] ? p.rainSpeed : 'tortue';

  const speedRow = h('div', { class: 'speed-row' });
  const list = h('div', { class: 'song-list' });
  const help = h('p', { class: 'lead small' });

  function renderSpeeds() {
    speedRow.innerHTML = '';
    for (const [id, sp] of Object.entries(SPEEDS)) {
      speedRow.append(
        h(
          'button',
          {
            class: 'speed-chip' + (id === speed ? ' on' : ''),
            onclick: () => {
              speed = id;
              state.updateProfile(p.id, { rainSpeed: id });
              render();
            },
          },
          h('span', { class: 'speed-ic' }, sp.icon),
          h('span', {}, sp.label),
        ),
      );
    }
    help.textContent =
      speed === 'tortue'
        ? '🐢 Les notes t’attendent sur la ligne jaune : prends ton temps !'
        : speed === 'lapin'
          ? '🐇 Les notes tombent doucement : joue-les quand elles touchent la ligne.'
          : '🚀 Ça va vite ! Pour les champions du rythme.';
  }

  function card(id, song, unlocked, lockText) {
    const rec = ((p.rain || {})[id] || {})[speed];
    return h(
      'button',
      {
        class: 'song-card' + (unlocked ? '' : ' locked'),
        onclick: () => unlocked && go('game', { rain: id, speed }),
      },
      h('span', { class: 'song-emoji' }, unlocked ? song.emoji : '🔒'),
      h(
        'span',
        { class: 'song-body' },
        h('span', { class: 'song-name' }, song.title),
        h('span', { class: 'song-meta' }, unlocked ? (rec ? `🏆 ${rec.score} points` : 'Pas encore joué') : lockText),
      ),
      unlocked && rec ? starsRow(rec.stars, 3, 'small') : null,
    );
  }

  function render() {
    renderSpeeds();
    list.innerHTML = '';
    // d'abord ce qu'on peut jouer, puis ses compositions, puis les chansons encore verrouillées
    const songs = SONGS.filter((song) => findPlanet(song.planet));
    const open = songs.filter((song) => planetUnlocked(p, song.planet, s.unlockAll));
    open.forEach((song) => list.append(card(song.id, song, true, '')));
    (p.compositions || []).forEach((c, i) => {
      list.append(card(`comp:${i}`, { title: `Ma chanson n° ${(p.compositions || []).length - i}`, emoji: '✍️' }, true, ''));
    });
    songs
      .filter((song) => !open.includes(song))
      .forEach((song) => list.append(card(song.id, song, false, 'Débloquée sur la ' + findPlanet(song.planet).name)));
  }

  render();
  app.append(
    h(
      'div',
      { class: 'page with-nav' },
      topBar(p, { title: 'Pluie de notes' }),
      h('p', { class: 'lead small' }, 'Les notes tombent du ciel : attrape-les avec ton piano ! 🌠'),
      speedRow,
      help,
      list,
    ),
    bottomNav('rain'),
  );
}
