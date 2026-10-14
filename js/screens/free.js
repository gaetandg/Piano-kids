// Piano libre : jouer sur l'écran avec des sons rigolos, ou faire écouter son vrai piano.
import { h, keepAwake, toast, floatStar } from '../ui.js';
import * as state from '../state.js';
import { go } from '../router.js';
import { Keyboard } from '../keyboard.js';
import { playNote, INSTRUMENTS, unlockAudio } from '../audio.js';
import { mic, micSupported } from '../pitch.js';
import { noteName, noteColor, screenRange, pianoPreset, isBlack, pc, foldIntoRange } from '../music.js';
import { topBar, bottomNav } from './hub.js';
import { needsCalibration } from './calibrate.js';

export function freeScreen(app) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });
  const piano = pianoPreset(state.settings().piano);
  let instrument = 'piano';
  let names = true;
  // Quand tout le clavier ne tient pas (portrait), on montre une octave à partir de ce Do
  const firstDo = piano.from + ((12 - pc(piano.from)) % 12);
  const lastDo = piano.to - pc(piano.to);
  let octFrom = Math.max(firstDo, Math.min(60, lastDo - 12));
  let listening = false;
  let unsub = null;
  let alive = true;

  const bigNote = h('div', { class: 'free-note' }, '🎹');
  const sky = h('div', { class: 'free-sky' }, bigNote);
  const kbWrap = h('div', { class: 'kb-wrap free' });
  let kb = null;

  function onNote(m) {
    playNote(m, { instrument, dur: instrument === 'space' ? 1.2 : 0.8 });
    showNote(m);
  }

  // `notes` : une note ou un accord (tableau), affiché du grave à l'aigu
  function showNote(notes) {
    const list = (Array.isArray(notes) ? notes : [notes]).slice().sort((a, b) => a - b);
    bigNote.innerHTML = '';
    list.forEach((m, i) => {
      if (i) bigNote.append(h('span', { class: 'plus' }, '+'));
      const s = h('span', {}, noteName(m));
      s.style.color = isBlack(m) ? '#fff' : noteColor(m);
      bigNote.append(s);
    });
    bigNote.classList.toggle('chord', list.length > 1);
    bigNote.classList.remove('pop');
    void bigNote.offsetWidth;
    bigNote.classList.add('pop');
    for (const m of list) {
      const r = kb && kb.rectOf(foldIntoRange(m, kb.from, kb.to) ?? m);
      if (r)
        floatStar(r.left + r.width / 2 - 10, r.top - 10, isBlack(m) ? '#ffd60a' : noteColor(m), ['★', '✦', '●', '♪', '♫'][m % 5]);
    }
  }

  function build() {
    const width = kbWrap.clientWidth || window.innerWidth;
    const r = listening ? { from: piano.from, to: piano.to, full: true } : screenRange(octFrom, octFrom + 12, piano, width);
    // les flèches d'octave ne servent que si tout le clavier ne tient pas
    octaveRow.hidden = r.full;
    rotateHint.hidden = r.full || window.innerWidth > window.innerHeight;
    shiftL.disabled = r.from <= firstDo;
    shiftR.disabled = r.to >= lastDo;
    kb = new Keyboard({ from: r.from, to: r.to, interactive: !listening, names: names ? 'all' : 'none', colors: true, onNote });
    kbWrap.innerHTML = '';
    kbWrap.append(kb.el);
    kbWrap.classList.toggle('display-only', listening);
  }

  const instRow = h(
    'div',
    { class: 'seg' },
    Object.entries(INSTRUMENTS).map(([id, ins]) => {
      const b = h(
        'button',
        {
          class: id === instrument ? 'on' : '',
          onclick: () => {
            instrument = id;
            instRow.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
            playNote(72, { instrument });
          },
        },
        ins.emoji,
        h('span', { class: 'seg-label' }, ' ' + ins.label),
      );
      return b;
    }),
  );
  const shiftL = h('button', { class: 'icon-btn', onclick: () => shift(-12), 'aria-label': 'Plus grave' }, '◀');
  const shiftR = h('button', { class: 'icon-btn', onclick: () => shift(12), 'aria-label': 'Plus aigu' }, '▶');
  const namesBtn = h(
    'button',
    {
      class: 'btn ghost small on',
      onclick: () => {
        names = !names;
        namesBtn.classList.toggle('on', names);
        build();
      },
    },
    'Do Ré Mi',
  );
  const listenBtn = h('button', { class: 'btn ghost small', onclick: toggleListen }, '🎤 Écoute mon piano');

  function shift(d) {
    octFrom = Math.max(firstDo, Math.min(lastDo - 12, octFrom + d));
    build();
  }

  async function toggleListen() {
    if (!listening) {
      if (!micSupported()) return toast('Micro indisponible sur cet appareil.');
      if (needsCalibration()) return go('calibrate', { next: { name: 'free' } });
      try {
        await unlockAudio();
        unsub = await mic.subscribe((notes) => {
          if (!alive) return;
          notes.forEach((m) => kb.showPlayed(m));
          showNote(notes);
        });
        listening = true;
        listenBtn.classList.add('on');
        listenBtn.textContent = '🎤 J’écoute… (arrêter)';
        bigNote.textContent = '👂';
        toast('Joue sur ton vrai piano : je te dis quelle note c’est !');
      } catch (e) {
        toast('🎤 Je n’ai pas accès au micro.');
      }
    } else {
      if (unsub) unsub();
      unsub = null;
      listening = false;
      listenBtn.classList.remove('on');
      listenBtn.textContent = '🎤 Écoute mon piano';
    }
    instRow.style.display = listening ? 'none' : '';
    build();
  }

  const octaveRow = h('div', { class: 'row center octave-row' }, shiftL, h('span', { class: 'small-help' }, 'Octave'), shiftR);
  const rotateHint = h('div', { class: 'rotate-hint static', hidden: true }, '🔄 Tourne le téléphone pour voir tout le clavier');
  const page = h(
    'div',
    { class: 'page free-page with-nav' },
    topBar(p, { title: 'Piano libre' }),
    h('div', { class: 'free-controls' }, instRow, h('div', { class: 'row' }, namesBtn, listenBtn)),
    sky,
    rotateHint,
    octaveRow,
    kbWrap,
  );
  app.append(page, bottomNav('free'));
  requestAnimationFrame(build);
  const onResize = () => alive && build();
  window.addEventListener('resize', onResize);
  keepAwake();
  return {
    destroy() {
      alive = false;
      window.removeEventListener('resize', onResize);
      if (unsub) unsub();
    },
  };
}
