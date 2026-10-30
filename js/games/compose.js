// « Le compositeur » : l'enfant invente sa musique, Cosmo la rejoue avec un accompagnement.
// Modes : 'answer' (Cosmo joue une question, l'enfant répond en finissant sur Do),
// 'free' (une mélodie libre, qui rentre à la maison sur Do), 'black' (mélodie sur les touches noires).
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError, sfxBigSuccess } from '../audio.js';
import { pc, noteName, noteColor, noteTextColor, isBlack, rangeFor } from '../music.js';
import { currentProfile, updateProfile } from '../state.js';
import { starsFromMistakes } from './shell.js';

const BLACK = [61, 63, 66, 68, 70];

export const config = (m) => ({ allowMode: true, kb: { range: rangeFor(m.mode === 'black' ? BLACK : m.notes) } });

const BEAT = 0.42;

// Basse d'accompagnement pour une note de la mélodie
function bassFor(m, black) {
  if (black) return [6, 10, 1].includes(pc(m)) ? 42 : 49; // Fa♯ ou Do♯ graves
  return [0, 4, 7, 9].includes(pc(m)) ? 48 : 43; // Do ou Sol graves
}

// Joue une mélodie (avec accompagnement) et allume chaque bulle. Renvoie la durée en secondes.
export function playMelody(notes, { bubbles = [], black = false, alive = () => true } = {}) {
  notes.forEach((m, i) => {
    const t = i * BEAT;
    playNote(m, { when: t, dur: BEAT * 0.95 });
    if (i % 2 === 0) playNote(bassFor(m, black), { when: t, dur: BEAT * 1.9, vel: 0.55 });
    setTimeout(() => {
      if (!alive()) return;
      bubbles.forEach((b, j) => b.classList.toggle('now', j === i));
    }, t * 1000);
  });
  const total = notes.length * BEAT;
  setTimeout(() => alive() && bubbles.forEach((b) => b.classList.remove('now')), total * 1000 + 300);
  return total;
}

export default function compose(shell, mission, finish) {
  const mode = mission.mode || 'free';
  const black = mode === 'black';
  const allowed = black ? BLACK : mission.notes;
  const len = mission.len || (mode === 'answer' ? 4 : 8);
  const questions = mission.questions || [];
  const rounds = mode === 'answer' ? mission.rounds || questions.length : 1;
  let round = 0;
  let retries = 0;
  let melody = [];
  let accepting = false;
  let alive = true;

  const counter = h('div', { class: 'counter' });
  const question = h('div', { class: 'cmp-row cmp-question' });
  const slots = h('div', { class: 'cmp-row' });
  const actions = h('div', { class: 'row center' });
  shell.stage.append(counter, question, slots, actions);
  shell.dock(actions);

  const okPc = (m) => allowed.some((a) => pc(a) === pc(m));
  const isEnd = () => pc(melody[melody.length - 1]) === 0;

  function bubble(m, cls = '') {
    const b = h('div', { class: 'cmp-note ' + cls }, noteName(m));
    b.style.background = noteColor(m);
    b.style.color = noteTextColor(m);
    if (isBlack(m)) b.classList.add('black-note');
    return b;
  }

  function renderSlots() {
    slots.innerHTML = '';
    const n = Math.max(len, melody.length);
    for (let i = 0; i < n; i++) slots.append(i < melody.length ? bubble(melody[i]) : h('div', { class: 'cmp-note empty' }, '?'));
  }

  function setActions(...btns) {
    actions.innerHTML = '';
    actions.append(...btns);
  }

  const btn = (label, onclick, cls = 'btn ghost') => h('button', { class: cls, onclick }, label);

  async function playQuestion() {
    accepting = false;
    shell.inputEnabled = false;
    const q = questions[round];
    const bs = [...question.children];
    await wait(playMelody(q, { bubbles: bs, alive: () => alive }) * 1000 + 200);
    if (!alive) return;
    shell.inputEnabled = true;
    accepting = true;
  }

  async function startRound() {
    if (!alive) return;
    melody = [];
    renderSlots();
    if (mode === 'answer') {
      counter.textContent = `${round + 1} / ${rounds}`;
      question.innerHTML = '';
      questions[round].forEach((m) => question.append(bubble(m, 'q')));
      setActions(
        btn('🔊 La question', () => accepting && playQuestion(), 'btn sound'),
        btn('↺ Effacer', clear),
      );
      await shell.say(
        round === 0
          ? 'Écoute ma question… puis réponds avec 4 notes. Ta dernière note doit être Do, la maison !'
          : 'Nouvelle question !',
        'think',
        round === 0,
      );
      if (!alive) return;
      await playQuestion();
      shell.say(`À toi ! Réponds avec ${len} notes, et finis sur Do.`, 'happy', false);
    } else {
      question.style.display = 'none';
      setActions(btn('↺ Effacer', clear));
      shell.say(
        black
          ? `Sur les touches noires, toutes les notes vont bien ensemble ! Invente une mélodie de ${len} notes.`
          : `Invente ta chanson : joue ${len} notes, et finis sur Do pour rentrer à la maison !`,
        'happy',
      );
      accepting = true;
    }
  }

  function clear() {
    if (!alive) return;
    melody = [];
    renderSlots();
    accepting = true;
  }

  shell.expect = (m) => accepting && okPc(m);
  shell.handler = (m) => {
    if (!accepting || !alive) return;
    if (!okPc(m)) {
      shell.keyboard.flash(m, 'bad');
      shell.say(
        black ? 'Seulement les touches noires, ici !' : `Utilise seulement ${allowed.map((a) => noteName(a)).join(', ')}.`,
        'oops',
        false,
      );
      return;
    }
    shell.keyboard.flash(m, 'good');
    melody.push(m);
    renderSlots();
    if (melody.length < len) return;
    // la mélodie est assez longue : pour une fin, il faut rentrer sur Do (sauf sur les touches noires)
    if (!black && !isEnd()) {
      if (mode === 'answer') {
        accepting = false;
        retries++;
        sfxError();
        shell.say(`Ta réponse finit sur ${noteName(m)}… Essaie de finir sur Do, la maison ! 🏠`, 'oops', false);
        setTimeout(clear, 1600);
      } else if (melody.length >= len + 4) {
        // on aide : le Do final est ajouté pour rentrer à la maison
        melody.push(60);
        renderSlots();
        done();
      } else shell.say('Presque ! Continue jusqu’à un Do pour finir ta chanson. 🏠', 'think', false);
      return;
    }
    done();
  };

  async function done() {
    accepting = false;
    shell.inputEnabled = false;
    sfxSuccess();
    if (mode === 'answer') {
      shell.say('Bravo ! Écoute notre duo : ma question et ta réponse. 🎶', 'excited', false);
      await wait(700);
      const all = [...questions[round], ...melody];
      const bs = [...question.children, ...slots.children];
      await wait(playMelody(all, { bubbles: bs, alive: () => alive }) * 1000 + 400);
      if (!alive) return;
      round++;
      shell.setProgress(round / rounds);
      shell.inputEnabled = true;
      if (round >= rounds) {
        alive = false;
        finish(starsFromMistakes(retries, rounds));
      } else startRound();
      return;
    }
    // mélodie libre : Cosmo la rejoue avec un accompagnement, et on la garde dans l'album
    saveComposition();
    shell.setProgress(1);
    shell.say('Quelle belle chanson ! Écoute, je la joue avec l’orchestre. 🎻', 'excited', false);
    await wait(600);
    await replay();
    if (!alive) return;
    shell.inputEnabled = true;
    sfxBigSuccess();
    shell.say('Ta chanson est rangée dans « Chansons », tu pourras la réécouter !', 'happy', false);
    setActions(
      btn('🔁 Réécouter', () => replay()),
      btn(
        'Terminer ✓',
        () => {
          alive = false;
          finish(3);
        },
        'btn primary big',
      ),
    );
  }

  async function replay() {
    await wait(playMelody(melody, { bubbles: [...slots.children], black, alive: () => alive }) * 1000 + 300);
  }

  function saveComposition() {
    const p = currentProfile();
    if (!p) return;
    const list = [{ notes: melody.slice(), black, date: Date.now() }, ...(p.compositions || [])].slice(0, 12);
    updateProfile(p.id, { compositions: list });
  }

  renderSlots();
  setTimeout(startRound, 400);
  return {
    destroy() {
      alive = false;
    },
  };
}
