// Portée en clé de sol ou en clé de fa (dessin SVG) : pour apprendre à lire les notes.
import { pc, noteColor, noteName, isBlack } from './music.js';

const DIA = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6 };

// Position de la note sur la portée : 0 = Do du milieu (Do4), 1 = Ré, 2 = Mi (1re ligne)…
export function staffStep(midi) {
  return (Math.floor(midi / 12) - 5) * 7 + DIA[pc(midi)];
}

const CLEFS = {
  // glyphe, note de la ligne du bas (Mi4 en clé de sol, Sol2 en clé de fa),
  // taille et hauteur de la ligne de base du glyphe (en écarts de lignes au-dessus de la ligne du bas).
  // Clé de fa : les deux points (à 220 et 644 unités/1000) encadrent la ligne du Fa.
  sol: { glyph: '\u{1D11E}', base: 2, size: 5.6, lift: 1 },
  fa: { glyph: '\u{1D122}', base: -10, size: 4.55, lift: 0.07 },
};

// Géométrie commune : `gap` = écart entre deux lignes.
function geom(gap, top, clef = 'sol') {
  const bottom = top + 4 * gap;
  const { base } = CLEFS[clef] || CLEFS.sol;
  const y = (step) => bottom - ((step - base) * gap) / 2;
  // l(k) : hauteur de la k-ième demi-ligne au-dessus de la ligne du bas (0 = ligne du bas, 4 = ligne du milieu)
  return { gap, top, bottom, base, clef, y, l: (k) => y(base + k) };
}

// Lignes de la portée, de x1 à x2.
function lines(g, x1, x2) {
  let s = '';
  for (let i = 0; i < 5; i++) {
    const y = g.top + i * g.gap;
    s += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="st-line"/>`;
  }
  return s;
}

function clef(g, x) {
  const c = CLEFS[g.clef] || CLEFS.sol;
  return `<text x="${x}" y="${g.bottom - g.gap * c.lift}" class="st-clef" font-size="${g.gap * c.size}">${c.glyph}</text>`;
}

// Un silence : pause (4 temps), demi-pause (2), soupir (1), demi-soupir (½).
function restSvg(g, x, dur) {
  const k = g.gap;
  if (dur >= 4) return `<rect x="${x - k * 0.6}" y="${g.l(6)}" width="${k * 1.2}" height="${k * 0.5}" class="st-rest"/>`;
  if (dur >= 2)
    return `<rect x="${x - k * 0.6}" y="${g.l(4) - k * 0.5}" width="${k * 1.2}" height="${k * 0.5}" class="st-rest"/>`;
  if (dur >= 1) {
    const t = g.l(7);
    return `<path d="M${x - k * 0.25} ${t} L${x + k * 0.35} ${t + k * 0.9} L${x - k * 0.15} ${t + k * 1.6} L${x + k * 0.35} ${t + k * 2.3} Q${x - k * 0.55} ${t + k * 2.0} ${x - k * 0.05} ${t + k * 3.0}" class="st-rest-line" stroke-width="${k * 0.3}"/>`;
  }
  const y = g.l(5);
  return `<circle cx="${x - k * 0.25}" cy="${y}" r="${k * 0.28}" class="st-rest"/><path d="M${x - k * 0.25} ${y + k * 0.1} Q${x + k * 0.1} ${y + k * 0.25} ${x + k * 0.35} ${y - k * 0.2} L${x - k * 0.1} ${g.l(1)}" class="st-rest-line" stroke-width="${k * 0.18}"/>`;
}

// Texte sous une note (nom ou étiquette).
function textUnder(g, x, text) {
  return `<text x="${x}" y="${g.bottom + g.gap * 3.2}" class="st-name" font-size="${g.gap * 1.05}">${text}</text>`;
}

// Une note : tête (pleine ou creuse selon la durée), hampe, crochet, petites lignes, point.
// Avec n.rest, c'est un silence de n.dur temps.
function noteSvg(g, x, n, { colors, names, label = null, cls = '', idx = null }) {
  const open = `<g class="sn ${cls}"${idx != null ? ` data-i="${idx}"` : ''}>`;
  if (n.rest) {
    const r = `<circle cx="${x}" cy="${g.l(4)}" r="${g.gap * 1.25}" class="sn-halo"/>` + restSvg(g, x, n.dur || 1);
    return open + r + (label != null ? textUnder(g, x, label) : '') + '</g>';
  }
  const step = staffStep(n.midi);
  const y = g.y(step);
  const dur = n.dur || 1;
  const hollow = dur >= 2;
  const fill = colors && !isBlack(n.midi) ? noteColor(n.midi) : '#1a1a2e';
  const rx = g.gap * 0.62;
  const ry = g.gap * 0.45;
  let s = open;
  s += `<circle cx="${x}" cy="${y}" r="${g.gap * 1.25}" class="sn-halo"/>`;
  // petites lignes au-dessus / en dessous de la portée
  for (let st = g.base - 2; st >= step; st -= 2)
    s += `<line x1="${x - rx * 1.7}" x2="${x + rx * 1.7}" y1="${g.y(st)}" y2="${g.y(st)}" class="st-line"/>`;
  for (let st = g.base + 10; st <= step; st += 2)
    s += `<line x1="${x - rx * 1.7}" x2="${x + rx * 1.7}" y1="${g.y(st)}" y2="${g.y(st)}" class="st-line"/>`;
  if (isBlack(n.midi))
    s += `<text x="${x - rx * 2.6}" y="${y + g.gap * 0.45}" class="st-acc" font-size="${g.gap * 1.6}">♯</text>`;
  // hampe (vers le haut sous la 3e ligne, vers le bas au-dessus)
  if (dur < 4) {
    const up = step < g.base + 4;
    const sx = up ? x + rx * 0.9 : x - rx * 0.9;
    const sy2 = up ? y - g.gap * 3.3 : y + g.gap * 3.3;
    s += `<line x1="${sx}" y1="${y}" x2="${sx}" y2="${sy2}" class="st-stem"/>`;
    if (dur <= 0.5) {
      const d = up ? 1 : -1;
      s += `<path d="M${sx} ${sy2} q ${g.gap * 0.9} ${d * g.gap * 0.9} ${g.gap * 0.6} ${d * g.gap * 2}" class="st-flag"/>`;
    }
  }
  s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(-20 ${x} ${y})" ${
    hollow ? `fill="none" stroke="${fill}" stroke-width="${g.gap * 0.22}"` : `fill="${fill}"`
  } class="sn-head"/>`;
  if (dur === 1.5 || dur === 3 || dur === 0.75)
    s += `<circle cx="${x + rx * 1.8}" cy="${y - ((step - g.base) % 2 ? 0 : g.gap * 0.3)}" r="${g.gap * 0.14}" fill="${fill}"/>`;
  const text = label != null ? label : names ? noteName(n.midi) : null;
  if (text != null) s += textUnder(g, x, text);
  s += '</g>';
  return s;
}

// Portée avec quelques notes réparties (diapos, jeux « lis la note »).
// `labels` : un texte sous chaque note à la place du nom (ex. « noire », « soupir »).
export function staffSVG(
  notes,
  { width = 320, gap = 14, colors = true, names = false, labels = null, highlight = -1, clef: c = 'sol' } = {},
) {
  const top = gap * 3;
  const g = geom(gap, top, c);
  const h = g.bottom + gap * (names || labels ? 4.4 : 3.2);
  const x0 = gap * 4.6;
  const span = width - x0 - gap * 2;
  let s = `<svg viewBox="0 0 ${width} ${h}" class="staff" role="img" aria-label="portée">`;
  s += lines(g, 4, width - 4) + clef(g, gap * 0.4);
  notes.forEach((n, i) => {
    const x = x0 + (notes.length === 1 ? span / 2 : (span * (i + 0.5)) / notes.length);
    s += noteSvg(g, x, n, { colors, names, label: labels ? labels[i] : null, cls: i === highlight ? 'now' : '', idx: i });
  });
  return s + '</svg>';
}

// Piste de partition pour les chansons : renvoie {svg, xs (centre de chaque note), width, height}.
export function staffTrack(notes, { gap = 12, unit = 46, colors = true, names = false, lead = 40, clef: c = 'sol' } = {}) {
  const top = gap * 3;
  const g = geom(gap, top, c);
  const xs = [];
  let x = lead;
  for (const n of notes) {
    xs.push(x);
    x += Math.max(unit * 0.8, unit * Math.min(n.dur || 1, 2.5));
  }
  const width = x + unit;
  const height = g.bottom + gap * (names ? 4.4 : 3.4);
  let s = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="staff-track">`;
  s += lines(g, 0, width);
  notes.forEach((n, i) => (s += noteSvg(g, xs[i], n, { colors, names, idx: i })));
  return { svg: s + '</svg>', xs, width, height };
}

// Début de portée fixe (avec la clé) posé à gauche de la piste qui défile.
export function staffClefSVG({ gap = 12, names = false, clef: c = 'sol' } = {}) {
  const top = gap * 3;
  const g = geom(gap, top, c);
  const height = g.bottom + gap * (names ? 4.4 : 3.4);
  const w = gap * 4.2;
  return `<svg viewBox="0 0 ${w} ${height}" width="${w}" height="${height}" class="staff-clef">${lines(g, 0, w)}${clef(g, gap * 0.3)}<line x1="1" y1="${g.top}" x2="1" y2="${g.bottom}" class="st-line"/></svg>`;
}

// Une figure de note (ou de silence) seule, sans portée : pour le jeu du tambour.
export function figureSVG(dur, { rest = false, gap = 8 } = {}) {
  const g = geom(gap, gap * 1.1);
  const w = gap * 3.2;
  const h = g.bottom + gap * 0.6;
  return `<svg viewBox="0 0 ${w} ${h}" class="figure">${noteSvg(g, gap * 1.3, { midi: 69, dur, rest }, { colors: false })}</svg>`;
}
