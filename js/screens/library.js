// Bibliothèque de chansons et album d'autocollants.
import { h, starsRow, mascot } from '../ui.js';
import * as state from '../state.js';
import { go } from '../router.js';
import { SONGS } from '../songs.js';
import { planetUnlocked, findPlanet } from '../curriculum.js';
import { STICKERS, starsToNextSticker } from '../rewards.js';
import { topBar, bottomNav } from './hub.js';
import { noteColor, pc } from '../music.js';

export function songsScreen(app) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });
  const s = state.settings();
  const list = h('div', { class: 'song-list' });
  SONGS.forEach((song) => {
    const unlocked = planetUnlocked(p, song.planet, s.unlockAll);
    const stars = (p.songStars || {})[song.id] || 0;
    const pcs = [...new Set(song.notes.map((n) => pc(n.midi)))].sort((a, b) => a - b);
    const card = h(
      'button',
      { class: 'song-card' + (unlocked ? '' : ' locked'), onclick: () => unlocked && go('game', { song: song.id }) },
      h('span', { class: 'song-emoji' }, unlocked ? song.emoji : '🔒'),
      h(
        'span',
        { class: 'song-body' },
        h('span', { class: 'song-name' }, song.title),
        unlocked
          ? h(
              'span',
              { class: 'song-meta' },
              h('span', { class: 'level' }, 'Niveau ' + song.level),
              h(
                'span',
                { class: 'mini-dots' },
                pcs.map((x) => h('i', { style: { background: noteColor(x + 60) } })),
              ),
            )
          : h('span', { class: 'song-meta' }, 'Débloquée sur la ' + findPlanet(song.planet).name),
      ),
      unlocked ? starsRow(stars, 3, 'small') : null,
    );
    list.append(card);
  });
  app.append(
    h(
      'div',
      { class: 'page with-nav' },
      topBar(p, { title: 'Chansons' }),
      h('p', { class: 'lead small' }, 'Choisis une chanson à jouer 🎶'),
      list,
    ),
    bottomNav('songs'),
  );
}

export function albumScreen(app) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });
  const have = new Set(p.stickers || []);
  const toNext = starsToNextSticker(p);
  const grid = h(
    'div',
    { class: 'album' },
    STICKERS.map((s) =>
      have.has(s.id)
        ? h('div', { class: 'sticker on' }, h('span', { class: 'sticker-e' }, s.e), h('span', { class: 'sticker-n' }, s.name))
        : h('div', { class: 'sticker' }, h('span', { class: 'sticker-e' }, '?'), h('span', { class: 'sticker-n' }, '???')),
    ),
  );
  app.append(
    h(
      'div',
      { class: 'page with-nav' },
      topBar(p, { title: 'Mon album' }),
      h(
        'div',
        { class: 'talk inline' },
        mascot('excited', 'small'),
        h(
          'div',
          { class: 'bubble' },
          `Tu as ${have.size} autocollant${have.size > 1 ? 's' : ''} sur ${STICKERS.length} !`,
          toNext ? h('div', { class: 'bubble-sub' }, `Gagne encore ${toNext} ⭐ pour le prochain.`) : null,
        ),
      ),
      grid,
    ),
    bottomNav('album'),
  );
}
