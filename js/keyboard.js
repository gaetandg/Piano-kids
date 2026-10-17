// Clavier de piano à l'écran (tactile, multi-doigts, glissando).
import { h } from './ui.js';
import { isBlack, noteColor, noteName, pc, foldIntoRange } from './music.js';

export class Keyboard {
  constructor({ from = 60, to = 72, interactive = true, names = 'none', colors = true, onNote = null } = {}) {
    this.from = from;
    this.to = to;
    this.interactive = interactive;
    this.names = names; // 'none' | 'all' | 'c'
    this.colors = colors;
    this.onNote = onNote;
    this.keys = new Map();
    this.el = h('div', { class: 'keyboard' + (interactive ? ' interactive' : '') });
    this.pointers = new Map();
    this.render();
    if (interactive) this.bindPointer();
  }

  render() {
    this.el.innerHTML = '';
    this.keys.clear();
    if (isBlack(this.from)) this.from--;
    if (isBlack(this.to)) this.to++;
    const whites = [];
    for (let m = this.from; m <= this.to; m++) if (!isBlack(m)) whites.push(m);
    const w = 100 / whites.length;
    this.el.style.setProperty('--wk', w + '%');
    whites.forEach((m, i) => {
      const k = h('div', { class: 'key white', 'data-midi': m });
      k.style.setProperty('--pc', noteColor(m));
      k.style.left = i * w + '%';
      k.style.width = w + '%';
      if (this.colors) {
        const dot = h('span', { class: 'dot' });
        dot.style.background = noteColor(m);
        k.append(dot);
      }
      if (this.names === 'all' || (this.names === 'c' && pc(m) === 0)) {
        k.append(h('span', { class: 'kname' }, noteName(m)));
      }
      if (m === 60) k.classList.add('middle-c');
      this.el.append(k);
      this.keys.set(m, k);
    });
    whites.forEach((m, i) => {
      const b = m + 1;
      if (b <= this.to && isBlack(b)) {
        const k = h('div', { class: 'key black', 'data-midi': b });
        k.style.left = (i + 1) * w - w * 0.31 + '%';
        k.style.width = w * 0.62 + '%';
        this.el.append(k);
        this.keys.set(b, k);
      }
    });
  }

  setRange(from, to) {
    this.from = from;
    this.to = to;
    this.render();
  }

  setOptions({ names, colors }) {
    if (names !== undefined) this.names = names;
    if (colors !== undefined) this.colors = colors;
    this.render();
  }

  bindPointer() {
    const keyAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const k = el && el.closest && el.closest('.key');
      return k && this.el.contains(k) ? parseInt(k.dataset.midi, 10) : null;
    };
    this.el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        this.el.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignoré */
      }
      const m = keyAt(e.clientX, e.clientY);
      this.pointers.set(e.pointerId, m);
      if (m != null) this.trigger(m);
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const m = keyAt(e.clientX, e.clientY);
      if (m !== this.pointers.get(e.pointerId)) {
        const old = this.pointers.get(e.pointerId);
        if (old != null) this.release(old);
        this.pointers.set(e.pointerId, m);
        if (m != null) this.trigger(m);
      }
    });
    const up = (e) => {
      const m = this.pointers.get(e.pointerId);
      if (m != null) this.release(m);
      this.pointers.delete(e.pointerId);
    };
    this.el.addEventListener('pointerup', up);
    this.el.addEventListener('pointercancel', up);
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  trigger(m) {
    const k = this.keys.get(m);
    if (k) k.classList.add('down');
    this.showPlayed(m);
    if (this.onNote && this.enabled !== false) this.onNote(m);
  }

  release(m) {
    const k = this.keys.get(m);
    if (k) k.classList.remove('down');
  }

  // Allume une touche jouée dans sa couleur, avec son nom (ex. note entendue au micro).
  showPlayed(midi) {
    const m = foldIntoRange(midi, this.from, this.to);
    const k = m != null && this.keys.get(m);
    if (!k) return null;
    k.classList.add('lit');
    if (!isBlack(m) && !k.querySelector('.plabel')) k.append(h('span', { class: 'plabel' }, noteName(m)));
    clearTimeout(k._t);
    k._t = setTimeout(() => {
      k.classList.remove('lit');
      const l = k.querySelector('.plabel');
      if (l) l.remove();
    }, 800);
    return m;
  }

  // Touches cibles (clignotent doucement dans leur couleur).
  setTargets(midis = [], { label = false } = {}) {
    for (const [m, k] of this.keys) {
      k.classList.remove('target');
      k.style.removeProperty('--tc');
      const old = k.querySelector('.tlabel');
      if (old) old.remove();
    }
    for (const m of midis) {
      const k = this.keys.get(m);
      if (!k) continue;
      k.classList.add('target');
      k.style.setProperty('--tc', isBlack(m) ? '#ffd60a' : noteColor(m));
      if (label) k.append(h('span', { class: 'tlabel' }, noteName(m)));
    }
  }

  // Éclair de couleur : 'good' ou 'bad'.
  flash(midi, kind = 'good') {
    const m = foldIntoRange(midi, this.from, this.to);
    const k = m != null && this.keys.get(m);
    if (!k) return;
    k.classList.remove('good', 'bad');
    void k.offsetWidth;
    k.classList.add(kind);
    clearTimeout(k._f);
    k._f = setTimeout(() => k.classList.remove(kind), 600);
  }

  // Marque des touches de façon durable (ex. "trouvée").
  mark(midi, cls = 'found', on = true) {
    const k = this.keys.get(midi);
    if (k) k.classList.toggle(cls, on);
  }

  clearMarks(cls = 'found') {
    for (const k of this.keys.values()) k.classList.remove(cls);
  }

  rectOf(midi) {
    const k = this.keys.get(midi);
    return k ? k.getBoundingClientRect() : null;
  }

  midis() {
    return [...this.keys.keys()].sort((a, b) => a - b);
  }
}
