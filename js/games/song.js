// Jouer une chanson : les notes défilent, l'app attend la bonne note.
// Options de mission : display ('staff' = lire sur une portée), colors (couleurs sur la portée).
import { h, wait } from '../ui.js';
import { playNote, sfxError } from '../audio.js';
import { pc, noteName, noteColor, noteTextColor, isBlack } from '../music.js';
import { getSong } from '../songs.js';
import { staffTrack, staffClefSVG } from '../staff.js';
import { starsFromMistakes } from './shell.js';

export const config = (m) => {
  const s = getSong(m.song);
  const lo = Math.min(...s.notes.map((n) => n.midi));
  const hi = Math.max(...s.notes.map((n) => n.midi));
  return { allowMode: true, kb: { range: [Math.min(lo, 60), Math.max(hi, 72)] } };
};

export default function songGame(shell, mission, finish) {
  const song = getSong(mission.song);
  const name = (shell.profile && shell.profile.name) || '';
  const notes = song.notes.map((n) => ({ ...n, lyric: (n.lyric || '').replace('{name}', name) }));
  const beat = 60 / (song.bpm || 96);
  let idx = 0;
  let mistakes = 0;
  let wrongHere = false;
  let alive = true;
  let demoing = false;
  let demoTimers = [];
  const staff = mission.display === 'staff';
  const twoHands = song.hands !== 'right';
  // à deux mains, l'octave compte (c'est elle qui dit quelle main joue)
  const exact = (twoHands || !!mission.exact) && shell.octaveStrict();
  const matches = (m, t) => (exact ? m === t.midi : pc(m) === pc(t.midi));
  let hintHere = !staff; // sur une portée, la touche ne s'allume qu'après une erreur

  const lane = h('div', { class: staff ? 'lane staff-lane' : 'lane' });
  const track = h('div', { class: 'lane-track' });
  lane.append(track, h('div', { class: 'lane-cursor' }));
  const listenBtn = h('button', { class: 'btn sound', onclick: () => (demoing ? stopDemo() : demo()) }, '🔊 Écouter');
  const restartBtn = h('button', { class: 'btn ghost', onclick: restart }, '↺ Recommencer');
  const controls = h('div', { class: 'row center' }, listenBtn, restartBtn);
  shell.stage.append(h('div', { class: 'song-title' }, song.emoji + ' ' + song.title), lane, controls);
  shell.dock(controls);

  let staffXs = null;
  if (staff) {
    const st = staffTrack(notes, { colors: mission.colors !== false, gap: 11, unit: 44, lead: 70 });
    track.innerHTML = st.svg;
    staffXs = st.xs;
    lane.style.height = st.height + 'px';
    lane.insertAdjacentHTML('afterbegin', staffClefSVG({ gap: 11 }));
  }
  const bubbles = staff
    ? []
    : notes.map((n, i) => {
        const b = h(
          'div',
          { class: 'nb' },
          h(
            'div',
            { class: 'nb-note' },
            h('span', { class: 'nb-name' }, noteName(n.midi)),
            n.finger ? h('span', { class: 'nb-finger' }, n.finger) : null,
          ),
          n.lyric ? h('div', { class: 'nb-lyric' }, n.lyric) : null,
        );
        b.style.setProperty('--w', Math.max(48, Math.min(120, 30 + n.dur * 30)) + 'px');
        const nn = b.firstChild;
        nn.style.background = noteColor(n.midi);
        nn.style.color = noteTextColor(n.midi);
        if (isBlack(n.midi)) nn.classList.add('black-note');
        if (twoHands) {
          b.classList.add(n.hand === 'left' ? 'lh' : 'rh');
          b.firstChild.append(h('span', { class: 'nb-hand' }, n.hand === 'left' ? 'G' : 'D'));
        } else if (n.midi < 60) b.classList.add('low');
        track.append(b);
        return b;
      });

  function scrollTo(i) {
    const j = Math.min(i, notes.length - 1);
    let x;
    if (staff) x = staffXs[j] - lane.clientWidth * 0.4;
    else {
      const b = bubbles[j];
      if (!b) return;
      x = b.offsetLeft + b.offsetWidth / 2 - lane.clientWidth * 0.32;
    }
    track.style.transform = `translateX(${-x}px)`;
  }

  function mark(i, cur) {
    if (staff) {
      track.querySelectorAll('.sn').forEach((g) => {
        const k = +g.dataset.i;
        g.classList.toggle('done', k < cur);
        g.classList.toggle('now', k === i);
      });
    } else
      bubbles.forEach((b, k) => {
        b.classList.toggle('done', k < cur);
        b.classList.toggle('now', k === i);
      });
  }

  function show() {
    mark(idx, idx);
    scrollTo(idx);
    shell.setProgress(idx / notes.length);
    if (shell.keyboard) shell.keyboard.setTargets(idx < notes.length && hintHere ? [notes[idx].midi] : [], { label: true });
  }

  shell.expect = (m) => idx < notes.length && matches(m, notes[idx]);
  shell.handler = (m) => {
    if (!alive || demoing || idx >= notes.length) return;
    const target = notes[idx];
    if (matches(m, target)) {
      shell.keyboard.flash(m, 'good');
      idx++;
      wrongHere = false;
      hintHere = !staff;
      if (idx >= notes.length) return end();
      show();
      if (idx === 1) shell.say('C’est parti, continue ! 🎶', 'excited', false);
    } else {
      shell.keyboard.flash(m, 'bad');
      if (!wrongHere) {
        mistakes++;
        wrongHere = true;
        sfxError();
      }
      if (staff && !hintHere) {
        hintHere = true;
        show();
      }
      if (exact && pc(m) === pc(target.midi))
        shell.say(
          twoHands
            ? `Bonne note, mais avec la main ${target.hand === 'left' ? 'gauche, plus grave' : 'droite, plus aiguë'} !`
            : `C’est bien ${noteName(m)}, mais ${m > target.midi ? 'plus grave' : 'plus aigu'} !`,
          'oops',
          false,
        );
      else
        shell.say(
          staff
            ? `Ça, c’est ${noteName(m)}. Regarde bien la note sur la portée !`
            : `Cherche ${noteName(target.midi)}, la touche qui brille !`,
          'oops',
          false,
        );
    }
  };

  async function end() {
    show();
    shell.keyboard.setTargets([]);
    shell.say('Bravo, tu as joué toute la chanson ! 🎉', 'excited');
    await wait(1600);
    if (!alive) return;
    alive = false;
    finish(starsFromMistakes(mistakes, notes.length));
  }

  function demo() {
    if (demoing) return;
    demoing = true;
    listenBtn.textContent = '⏹ Stop';
    shell.inputEnabled = false;
    shell.say('Écoute la chanson…', 'happy', false);
    let t = 0.2;
    notes.forEach((n, i) => {
      demoTimers.push(
        setTimeout(() => {
          if (!alive) return;
          playNote(n.midi, { dur: Math.max(0.25, n.dur * beat * 0.9) });
          mark(i, 0);
          scrollTo(i);
          if (shell.keyboard) shell.keyboard.setTargets([n.midi], { label: true });
        }, t * 1000),
      );
      t += n.dur * beat;
    });
    demoTimers.push(setTimeout(stopDemo, t * 1000 + 400));
  }

  function stopDemo() {
    demoTimers.forEach(clearTimeout);
    demoTimers = [];
    demoing = false;
    listenBtn.textContent = '🔊 Écouter';
    shell.inputEnabled = true;
    if (alive) {
      show();
      shell.say(idx === 0 ? 'À toi ! Joue la touche qui brille.' : 'À toi, continue !', 'happy', false);
    }
  }

  function restart() {
    stopDemo();
    idx = 0;
    mistakes = 0;
    wrongHere = false;
    show();
  }

  shell.onRefresh = () => {
    if (alive && !demoing) show();
  };

  show();
  if (staff) shell.say(`On lit « ${song.title} » sur la partition ! Joue la note entourée. Tu peux d’abord écouter.`, 'happy');
  else if (twoHands)
    shell.say(
      song.hands === 'left'
        ? `On joue « ${song.title} » avec la main gauche ! Joue la touche qui brille.`
        : 'Notes bleues : main gauche. Notes orange : main droite. Joue la touche qui brille !',
      'happy',
    );
  else shell.say(`On joue « ${song.title} » ! Joue la touche qui brille. Tu peux d’abord écouter.`, 'happy');
  requestAnimationFrame(() => scrollTo(idx));
  return {
    destroy() {
      alive = false;
      demoTimers.forEach(clearTimeout);
    },
  };
}
