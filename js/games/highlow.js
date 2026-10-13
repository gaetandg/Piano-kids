// « Grave ou aigu ? » : deux notes, la deuxième monte ou descend ?
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError } from '../audio.js';
import { starsFromMistakes } from './shell.js';

export const config = () => ({ allowMode: false, kb: { range: 'piano', interactive: false } });

export default function highlow(shell, mission, finish) {
  const rounds = mission.rounds || 8;
  const intervals = [12, 12, 9, 9, 7, 7, 5, 4, 4, 3];
  let round = 0;
  let mistakes = 0;
  let a = 0;
  let b = 0;
  let alive = true;
  let locked = true;

  const counter = h('div', { class: 'counter' });
  const down = h(
    'button',
    { class: 'hl-btn low', onclick: () => answer(-1) },
    h('span', { class: 'hl-emoji' }, '🐻'),
    h('span', {}, 'Plus grave'),
    h('small', {}, '⬇'),
  );
  const up = h(
    'button',
    { class: 'hl-btn high', onclick: () => answer(1) },
    h('span', { class: 'hl-emoji' }, '🐦'),
    h('span', {}, 'Plus aigu'),
    h('small', {}, '⬆'),
  );
  const replay = h(
    'button',
    { class: 'icon-btn sound-round', 'aria-label': 'Réécouter', onclick: () => !locked && playPair() },
    '🔊',
  );
  shell.stage.append(counter, h('div', { class: 'hl-row' }, down, replay, up));

  async function playPair() {
    locked = true;
    shell.keyboard.setTargets([]);
    playNote(a, { dur: 0.7 });
    await wait(900);
    if (!alive) return;
    playNote(b, { dur: 0.7 });
    await wait(500);
    locked = false;
  }

  async function nextRound() {
    if (!alive) return;
    if (round >= rounds) {
      alive = false;
      finish(starsFromMistakes(mistakes, rounds));
      return;
    }
    counter.textContent = `${round + 1} / ${rounds}`;
    const iv = intervals[Math.min(round, intervals.length - 1)];
    const dir = Math.random() < 0.5 ? -1 : 1;
    const lo = Math.max(shell.piano.from, 50);
    const hi = Math.min(shell.piano.to, 82);
    a = lo + Math.floor(Math.random() * (hi - lo - iv));
    b = a + iv;
    if (dir < 0) [a, b] = [b, a];
    if (round === 0) await shell.say('Écoute bien les deux notes. La deuxième est plus grave ou plus aiguë ?', 'think');
    else shell.say('Écoute…', 'think', false);
    await wait(300);
    playPair();
  }

  async function answer(dir) {
    if (locked || !alive) return;
    locked = true;
    const right = (b > a ? 1 : -1) === dir;
    shell.keyboard.setTargets([a, b]);
    if (right) {
      sfxSuccess();
      shell.say(b > a ? 'Oui ! Ça monte, c’est plus aigu ! 🐦' : 'Oui ! Ça descend, c’est plus grave ! 🐻', 'excited', false);
    } else {
      mistakes++;
      sfxError();
      shell.say(
        b > a ? 'Non, ça montait : plus aigu, vers la droite.' : 'Non, ça descendait : plus grave, vers la gauche.',
        'oops',
        false,
      );
    }
    round++;
    shell.setProgress(round / rounds);
    await wait(1800);
    nextRound();
  }

  setTimeout(nextRound, 300);
  return {
    destroy() {
      alive = false;
    },
  };
}
