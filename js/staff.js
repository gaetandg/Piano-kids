// Portée en clé de sol (dessin SVG) : pour apprendre à lire les notes.
import { pc, noteColor, noteName, isBlack } from './music.js';

const DIA = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6 };

// Position de la note sur la portée : 0 = Do du milieu (Do4), 1 = Ré, 2 = Mi (1re ligne)…
export function staffStep(midi) {
  return (Math.floor(midi / 12) - 5) * 7 + DIA[pc(midi)];
}

const CLEF = '\u{1D11E}';

// Géométrie commune : `gap` = écart entre deux lignes.
function geom(gap, top) {
  const bottom = top + 4 * gap; // ligne du bas (Mi4)
  return { gap, top, bottom, y: (step) => bottom - ((step - 2) * gap) / 2 };
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
  return `<text x="${x}" y="${g.bottom - g.gap * 1.0}" class="st-clef" font-size="${g.gap * 5.6}">${CLEF}</text>`;
}

// Une note : tête (pleine ou creuse selon la durée), hampe, crochet, petites lignes, point.
function noteSvg(g, x, n, { colors, names, cls = '', idx = null }) {
  const step = staffStep(n.midi);
  const y = g.y(step);
  const dur = n.dur || 1;
  const hollow = dur >= 2;
  const fill = colors && !isBlack(n.midi) ? noteColor(n.midi) : '#1a1a2e';
  const rx = g.gap * 0.62;
  const ry = g.gap * 0.45;
  let s = `<g class="sn ${cls}"${idx != null ? ` data-i="${idx}"` : ''}>`;
  s += `<circle cx="${x}" cy="${y}" r="${g.gap * 1.25}" class="sn-halo"/>`;
  // petites lignes au-dessus / en dessous de la portée
  for (let st = 0; st >= step; st -= 2)
    if (st <= 0) s += `<line x1="${x - rx * 1.7}" x2="${x + rx * 1.7}" y1="${g.y(st)}" y2="${g.y(st)}" class="st-line"/>`;
  for (let st = 12; st <= step; st += 2)
    s += `<line x1="${x - rx * 1.7}" x2="${x + rx * 1.7}" y1="${g.y(st)}" y2="${g.y(st)}" class="st-line"/>`;
  if (isBlack(n.midi))
    s += `<text x="${x - rx * 2.6}" y="${y + g.gap * 0.45}" class="st-acc" font-size="${g.gap * 1.6}">♯</text>`;
  // hampe (vers le haut sous la 3e ligne, vers le bas au-dessus)
  if (dur < 4) {
    const up = step < 6;
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
    s += `<circle cx="${x + rx * 1.8}" cy="${y - (step % 2 ? 0 : g.gap * 0.3)}" r="${g.gap * 0.14}" fill="${fill}"/>`;
  if (names)
    s += `<text x="${x}" y="${g.bottom + g.gap * 3.2}" class="st-name" font-size="${g.gap * 1.05}">${noteName(n.midi)}</text>`;
  s += '</g>';
  return s;
}

// Portée avec quelques notes réparties (diapos, jeux « lis la note »).
export function staffSVG(notes, { width = 320, gap = 14, colors = true, names = false, highlight = -1 } = {}) {
  const top = gap * 3;
  const g = geom(gap, top);
  const h = g.bottom + gap * (names ? 4.4 : 3.2);
  const x0 = gap * 4.6;
  const span = width - x0 - gap * 2;
  let s = `<svg viewBox="0 0 ${width} ${h}" class="staff" role="img" aria-label="portée">`;
  s += lines(g, 4, width - 4) + clef(g, gap * 0.4);
  notes.forEach((n, i) => {
    const x = x0 + (notes.length === 1 ? span / 2 : (span * (i + 0.5)) / notes.length);
    s += noteSvg(g, x, n, { colors, names, cls: i === highlight ? 'now' : '' });
  });
  return s + '</svg>';
}

// Piste de partition pour les chansons : renvoie {svg, xs (centre de chaque note), width, height}.
export function staffTrack(notes, { gap = 12, unit = 46, colors = true, names = false, lead = 40 } = {}) {
  const top = gap * 3;
  const g = geom(gap, top);
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

// Début de portée fixe (clé de sol) posé à gauche de la piste qui défile.
export function staffClefSVG({ gap = 12, names = false } = {}) {
  const top = gap * 3;
  const g = geom(gap, top);
  const height = g.bottom + gap * (names ? 4.4 : 3.4);
  const w = gap * 4.2;
  return `<svg viewBox="0 0 ${w} ${height}" width="${w}" height="${height}" class="staff-clef">${lines(g, 0, w)}${clef(g, gap * 0.3)}<line x1="1" y1="${g.top}" x2="1" y2="${g.bottom}" class="st-line"/></svg>`;
}
