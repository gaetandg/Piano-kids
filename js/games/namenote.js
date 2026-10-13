// « Comment je m'appelle ? » : une touche s'allume, on choisit son nom.
import { h } from '../ui.js';
import { playNote, sfxSuccess, sfxError } from '../audio.js';
import { pc, noteName, noteColor, noteTextColor, pick } from '../music.js';
import { starsFromMistakes } from './shell.js';

export const config = (m) => ({
  allowMode: false,
  kb: { range: [Math.min(...m.notes), Math.max(...m.notes, 72)], colors: false, interactive: false },
});

export default function namenote(shell, mission, finish) {
  const notes = mission.notes;
  const rounds = mission.rounds || 10;
  let round = 0;
  let mistakes = 0;
  let target = null;
  let alive = true;
  let locked = true;

  const replay = h('button', { class: 'btn sound', onclick: () => target != null && playNote(target) }, '🔊 Réécouter');
  const choices = h('div', { class: 'choices' });
  const counter = h('div', { class: 'counter' });
  shell.stage.append(counter, choices, replay);

  // un bouton par nom de note
  const names = [...new Set(notes.map((m) => pc(m)))].sort((a, b) => a - b);
  const buttons = names.map((p) => {
    const b = h('button', { class: 'choice', onclick: () => answer(p, b) }, noteName(p + 60));
    b.style.background = noteColor(p + 60);
    b.style.color = noteTextColor(p + 60);
    choices.append(b);
    return b;
  });

  function nextRound() {
    if (!alive) return;
    if (round >= rounds) {
      alive = false;
      finish(starsFromMistakes(mistakes, rounds));
      return;
    }
    let m;
    do m = pick(notes);
    while (m === target && notes.length > 1);
    target = m;
    counter.textContent = `${round + 1} / ${rounds}`;
    buttons.forEach((b) => b.classList.remove('wrong', 'right'));
    showMystery();
    playNote(target);
    locked = false;
    if (round === 0) shell.say('Une touche s’allume. Comment s’appelle cette note ?', 'think');
    else shell.say('Et celle-là ?', 'think', false);
  }

  function answer(p, btn) {
    if (locked || !alive) return;
    if (p === pc(target)) {
      locked = true;
      btn.classList.add('right');
      sfxSuccess();
      shell.keyboard.clearMarks('mystery');
      shell.keyboard.setTargets([target], { label: true });
      shell.say(`Oui ! C’est ${noteName(target)} !`, 'excited', false);
      round++;
      shell.setProgress(round / rounds);
      setTimeout(nextRound, 1200);
    } else {
      mistakes++;
      btn.classList.add('wrong');
      sfxError();
      shell.say('Pas tout à fait… Regarde les touches noires pour t’aider !', 'oops', false);
    }
  }

  // la touche mystère : surlignée sans sa couleur, avec un « ? »
  function showMystery() {
    shell.keyboard.setTargets([]);
    shell.keyboard.clearMarks('mystery');
    shell.keyboard.mark(target, 'mystery');
  }

  shell.onRefresh = () => {
    if (alive && target != null && !locked) showMystery();
  };

  setTimeout(nextRound, 300);
  return {
    destroy() {
      alive = false;
    },
  };
}
