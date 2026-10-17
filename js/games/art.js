// Dessins : main avec numéros de doigts, planètes.
import { h } from '../ui.js';
import { NOTE_COLORS } from '../music.js';

// Main avec les numéros de doigts. Main droite : pouce (1) sur Do… petit doigt (5) sur Sol.
// Main gauche (`left`) : c'est l'inverse, petit doigt (5) sur Do… pouce (1) sur Sol.
export function handSVG({ left = false } = {}) {
  const tips = [
    { n: 1, x: 30, y: 92 },
    { n: 2, x: 77, y: 36 },
    { n: 3, x: 111, y: 24 },
    { n: 4, x: 145, y: 34 },
    { n: 5, x: 177, y: 60 },
  ];
  const right = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7 }; // doigt -> note (Do Ré Mi Fa Sol)
  const leftMap = { 5: 0, 4: 2, 3: 4, 2: 5, 1: 7 };
  const map = left ? leftMap : right;
  const W = 210;
  const fx = (x) => (left ? W - x : x);
  return `<svg viewBox="0 0 ${W} 215" class="hand-svg" aria-label="Main ${left ? 'gauche' : 'droite'} : numéros des doigts">
    <g fill="#ffd9b8" stroke="#d99a6c" stroke-width="3" stroke-linejoin="round"${left ? ` transform="translate(${W} 0) scale(-1 1)"` : ''}>
      <rect x="14" y="78" width="34" height="92" rx="17" transform="rotate(-28 31 160)"/>
      <rect x="62" y="22" width="30" height="130" rx="15"/>
      <rect x="96" y="10" width="30" height="140" rx="15"/>
      <rect x="130" y="20" width="30" height="130" rx="15"/>
      <rect x="163" y="46" width="28" height="104" rx="14"/>
      <rect x="56" y="104" width="138" height="96" rx="42"/>
      <rect x="58" y="106" width="134" height="40" stroke="none"/>
    </g>
    ${tips
      .map((t) => {
        const x = fx(t.x);
        const p = map[t.n];
        const c = NOTE_COLORS[p];
        const name = ['Do', '', 'Ré', '', 'Mi', 'Fa', '', 'Sol'][p];
        const thumb = t.n === 1;
        return `<circle cx="${x}" cy="${t.y}" r="13" fill="${c}" stroke="#fff" stroke-width="2.5"/>
      <text x="${x}" y="${t.y + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="#1a1a2e" font-family="Fredoka, sans-serif">${t.n}</text>
      <text x="${x}" y="${thumb ? t.y - 19 : t.y + 34}" text-anchor="middle" font-size="12" font-weight="600" fill="${thumb ? '#ffd9b8' : '#7a4a2a'}" font-family="Fredoka, sans-serif">${name}</text>`;
      })
      .join('')}
    <text x="${W / 2 + (left ? -20 : 20)}" y="185" text-anchor="middle" font-size="14" fill="#7a4a2a" font-family="Fredoka, sans-serif">main ${left ? 'gauche' : 'droite'}</text>
  </svg>`;
}

export function planetEl(look, size = 84, locked = false) {
  const el = h('div', { class: `planet planet-${look}` + (locked ? ' locked' : '') });
  el.style.width = el.style.height = size + 'px';
  return el;
}
