// Petits outils d'interface : création d'éléments, mascotte, étoiles, confettis.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// ---------- Cosmo, la mascotte ----------

const MOUTHS = {
  happy: '<path d="M43 70 Q50 77 57 70" stroke="#1d3b2a" stroke-width="3" fill="none" stroke-linecap="round"/>',
  excited: '<path d="M41 68 Q50 82 59 68 Z" fill="#1d3b2a"/><path d="M45 74 Q50 78 55 74" fill="#ff7aa2"/>',
  oops: '<ellipse cx="50" cy="72" rx="4" ry="5" fill="#1d3b2a"/>',
  think: '<path d="M44 72 L56 70" stroke="#1d3b2a" stroke-width="3" stroke-linecap="round"/>',
};

export function mascotSVG(mood = 'happy') {
  const mouth = MOUTHS[mood] || MOUTHS.happy;
  const eyeY = mood === 'excited' ? 55 : 56;
  const eyes =
    mood === 'excited'
      ? `<path d="M34 57 Q39 50 44 57" stroke="#1d3b2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
         <path d="M56 57 Q61 50 66 57" stroke="#1d3b2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="39" cy="${eyeY}" rx="7" ry="8" fill="#fff"/><ellipse cx="61" cy="${eyeY}" rx="7" ry="8" fill="#fff"/>
         <circle cx="40" cy="${eyeY + 1}" r="4.2" fill="#1d1d3a"/><circle cx="62" cy="${eyeY + 1}" r="4.2" fill="#1d1d3a"/>
         <circle cx="41.5" cy="${eyeY - 1}" r="1.5" fill="#fff"/><circle cx="63.5" cy="${eyeY - 1}" r="1.5" fill="#fff"/>`;
  return `<svg viewBox="0 0 100 120" class="mascot-svg" aria-hidden="true">
    <defs>
      <radialGradient id="cg-helmet" cx="35%" cy="30%" r="75%">
        <stop offset="0" stop-color="#e8f7ff" stop-opacity=".55"/>
        <stop offset=".6" stop-color="#9fd8ff" stop-opacity=".25"/>
        <stop offset="1" stop-color="#5fb4ff" stop-opacity=".45"/>
      </radialGradient>
      <radialGradient id="cg-face" cx="40%" cy="35%" r="70%">
        <stop offset="0" stop-color="#9dff9a"/><stop offset="1" stop-color="#3fcf6a"/>
      </radialGradient>
    </defs>
    <g class="m-ant">
      <line x1="38" y1="22" x2="32" y2="6" stroke="#bfc8e6" stroke-width="3" stroke-linecap="round"/>
      <line x1="62" y1="22" x2="68" y2="6" stroke="#bfc8e6" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="6" r="5" fill="#ffd60a"/><circle cx="68" cy="6" r="5" fill="#ff7aa2"/>
    </g>
    <rect x="30" y="92" width="40" height="24" rx="12" fill="#f1f4ff"/>
    <rect x="30" y="100" width="40" height="5" fill="#ff9f1c"/>
    <circle cx="50" cy="56" r="40" fill="#f1f4ff"/>
    <ellipse cx="50" cy="60" rx="30" ry="28" fill="url(#cg-face)"/>
    ${eyes}
    <ellipse cx="31" cy="68" rx="5" ry="3" fill="#ff7aa2" opacity=".55"/>
    <ellipse cx="69" cy="68" rx="5" ry="3" fill="#ff7aa2" opacity=".55"/>
    ${mouth}
    <circle cx="50" cy="56" r="40" fill="url(#cg-helmet)" stroke="#cfe6ff" stroke-width="3"/>
    <path d="M24 40 Q30 26 44 22" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
  </svg>`;
}

export function mascot(mood = 'happy', cls = '') {
  const el = h('div', { class: 'mascot ' + cls, html: mascotSVG(mood) });
  el.setMood = (m) => {
    el.innerHTML = mascotSVG(m);
  };
  el.bounce = () => {
    el.classList.remove('bounce');
    void el.offsetWidth;
    el.classList.add('bounce');
  };
  el.shake = () => {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
  };
  return el;
}

// ---------- Étoiles ----------

export function starsRow(n, max = 3, cls = '') {
  const row = h('div', { class: 'stars ' + cls });
  for (let i = 0; i < max; i++) row.append(h('span', { class: 'star' + (i < n ? ' on' : '') }, '★'));
  return row;
}

// ---------- Confettis ----------

export function confetti(count = 70) {
  const layer = h('div', { class: 'confetti' });
  const colors = ['#ff4757', '#ff9f1c', '#ffd60a', '#2ed573', '#38c6f4', '#3d5afe', '#a55eea', '#fff'];
  const shapes = ['★', '●', '■', '▲'];
  for (let i = 0; i < count; i++) {
    const p = h('span', {}, shapes[i % shapes.length]);
    p.style.left = Math.random() * 100 + '%';
    p.style.color = colors[i % colors.length];
    p.style.fontSize = 10 + Math.random() * 16 + 'px';
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.animationDuration = 1.6 + Math.random() * 1.4 + 's';
    p.style.setProperty('--dx', (Math.random() * 2 - 1) * 120 + 'px');
    layer.append(p);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 3500);
}

// Petite étoile qui s'envole depuis un élément (ou une position).
export function floatStar(x, y, color = '#ffd60a', text = '★') {
  const s = h('div', { class: 'float-star' }, text);
  s.style.left = x + 'px';
  s.style.top = y + 'px';
  s.style.color = color;
  document.body.append(s);
  setTimeout(() => s.remove(), 1200);
}

// ---------- Fenêtres ----------

export function modal(content, { onClose, dismissable = true } = {}) {
  const back = h('div', { class: 'modal-back' });
  const box = h('div', { class: 'modal' }, content);
  back.append(box);
  const close = () => {
    back.remove();
    if (onClose) onClose();
  };
  if (dismissable)
    back.addEventListener('click', (e) => {
      if (e.target === back) close();
    });
  document.body.append(back);
  return { close, box };
}

export function confirmBox(text, okLabel = 'Oui', cancelLabel = 'Annuler') {
  return new Promise((resolve) => {
    let m;
    const done = (v) => {
      m.close();
      resolve(v);
    };
    m = modal(
      h(
        'div',
        { class: 'confirm' },
        h('p', {}, text),
        h(
          'div',
          { class: 'row' },
          h('button', { class: 'btn ghost', onclick: () => done(false) }, cancelLabel),
          h('button', { class: 'btn danger', onclick: () => done(true) }, okLabel),
        ),
      ),
      { onClose: () => resolve(false) },
    );
  });
}

export function toast(text, ms = 2200) {
  const t = h('div', { class: 'toast' }, text);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, ms);
}

// ---------- Fond étoilé ----------

export function starfield() {
  const sky = h('div', { class: 'sky' });
  for (let layer = 0; layer < 3; layer++) {
    const shadows = [];
    const n = [70, 40, 18][layer];
    for (let i = 0; i < n; i++) {
      const x = Math.round(Math.random() * 2000);
      const y = Math.round(Math.random() * 2000);
      const a = (0.4 + Math.random() * 0.6).toFixed(2);
      shadows.push(`${x}px ${y}px rgba(255,255,255,${a})`);
    }
    const l = h('div', { class: 'stars-layer l' + layer });
    l.style.boxShadow = shadows.join(',');
    sky.append(l);
  }
  document.body.prepend(sky);
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Garde l'écran allumé pendant le jeu (téléphone posé sur le pupitre).
let wakeLock = null;
export async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => (wakeLock = null));
    }
  } catch (e) {
    /* pas grave */
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') keepAwake();
  });
}
