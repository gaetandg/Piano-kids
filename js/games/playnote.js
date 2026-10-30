// « La fusée » : une note est affichée (son nom, ou sur une portée), l'enfant la joue.
// Options de mission : hand ('left'), exact (la bonne octave compte), display ('staff'), colors,
// ear (la note est seulement jouée : on la retrouve à l'oreille).
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError } from '../audio.js';
import { pc, noteName, noteColor, noteTextColor, pick, FINGERS_C, FINGERS_LEFT, rangeFor, isBlack } from '../music.js';
import { staffSVG } from '../staff.js';
import { starsFromMistakes } from './shell.js';

export const config = (m) => ({ allowMode: true, kb: { range: rangeFor(m.notes) } });

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
  const ear = !!mission.ear;
  const matches = (m) => (exact ? m === target : pc(m) === pc(target));

  const bubbleNote = h('div', { class: staff ? 'staff-box' : 'note-bubble' });
  const finger = h('div', { class: 'finger-hint' });
  const counter = h('div', { class: 'counter' });
  shell.stage.append(counter, bubbleNote, finger);
  if (ear) {
    // réécouter la note, ou le Do de la maison pour comparer
    const row = h(
      'div',
      { class: 'row center' },
      h('button', { class: 'btn sound', onclick: () => !busy && playTarget() }, '🔊 Réécouter'),
      h('button', { class: 'btn ghost', onclick: () => !busy && playNote(60, { dur: 0.7 }) }, '🏠 Le Do'),
    );
    shell.stage.append(row);
    shell.dock(row);
  }

  function playTarget() {
    if (alive && target != null) playNote(target, { dur: 0.8 });
  }

  function showTarget(withName = false) {
    if (staff) {
      bubbleNote.innerHTML = staffSVG([{ midi: target }], {
        width: 240,
        colors: mission.colors !== false,
        names: withName,
        clef: mission.clef,
      });
    } else if (ear && !withName) {
      bubbleNote.textContent = '?';
      bubbleNote.style.background = 'linear-gradient(#a55eea, #5d5cff)';
      bubbleNote.style.color = '#fff';
      bubbleNote.classList.remove('black-note');
    } else {
      bubbleNote.textContent = noteName(target).toUpperCase();
      bubbleNote.style.background = noteColor(target);
      bubbleNote.style.color = noteTextColor(target);
      bubbleNote.classList.toggle('black-note', isBlack(target));
    }
    bubbleNote.classList.remove('pop');
    void bubbleNote.offsetWidth;
    bubbleNote.classList.add('pop');
    const f = fingers[target];
    finger.textContent =
      (staff || ear) && !withName ? '' : f ? `${left ? 'Main gauche, doigt' : 'Doigt'} ${f}` : left ? 'Main gauche' : '';
  }

  function hint() {
    shell.keyboard.setTargets([target], { label: true });
    if (staff || ear) showTarget(true);
  }

  async function nextRound() {
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
    counter.textContent = `${round + 1} / ${rounds}`;
    showTarget();
    if (ear) {
      await shell.say(round === 0 ? 'Écoute bien ma note… et retrouve-la sur le piano !' : 'Écoute…', 'think', round === 0);
      if (!alive) return;
      await wait(250);
      playTarget();
    } else if (staff)
      shell.say(round === 0 ? 'Quelle est cette note ? Joue-la sur le piano !' : 'Et celle-ci ?', 'think', round === 0);
    else shell.say(round === 0 ? `Joue la note ${noteName(target)} !` : `${noteName(target)} !`, 'happy', true);
    busy = false;
    clearTimeout(hintTimer);
    // à l'oreille : on rejoue la note plutôt que de montrer la touche
    hintTimer = setTimeout(() => alive && !busy && (ear ? playTarget() : hint()), ear ? 8000 : 7000);
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
      if (ear) {
        showTarget(true);
        shell.say(`Bravo, c’était ${noteName(target)} ! 👂`, 'excited', false);
      } else shell.say(['Bravo !', 'Super !', 'Oui !', 'Génial !', 'Parfait !'][round % 5], 'excited', false);
      setTimeout(nextRound, ear ? 1300 : 900);
    } else {
      if (!ear || missRound === 0) mistakes++; // à l'oreille, une seule erreur comptée par note
      missRound++;
      shell.keyboard.flash(m, 'bad');
      sfxError();
      if (pc(m) === pc(target))
        shell.say(
          `C’est bien ${noteName(m)}, mais ${m > target ? 'plus grave' : 'plus aigu'}${left ? ' : avec ta main gauche, en bas !' : ' !'}`,
          'oops',
          false,
        );
      else if (ear) {
        shell.say(
          `Ça, c’est ${noteName(m)}. ${missRound >= 2 ? 'Regarde, c’est cette touche !' : `Ma note est plus ${target > m ? 'aiguë' : 'grave'}. Écoute encore…`}`,
          'oops',
          false,
        );
        setTimeout(playTarget, 700);
      } else
        shell.say(
          staff
            ? `Ça, c’est ${noteName(m)}. Regarde bien la portée !`
            : `Ça, c’est ${noteName(m)}. Cherche ${noteName(target)} !`,
          'oops',
          false,
        );
      if (missRound >= (ear ? 2 : 1)) hint();
    }
  };

  shell.onRefresh = () => {
    if (alive && target != null && missRound >= (ear ? 2 : 1)) hint();
  };

  setTimeout(nextRound, 400);
  return {
    destroy() {
      alive = false;
      clearTimeout(hintTimer);
    },
  };
}
