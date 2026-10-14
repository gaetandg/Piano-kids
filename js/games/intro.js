// Diapos d'explication avec Cosmo, parfois avec un petit exercice.
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError } from '../audio.js';
import { pc, noteName, isBlack, noteColor, STICKER_NAMES } from '../music.js';
import { handSVG } from './art.js';

export const config = () => ({ allowMode: true, kb: { range: 'piano' } });

export default function intro(shell, mission, finish) {
  const slides = mission.slides;
  let i = 0;
  let tryState = null;
  let skipTimer = null;
  let alive = true;

  const card = h('div', { class: 'slide' });
  const extra = h('div', { class: 'slide-extra' });
  const tryBox = h('div', { class: 'try-box' });
  const nav = h('div', { class: 'slide-nav' });
  const prevBtn = h('button', { class: 'btn ghost', onclick: () => go(i - 1) }, '◀');
  const nextBtn = h('button', { class: 'btn primary big', onclick: () => go(i + 1) }, 'Suivant ▶');
  const skipBtn = h('button', { class: 'btn link', onclick: () => go(i + 1) }, 'Passer');
  nav.append(prevBtn, nextBtn);
  card.append(extra, tryBox, nav);
  shell.stage.append(card);
  shell.dock(nav);

  function displayed() {
    return shell.keyboard ? shell.keyboard.midis() : [];
  }

  function resolveTargets(kb) {
    if (!kb) return [];
    const keys = displayed().filter((m) => !isBlack(m));
    if (kb.targets === 'low') return keys.slice(0, 4);
    if (kb.targets === 'high') return keys.slice(-4);
    if (kb.pcs) return displayed().filter((m) => kb.pcs.includes(pc(m)));
    return kb.targets || [];
  }

  function soundNotes(s) {
    const keys = displayed().filter((m) => !isBlack(m));
    if (s.sound === 'low') return keys.slice(0, 3);
    if (s.sound === 'high') return keys.slice(-3);
    return s.sound;
  }

  function applyKb() {
    const s = slides[i];
    const kb = s.kb || { range: 'piano' };
    shell.setKeyboard({ range: kb.range || 'piano', names: kb.names || 'none' });
    shell.keyboard.setTargets(resolveTargets(kb), { label: !!kb.label });
  }

  async function playSound(notes) {
    shell.inputEnabled = false;
    notes.forEach((m, k) => {
      playNote(m, { when: k * 0.45, dur: 0.5 });
      setTimeout(() => alive && shell.keyboard && shell.keyboard.flash(m, 'good'), k * 450 + 20);
    });
    await wait(notes.length * 450 + 300);
    shell.inputEnabled = true;
  }

  function show() {
    const s = slides[i];
    clearTimeout(skipTimer);
    shell.setProgress(i / slides.length);
    shell.say(s.text, s.mood || 'happy');
    applyKb();
    extra.innerHTML = '';
    tryBox.innerHTML = '';
    if (s.img === 'hand') extra.append(h('div', { class: 'hand-art', html: handSVG() }));
    if (s.img === 'sticker') {
      const pcs = Array.isArray(s.stickerPc) ? s.stickerPc : [s.stickerPc];
      extra.append(
        h(
          'div',
          { class: 'sticker-demo' },
          pcs.map((p) =>
            h(
              'div',
              { class: 'sticker-chip' },
              h('span', { class: 'sticker-dot', style: { background: noteColor(p + 60) } }),
              h('b', {}, noteName(p + 60)),
              ' = gommette ' + STICKER_NAMES[p],
            ),
          ),
        ),
      );
    }
    const notes = s.sound && soundNotes(s);
    if (notes && notes.length) {
      extra.append(h('button', { class: 'btn sound', onclick: () => playSound(notes) }, '🔊 Écouter'));
    }
    prevBtn.style.visibility = i > 0 ? 'visible' : 'hidden';
    nextBtn.textContent = i === slides.length - 1 ? 'Terminer ✓' : 'Suivant ▶';

    tryState = null;
    if (s.try) {
      tryState = { ...s.try, pos: 0, count: s.try.count || (s.try.seq ? s.try.seq.length : 1) };
      nextBtn.style.display = 'none';
      renderTry();
      skipTimer = setTimeout(() => {
        if (tryState && alive) tryBox.append(skipBtn);
      }, 15000);
    } else {
      nextBtn.style.display = '';
    }
  }

  function renderTry() {
    tryBox.innerHTML = '';
    const t = tryState;
    const dots = h('div', { class: 'try-dots' });
    for (let k = 0; k < t.count; k++) {
      let label = '♪';
      let color = null;
      if (t.seq) {
        label = noteName(t.seq[k] + 60);
        color = noteColor(t.seq[k] + 60);
      }
      const d = h('span', { class: 'try-dot' + (k < t.pos ? ' ok' : '') + (k === t.pos ? ' now' : '') }, label);
      if (color && k < t.pos) d.style.background = color;
      if (color) d.style.borderColor = color;
      dots.append(d);
    }
    tryBox.append(
      h(
        'div',
        { class: 'try-prompt' },
        shell.mode === 'piano' ? '🎹 ' + t.prompt + ' sur ton piano' : '👆 ' + t.prompt + ' sur l’écran',
      ),
      dots,
    );
  }

  shell.expect = (m) => !!tryState && (tryState.any || pc(m) === tryState.seq[tryState.pos]);
  shell.handler = (m) => {
    if (!tryState) return;
    const t = tryState;
    const ok = t.any || pc(m) === t.seq[t.pos];
    if (ok) {
      shell.keyboard.flash(m, 'good');
      t.pos++;
      if (t.any) {
        const intro = shell.mode === 'piano' ? 'Je t’ai entendu !' : 'Bravo !';
        shell.say(`${intro} C’était un ${noteName(m)}.`, 'excited', t.pos >= t.count);
      }
      renderTry();
      if (t.pos >= t.count) {
        tryState = null;
        clearTimeout(skipTimer);
        sfxSuccess();
        if (!t.any) shell.say('Bravo, c’est parfait ! 🎉', 'excited');
        setTimeout(() => {
          if (alive) nextBtn.style.display = '';
        }, 600);
      }
    } else {
      shell.keyboard.flash(m, 'bad');
      sfxError();
      shell.say(`Oups, ça c’est ${noteName(m)}. Essaie encore !`, 'oops');
    }
  };

  shell.onRefresh = () => {
    if (alive) {
      const s = slides[i];
      shell.keyboard.setTargets(resolveTargets(s.kb), { label: !!(s.kb && s.kb.label) });
      if (tryState) renderTry();
    }
  };

  function go(n) {
    if (n < 0) return;
    if (n >= slides.length) {
      finish(null);
      return;
    }
    i = n;
    show();
  }

  show();
  return {
    destroy() {
      alive = false;
      clearTimeout(skipTimer);
    },
  };
}
