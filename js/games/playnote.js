// « La fusée » : une note est affichée, l'enfant la joue.
import { h } from '../ui.js';
import { sfxSuccess, sfxError } from '../audio.js';
import { pc, noteName, noteColor, noteTextColor, pick, FINGERS_C } from '../music.js';
import { starsFromMistakes } from './shell.js';

export const config = (m) => ({ allowMode: true, kb: { range: [Math.min(...m.notes), Math.max(...m.notes, 72)] } });

export default function playnote(shell, mission, finish) {
  const notes = mission.notes;
  const rounds = mission.rounds || 10;
  let round = 0;
  let mistakes = 0;
  let missRound = 0;
  let target = null;
  let alive = true;
  let busy = true;
  let hintTimer = null;

  const bubbleNote = h('div', { class: 'note-bubble' });
  const finger = h('div', { class: 'finger-hint' });
  const counter = h('div', { class: 'counter' });
  shell.stage.append(counter, bubbleNote, finger);

  function showTarget() {
    bubbleNote.textContent = noteName(target).toUpperCase();
    bubbleNote.style.background = noteColor(target);
    bubbleNote.style.color = noteTextColor(target);
    bubbleNote.classList.remove('pop');
    void bubbleNote.offsetWidth;
    bubbleNote.classList.add('pop');
    const f = FINGERS_C[target];
    finger.textContent = f ? `Doigt ${f}` : '';
    counter.textContent = `${round + 1} / ${rounds}`;
  }

  function hint() {
    shell.keyboard.setTargets([target], { label: true });
  }

  function nextRound() {
    if (!alive) return;
    if (round >= rounds) {
      alive = false;
      finish(starsFromMistakes(mistakes, rounds));
      return;
    }
    let m;
    do m = pick(notes);
    while (notes.length > 1 && target != null && pc(m) === pc(target));
    target = m;
    missRound = 0;
    shell.keyboard.setTargets([]);
    showTarget();
    shell.say(round === 0 ? `Joue la note ${noteName(target)} !` : `${noteName(target)} !`, 'happy', true);
    busy = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => alive && !busy && hint(), 7000);
  }

  shell.handler = (m) => {
    if (busy || !alive) return;
    if (pc(m) === pc(target)) {
      busy = true;
      clearTimeout(hintTimer);
      shell.keyboard.flash(m, 'good');
      sfxSuccess();
      round++;
      shell.setProgress(round / rounds);
      shell.say(['Bravo !', 'Super !', 'Oui !', 'Génial !', 'Parfait !'][round % 5], 'excited', false);
      setTimeout(nextRound, 900);
    } else {
      mistakes++;
      missRound++;
      shell.keyboard.flash(m, 'bad');
      sfxError();
      shell.say(`Ça, c’est ${noteName(m)}. Cherche ${noteName(target)} !`, 'oops', false);
      if (missRound >= 1) hint();
    }
  };

  shell.onRefresh = () => {
    if (alive && target != null && missRound > 0) hint();
  };

  setTimeout(nextRound, 400);
  return {
    destroy() {
      alive = false;
      clearTimeout(hintTimer);
    },
  };
}
