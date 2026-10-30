// « Pareil ou différent ? » : deux notes, est-ce la même ? Les écarts rétrécissent peu à peu.
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError } from '../audio.js';
import { starsFromMistakes } from './shell.js';

export const config = () => ({ allowMode: false, kb: { range: [55, 79], interactive: false } });

export default function samediff(shell, mission, finish) {
  const rounds = mission.rounds || 8;
  const gaps = [12, 7, 5, 4, 3, 2, 2, 1, 1, 1];
  let round = 0;
  let mistakes = 0;
  let a = 0;
  let b = 0;
  let alive = true;
  let locked = true;
  // au moins 3 fois « pareil », mélangées
  const same = Array.from({ length: rounds }, (_, i) => i % 3 === 1).sort(() => Math.random() - 0.5);

  const counter = h('div', { class: 'counter' });
  const sameBtn = h(
    'button',
    { class: 'hl-btn same', onclick: () => answer(true) },
    h('span', { class: 'hl-emoji' }, '👯'),
    h('span', {}, 'Pareil'),
  );
  const diffBtn = h(
    'button',
    { class: 'hl-btn diff', onclick: () => answer(false) },
    h('span', { class: 'hl-emoji' }, '🙃'),
    h('span', {}, 'Différent'),
  );
  const replay = h(
    'button',
    { class: 'icon-btn sound-round', 'aria-label': 'Réécouter', onclick: () => !locked && playPair() },
    '🔊',
  );
  shell.stage.append(counter, h('div', { class: 'hl-row' }, sameBtn, replay, diffBtn));

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
    const gap = gaps[Math.min(round, gaps.length - 1)];
    a = 60 + Math.floor(Math.random() * 8);
    b = same[round] ? a : a + (Math.random() < 0.5 ? -gap : gap);
    if (round === 0) await shell.say('Écoute les deux notes. C’est la même note, ou deux notes différentes ?', 'think');
    else shell.say('Écoute…', 'think', false);
    await wait(300);
    playPair();
  }

  async function answer(saidSame) {
    if (locked || !alive) return;
    locked = true;
    const isSame = a === b;
    shell.keyboard.setTargets(isSame ? [a] : [a, b], { label: true });
    if (saidSame === isSame) {
      sfxSuccess();
      shell.say(isSame ? 'Oui ! C’était deux fois la même note. 👯' : 'Oui ! Deux notes différentes. 👂', 'excited', false);
    } else {
      mistakes++;
      sfxError();
      shell.say(
        isSame ? 'Non, c’était la même note, deux fois.' : 'Non, elles étaient différentes, regarde les deux touches !',
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
