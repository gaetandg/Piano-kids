// Jouer une chanson : les notes défilent, l'app attend la bonne note.
import { h, wait } from '../ui.js';
import { playNote, sfxError } from '../audio.js';
import { pc, noteName, noteColor, noteTextColor } from '../music.js';
import { getSong } from '../songs.js';
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

  const lane = h('div', { class: 'lane' });
  const track = h('div', { class: 'lane-track' });
  lane.append(track, h('div', { class: 'lane-cursor' }));
  const listenBtn = h('button', { class: 'btn sound', onclick: () => (demoing ? stopDemo() : demo()) }, '🔊 Écouter');
  const restartBtn = h('button', { class: 'btn ghost', onclick: restart }, '↺ Recommencer');
  const controls = h('div', { class: 'row center' }, listenBtn, restartBtn);
  shell.stage.append(h('div', { class: 'song-title' }, song.emoji + ' ' + song.title), lane, controls);
  shell.dock(controls);

  const bubbles = notes.map((n, i) => {
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
    if (n.midi < 60) b.classList.add('low');
    track.append(b);
    return b;
  });

  function scrollTo(i) {
    const b = bubbles[Math.min(i, bubbles.length - 1)];
    if (!b) return;
    const x = b.offsetLeft + b.offsetWidth / 2 - lane.clientWidth * 0.32;
    track.style.transform = `translateX(${-x}px)`;
  }

  function show() {
    bubbles.forEach((b, i) => {
      b.classList.toggle('done', i < idx);
      b.classList.toggle('now', i === idx);
    });
    scrollTo(idx);
    shell.setProgress(idx / notes.length);
    if (idx < notes.length && shell.keyboard) shell.keyboard.setTargets([notes[idx].midi], { label: true });
  }

  shell.expect = (m) => idx < notes.length && pc(m) === pc(notes[idx].midi);
  shell.handler = (m) => {
    if (!alive || demoing || idx >= notes.length) return;
    const target = notes[idx];
    if (pc(m) === pc(target.midi)) {
      shell.keyboard.flash(m, 'good');
      idx++;
      wrongHere = false;
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
      shell.say(`Cherche ${noteName(target.midi)}, la touche qui brille !`, 'oops', false);
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
          bubbles.forEach((b, j) => b.classList.toggle('now', j === i));
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
  shell.say(`On joue « ${song.title} » ! Joue la touche qui brille. Tu peux d’abord écouter.`, 'happy');
  requestAnimationFrame(() => scrollTo(idx));
  return {
    destroy() {
      alive = false;
      demoTimers.forEach(clearTimeout);
    },
  };
}
