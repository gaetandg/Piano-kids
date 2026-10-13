// Choix de l'enfant (« Qui joue ? ») et création / modification d'un profil.
import { h, mascot } from '../ui.js';
import * as state from '../state.js';
import { go, back } from '../router.js';
import { say } from '../speech.js';
import { sfxClick, unlockAudio } from '../audio.js';

export const AVATARS = ['🧑‍🚀', '👩‍🚀', '👨‍🚀', '👽', '🤖', '🦊', '🐱', '🐼', '🦄', '🐶', '🐸', '🐵', '🦁', '🐙', '🦖', '🐧'];
export const COLORS = ['#ff4757', '#ff9f1c', '#ffd60a', '#2ed573', '#38c6f4', '#3d5afe', '#a55eea', '#ff6bcb'];

export function profilesScreen(app) {
  const list = state.profiles();
  if (!list.length) {
    go('editProfile', { first: true }, { replace: true });
    return;
  }
  const m = mascot('happy', 'medium float');
  const grid = h('div', { class: 'profile-grid' });
  list.forEach((p) => {
    const card = h(
      'button',
      {
        class: 'profile-card',
        onclick: () => {
          unlockAudio();
          sfxClick();
          state.setCurrent(p.id);
          go('hub');
        },
      },
      h('span', { class: 'avatar' }, p.avatar),
      h('span', { class: 'pname' }, p.name),
      h('span', { class: 'pstars' }, '⭐ ' + state.totalStars(p)),
    );
    card.style.setProperty('--pc', p.color);
    grid.append(card);
  });
  if (list.length < 6) {
    grid.append(
      h(
        'button',
        { class: 'profile-card add', onclick: () => go('editProfile', {}) },
        h('span', { class: 'avatar' }, '＋'),
        h('span', { class: 'pname' }, 'Nouvel astronaute'),
      ),
    );
  }
  app.append(
    h(
      'div',
      { class: 'page center-page' },
      h('h1', { class: 'logo' }, h('span', {}, 'Piano'), ' ', h('span', { class: 'logo-b' }, 'Cosmos')),
      m,
      h('p', { class: 'lead' }, 'Qui joue aujourd’hui ?'),
      grid,
      h('button', { class: 'btn ghost small parents-btn', onclick: () => go('parents') }, '⚙️ Espace parents'),
    ),
  );
}

export function editProfileScreen(app, params) {
  const editing = params.id ? state.profiles().find((p) => p.id === params.id) : null;
  let avatar = editing ? editing.avatar : AVATARS[state.profiles().length % AVATARS.length];
  let color = editing ? editing.color : COLORS[(state.profiles().length * 3) % COLORS.length];

  const input = h('input', {
    class: 'name-input',
    type: 'text',
    maxlength: 14,
    placeholder: 'Ton prénom',
    value: editing ? editing.name : '',
    autocomplete: 'off',
  });
  const preview = h('div', { class: 'avatar big' }, avatar);
  preview.style.setProperty('--pc', color);

  const avatars = h(
    'div',
    { class: 'pick-grid' },
    AVATARS.map((a) => {
      const b = h(
        'button',
        {
          class: 'pick' + (a === avatar ? ' on' : ''),
          onclick: () => {
            avatar = a;
            preview.textContent = a;
            avatars.querySelectorAll('.pick').forEach((x) => x.classList.toggle('on', x === b));
          },
        },
        a,
      );
      return b;
    }),
  );
  const colors = h(
    'div',
    { class: 'pick-grid colors' },
    COLORS.map((c) => {
      const b = h('button', {
        class: 'pick color' + (c === color ? ' on' : ''),
        'aria-label': 'couleur',
        onclick: () => {
          color = c;
          preview.style.setProperty('--pc', c);
          colors.querySelectorAll('.pick').forEach((x) => x.classList.toggle('on', x === b));
        },
      });
      b.style.background = c;
      return b;
    }),
  );

  const save = () => {
    const name = input.value.trim();
    if (!name) {
      input.focus();
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
      return;
    }
    unlockAudio();
    if (editing) {
      state.updateProfile(editing.id, { name, avatar, color });
      back('parents');
    } else {
      const p = state.createProfile(name, avatar, color);
      state.setCurrent(p.id);
      go('hub', {}, { replace: true });
    }
  };

  const title = editing ? 'Modifier le profil' : params.first ? 'Bienvenue à bord !' : 'Nouvel astronaute';
  const intro = params.first
    ? 'Bonjour ! Je suis Cosmo. Comment tu t’appelles ?'
    : editing
      ? 'Tu peux changer le prénom, l’avatar et la couleur.'
      : 'Comment tu t’appelles ?';

  app.append(
    h(
      'div',
      { class: 'page center-page' },
      !params.first ? h('button', { class: 'icon-btn top-left', onclick: () => back('profiles') }, '←') : null,
      h('h1', { class: 'title' }, title),
      h('div', { class: 'talk inline' }, mascot('happy', 'small'), h('div', { class: 'bubble' }, intro)),
      preview,
      input,
      h('h3', {}, 'Choisis ton avatar'),
      avatars,
      h('h3', {}, 'Ta couleur'),
      colors,
      h('button', { class: 'btn primary big', onclick: save }, editing ? 'Enregistrer' : 'C’est parti ! 🚀'),
      params.first ? h('p', { class: 'small-help' }, 'Vous pourrez créer un profil pour chaque enfant.') : null,
    ),
  );
  if (params.first) setTimeout(() => say(intro), 300);
}
