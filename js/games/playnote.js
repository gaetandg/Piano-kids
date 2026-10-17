// « La fusée » : une note est affichée (son nom, ou sur une portée), l'enfant la joue.
// Options de mission : hand ('left'), exact (la bonne octave compte), display ('staff'), colors.
import { h } from '../ui.js';
import { sfxSuccess, sfxError } from '../audio.js';
import { pc, noteName, noteColor, noteTextColor, pick, FINGERS_C, FINGERS_LEFT } from '../music.js';
import { staffSVG } from '../staff.js';
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
  const staff = mission.display === 'staff';
  const left = mission.hand === 'left';
  const exact = !!mission.exact && shell.octaveStrict();
  const fingers = left ? FINGERS_LEFT : FINGERS_C;
  const matches = (m) => (exact ? m === target : pc(m) === pc(target));

  const bubbleNote = h('div', { class: staff ? 'staff-box' : 'note-bubble' });
  const finger = h('div', { class: 'finger-hint' });
  const counter = h('div', { class: 'counter' });
  shell.stage.append(counter, bubbleNote, finger);

  function showTarget(withName = false) {
    if (staff) {
      bubbleNote.innerHTML = staffSVG([{ midi: target }], { width: 240, colors: mission.colors !== false, names: withName });
    } else {
      bubbleNote.textContent = noteName(target).toUpperCase();
      bubbleNote.style.background = noteColor(target);
      bubbleNote.style.color = noteTextColor(target);
    }
    bubbleNote.classList.remove('pop');
    void bubbleNote.offsetWidth;
    bubbleNote.classList.add('pop');
    const f = fingers[target];
    finger.textContent =
      staff && !withName ? '' : f ? `${left ? 'Main gauche, doigt' : 'Doigt'} ${f}` : left ? 'Main gauche' : '';
    counter.textContent = `${round + 1} / ${rounds}`;
  }

  function hint() {
    shell.keyboard.setTargets([target], { label: true });
    if (staff) showTarget(true);
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
    if (staff) shell.say(round === 0 ? 'Quelle est cette note ? Joue-la sur le piano !' : 'Et celle-ci ?', 'think', round === 0);
    else shell.say(round === 0 ? `Joue la note ${noteName(target)} !` : `${noteName(target)} !`, 'happy', true);
    busy = false;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => alive && !busy && hint(), 7000);
  }

  shell.expect = (m) => target != null && matches(m);
  shell.handler = (m) => {
    if (busy || !alive) return;
    if (matches(m)) {
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
      if (pc(m) === pc(target))
        shell.say(
          `C’est bien ${noteName(m)}, mais ${m > target ? 'plus grave' : 'plus aigu'}${left ? ' : avec ta main gauche, en bas !' : ' !'}`,
          'oops',
          false,
        );
      else
        shell.say(
          staff
            ? `Ça, c’est ${noteName(m)}. Regarde bien la portée !`
            : `Ça, c’est ${noteName(m)}. Cherche ${noteName(target)} !`,
          'oops',
          false,
        );
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
