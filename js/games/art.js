// Dessins : main avec numéros de doigts, planètes.
import { h } from '../ui.js';
import { NOTE_COLORS } from '../music.js';

export function handSVG() {
  const tips = [
    { n: 1, x: 30, y: 92, c: NOTE_COLORS[0] },
    { n: 2, x: 77, y: 36, c: NOTE_COLORS[2] },
    { n: 3, x: 111, y: 24, c: NOTE_COLORS[4] },
    { n: 4, x: 145, y: 34, c: NOTE_COLORS[5] },
    { n: 5, x: 177, y: 60, c: NOTE_COLORS[7] },
  ];
  const names = ['Do', 'Ré', 'Mi', 'Fa', 'Sol'];
  return `<svg viewBox="0 0 210 215" class="hand-svg" aria-label="Main droite : pouce 1, index 2, majeur 3, annulaire 4, auriculaire 5">
    <g fill="#ffd9b8" stroke="#d99a6c" stroke-width="3" stroke-linejoin="round">
      <rect x="14" y="78" width="34" height="92" rx="17" transform="rotate(-28 31 160)"/>
      <rect x="62" y="22" width="30" height="130" rx="15"/>
      <rect x="96" y="10" width="30" height="140" rx="15"/>
      <rect x="130" y="20" width="30" height="130" rx="15"/>
      <rect x="163" y="46" width="28" height="104" rx="14"/>
      <rect x="56" y="104" width="138" height="96" rx="42"/>
    </g>
    <rect x="58" y="106" width="134" height="40" fill="#ffd9b8"/>
    ${tips
      .map(
        (t, i) => `<circle cx="${t.x}" cy="${t.y}" r="13" fill="${t.c}" stroke="#fff" stroke-width="2.5"/>
      <text x="${t.x}" y="${t.y + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="#1a1a2e" font-family="Fredoka, sans-serif">${t.n}</text>
      <text x="${t.x}" y="${i === 0 ? t.y - 19 : t.y + 34}" text-anchor="middle" font-size="12" font-weight="600" fill="${i === 0 ? '#ffd9b8' : '#7a4a2a'}" font-family="Fredoka, sans-serif">${names[i]}</text>`,
      )
      .join('')}
    <text x="125" y="185" text-anchor="middle" font-size="14" fill="#7a4a2a" font-family="Fredoka, sans-serif">main droite</text>
  </svg>`;
}

export function planetEl(look, size = 84, locked = false) {
  const el = h('div', { class: `planet planet-${look}` + (locked ? ' locked' : '') });
  el.style.width = el.style.height = size + 'px';
  return el;
}
