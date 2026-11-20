// « Ma planète » : chaque enfant décore sa planète avec ses autocollants.
// Positions en fraction de la scène (0 à 1), taille relative à la largeur : la scène peut être affichée
// en grand (pour décorer) ou en petit (sur la carte du voyage).
import { h, toast, confirmBox } from '../ui.js';
import * as state from '../state.js';
import { STICKERS, findSticker } from '../rewards.js';
import { PLANETS, planetUnlocked } from '../curriculum.js';
import { sfxClick, sfxWhoosh } from '../audio.js';

const MAX_ITEMS = 40;

export function decoOf(p) {
  const d = p.deco || {};
  return { look: d.look || 'earth', items: Array.isArray(d.items) ? d.items : [] };
}

// La scène (étoiles, planète, autocollants). Avec interactive, les autocollants se touchent et se déplacent.
export function decoScene(p, { mini = false } = {}) {
  const d = decoOf(p);
  const shiny = new Set(p.shiny || []);
  const scene = h('div', { class: 'deco-scene' + (mini ? ' mini' : '') });
  scene.append(h('div', { class: `planet planet-${d.look} deco-planet` }));
  d.items.forEach((it, i) => {
    const s = findSticker(it.id);
    if (!s) return;
    scene.append(itemEl(it, s, i, shiny.has(it.id)));
  });
  return scene;
}

function itemEl(it, s, i, shiny) {
  const el = h('span', { class: 'deco-item' + (shiny ? ' glow' : ''), 'data-i': i }, s.e);
  place(el, it);
  return el;
}

function place(el, it) {
  el.style.left = it.x * 100 + '%';
  el.style.top = it.y * 100 + '%';
  el.style.setProperty('--s', it.s);
  el.style.transform = `translate(-50%, -50%) rotate(${it.r || 0}deg)`;
}

// Le panneau de décoration (dans l'album).
export function decoPanel(p) {
  const s = state.settings();
  let d = decoOf(p);
  let sel = -1;

  const panel = h('div', { class: 'deco-panel' });
  const sceneBox = h('div', { class: 'deco-box' });
  const tools = h('div', { class: 'deco-tools' });
  const tray = h('div', { class: 'deco-tray' });
  const looks = h('div', { class: 'deco-looks' });
  // à droite de la scène quand le téléphone est à l'horizontale
  const side = h(
    'div',
    { class: 'deco-side' },
    tools,
    h('div', { class: 'deco-label' }, 'Touche un autocollant pour le coller :'),
    tray,
    h('div', { class: 'deco-label' }, 'Choisis ta planète :'),
    looks,
  );
  panel.append(sceneBox, side);

  const save = () => {
    state.updateProfile(p.id, { deco: { look: d.look, items: d.items } });
  };

  let scene = null;
  function renderScene() {
    sceneBox.innerHTML = '';
    scene = decoScene(p, {});
    sceneBox.append(scene);
    scene.querySelectorAll('.deco-item').forEach((el) => {
      const i = +el.dataset.i;
      if (i === sel) el.classList.add('sel');
      el.addEventListener('pointerdown', (e) => startDrag(e, i, el));
    });
    scene.addEventListener('pointerdown', (e) => {
      if (e.target === scene || e.target.classList.contains('deco-planet')) select(-1);
    });
    renderTools();
  }

  // déplacer un autocollant avec le doigt
  function startDrag(e, i, el) {
    e.preventDefault();
    e.stopPropagation();
    select(i, false);
    scene.querySelectorAll('.deco-item').forEach((x) => x.classList.toggle('sel', +x.dataset.i === i));
    const r = scene.getBoundingClientRect();
    const it = d.items[i];
    const dx = e.clientX - (r.left + it.x * r.width);
    const dy = e.clientY - (r.top + it.y * r.height);
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      /* ignoré */
    }
    const move = (ev) => {
      it.x = Math.min(0.98, Math.max(0.02, (ev.clientX - dx - r.left) / r.width));
      it.y = Math.min(0.98, Math.max(0.02, (ev.clientY - dy - r.top) / r.height));
      place(el, it);
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      save();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function select(i, rerender = true) {
    sel = i;
    if (rerender) renderScene();
    else renderTools();
  }

  function change(fn) {
    if (sel < 0) return;
    fn(d.items[sel]);
    save();
    renderScene();
  }

  function renderTools() {
    tools.innerHTML = '';
    if (sel < 0) {
      tools.append(
        h('span', { class: 'deco-hint' }, d.items.length ? 'Touche un autocollant de ta planète pour le changer.' : ''),
        d.items.length
          ? h(
              'button',
              {
                class: 'btn ghost small',
                onclick: async () => {
                  if (!(await confirmBox('Enlever tous les autocollants de ta planète ?', 'Oui, tout enlever'))) return;
                  d.items = [];
                  save();
                  renderScene();
                },
              },
              '🧹 Tout enlever',
            )
          : null,
      );
      return;
    }
    const btn = (label, aria, fn) => h('button', { class: 'deco-btn', 'aria-label': aria, onclick: fn }, label);
    tools.append(
      btn('➖', 'Plus petit', () => change((it) => (it.s = Math.max(0.4, +(it.s - 0.2).toFixed(2))))),
      btn('➕', 'Plus grand', () => change((it) => (it.s = Math.min(3, +(it.s + 0.2).toFixed(2))))),
      btn('↻', 'Tourner', () => change((it) => (it.r = ((it.r || 0) + 30) % 360))),
      btn('⬆️', 'Devant', () => {
        const [it] = d.items.splice(sel, 1);
        d.items.push(it);
        sel = d.items.length - 1;
        save();
        renderScene();
      }),
      btn('🗑️', 'Enlever', () => {
        d.items.splice(sel, 1);
        sel = -1;
        sfxWhoosh();
        save();
        renderScene();
      }),
      btn('✓', 'Fini', () => select(-1)),
    );
  }

  function renderTray() {
    tray.innerHTML = '';
    const have = STICKERS.filter((x) => (p.stickers || []).includes(x.id));
    if (!have.length) {
      tray.append(h('div', { class: 'deco-empty' }, '🎁 Ouvre des pochettes surprises pour avoir des autocollants à coller !'));
      return;
    }
    const shiny = new Set(p.shiny || []);
    for (const x of have) {
      tray.append(
        h(
          'button',
          {
            class: 'deco-pick' + (shiny.has(x.id) ? ' glow' : ''),
            'aria-label': x.name,
            onclick: () => {
              if (d.items.length >= MAX_ITEMS) return toast('Ta planète est pleine ! Enlève un autocollant d’abord.');
              // posé un peu au hasard au-dessus de la planète, déjà sélectionné pour le déplacer
              d.items.push({ id: x.id, x: 0.3 + Math.random() * 0.4, y: 0.25 + Math.random() * 0.3, s: 1, r: 0 });
              sel = d.items.length - 1;
              sfxClick();
              save();
              renderScene();
            },
          },
          x.e,
        ),
      );
    }
  }

  function renderLooks() {
    looks.innerHTML = '';
    for (const pl of PLANETS) {
      if (pl.comingSoon) continue;
      const open = planetUnlocked(p, pl.id, s.unlockAll);
      looks.append(
        h(
          'button',
          {
            class: 'deco-look' + (pl.look === d.look ? ' on' : '') + (open ? '' : ' locked'),
            'aria-label': pl.name,
            onclick: () => {
              if (!open) return toast(`Débloque d’abord la ${pl.name} !`);
              d.look = pl.look;
              save();
              renderScene();
              renderLooks();
            },
          },
          h('span', { class: `planet planet-${pl.look}` + (open ? '' : ' locked') }),
        ),
      );
    }
  }

  renderScene();
  renderTray();
  renderLooks();
  return panel;
}
