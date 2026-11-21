// « Les accords » : jouer plusieurs notes ensemble (ou l'une après l'autre).
// Options : chords (liste d'accords), show (montrer les touches), segments (accompagner Cosmo :
// il joue un bout de mélodie, l'enfant répond avec l'accord qui va avec).
// Les « accords » peuvent aussi être une basse (une note grave de la main gauche), une quinte
// (deux notes graves) ou les deux mains (basse + accord) : pour ceux-là, l'octave compte.
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError } from '../audio.js';
import { pc, pick, noteName, noteColor, parseNote } from '../music.js';
import { starsFromMistakes } from './shell.js';

export const CHORDS = {
  C: { name: 'Do', kind: 'majeur', notes: [60, 64, 67] },
  F: { name: 'Fa', kind: 'majeur', notes: [65, 69, 72] },
  G: { name: 'Sol', kind: 'majeur', notes: [67, 71, 74] },
  Am: { name: 'La', kind: 'mineur', notes: [57, 60, 64] },
  Dm: { name: 'Ré', kind: 'mineur', notes: [62, 65, 69] },
  Em: { name: 'Mi', kind: 'mineur', notes: [64, 67, 71] },
  C3: { name: 'Do grave', kind: 'basse', notes: [48], exact: true },
  F3: { name: 'Fa grave', kind: 'basse', notes: [53], exact: true },
  G3: { name: 'Sol grave', kind: 'basse', notes: [55], exact: true },
  C5th: { name: 'Do + Sol', kind: 'quinte', notes: [48, 55], exact: true },
  'C3+C': { name: 'Do', kind: 'deux mains', notes: [48, 60, 64, 67], exact: true },
  'F3+F': { name: 'Fa', kind: 'deux mains', notes: [53, 65, 69, 72], exact: true },
  'G3+G': { name: 'Sol', kind: 'deux mains', notes: [55, 67, 71, 74], exact: true },
};
const KIND_EMOJI = { majeur: '😊', mineur: '😢', basse: '🎻', quinte: '🥁', 'deux mains': '🙌' };
const isChord = (c) => c.kind === 'majeur' || c.kind === 'mineur';
// ce qu'il faut jouer, en toutes lettres
function what(c) {
  if (c.kind === 'basse') return `le ${c.name}, avec la main gauche`;
  if (c.kind === 'quinte') return 'Do et Sol graves ensemble, avec la main gauche';
  if (c.kind === 'deux mains') return `${c.name} grave à gauche et l’accord de ${c.name} à droite`;
  return `l’accord de ${c.name}`;
}

function usedChords(m) {
  return m.segments ? m.segments.map((s) => s.chord) : m.chords;
}

export const config = (m) => {
  const all = usedChords(m).flatMap((c) => CHORDS[c].notes);
  return { allowMode: true, kb: { range: [Math.min(...all, 60), Math.max(...all, 72)] } };
};

export default function chordGame(shell, mission, finish) {
  const segments = mission.segments || null;
  const rounds = segments ? segments.length : mission.rounds || 8;
  let round = 0;
  let mistakes = 0;
  let missRound = 0;
  let alive = true;
  let busy = true;
  let got = new Set();
  let chord = null;
  let hintTimer = null;

  // la suite des accords : imposée par la chanson, ou au hasard sans répéter le même deux fois
  const plan = segments
    ? segments.map((s) => s.chord)
    : Array.from({ length: rounds }).reduce((acc) => {
        let c;
        do c = pick(mission.chords);
        while (mission.chords.length > 1 && c === acc[acc.length - 1]);
        return [...acc, c];
      }, []);

  const counter = h('div', { class: 'counter' });
  const card = h('div', { class: 'chord-card' });
  const notesLine = h('div', { class: 'chord-notes' });
  const replay = segments
    ? h('button', { class: 'btn sound', onclick: () => !busy && playSegment() }, '🔊 Réécouter Cosmo')
    : null;
  shell.stage.append(...[counter, card, notesLine, replay].filter(Boolean));
  if (replay) shell.dock(replay);
  shell.acceptChords = true; // au micro, toutes les notes d'un accord comptent

  function renderCard() {
    const c = CHORDS[chord];
    card.innerHTML = '';
    card.style.setProperty('--cc', noteColor(c.notes[0]));
    card.append(
      h('span', { class: 'chord-name' }, c.name),
      h('span', { class: 'chord-kind' }, `${c.kind} ${KIND_EMOJI[c.kind] || ''}`),
    );
    card._notes = c.notes; // pour les tests automatiques
  }

  function showNotes(on) {
    const c = CHORDS[chord];
    notesLine.innerHTML = '';
    if (!on) return;
    c.notes.forEach((m, i) => {
      const n = h('span', { class: 'chord-note' + (got.has(key(m)) ? ' ok' : '') }, noteName(m));
      n.style.background = noteColor(m);
      notesLine.append(n);
      if (i < c.notes.length - 1) notesLine.append(h('span', { class: 'chord-skip' }, '+'));
    });
  }

  function hint() {
    shell.keyboard.setTargets(CHORDS[chord].notes, { label: true });
    showNotes(true);
  }

  async function playSegment() {
    const seg = segments[round];
    busy = true;
    shell.inputEnabled = false;
    const beat = 60 / (mission.bpm || 100);
    let t = 0;
    seg.melody.split(/\s+/).forEach((tok) => {
      const [n, d] = tok.split(':');
      const dur = d ? parseFloat(d) : 1;
      playNote(parseNote(n), { when: t, dur: dur * beat * 0.95 });
      t += dur * beat;
    });
    await wait(t * 1000 + 250);
    shell.inputEnabled = true;
    busy = false;
  }

  async function nextRound() {
    if (!alive) return;
    if (round >= rounds) {
      alive = false;
      finish(starsFromMistakes(mistakes, rounds));
      return;
    }
    chord = plan[round];
    got = new Set();
    missRound = 0;
    counter.textContent = `${round + 1} / ${rounds}`;
    renderCard();
    showNotes(!!mission.show);
    shell.keyboard.setTargets(mission.show ? CHORDS[chord].notes : [], { label: true });
    const c = CHORDS[chord];
    if (segments) {
      await shell.say(round === 0 ? 'Écoute Cosmo chanter… puis joue l’accord qui va avec !' : 'Écoute…', 'think', round === 0);
      if (!alive) return;
      await playSegment();
      if (!alive) return;
      shell.say(`À toi : ${what(c)} !`, 'happy', false);
    } else {
      shell.say(
        !isChord(c)
          ? `Joue ${what(c)} !`
          : round === 0
            ? `Joue l’accord de ${c.name} ${c.kind} : trois notes ensemble, ou l’une après l’autre.`
            : `L’accord de ${c.name} ${c.kind} !`,
        'happy',
        round === 0 || !mission.show,
      );
      busy = false;
    }
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => alive && !busy && hint(), 9000);
  }

  // la note compte par son nom, ou (basses, deux mains) par sa place exacte sur le clavier
  function key(m) {
    const c = chord && CHORDS[chord];
    return c && c.exact && (shell.mode === 'screen' || shell.octaveStrict()) ? m : pc(m);
  }
  shell.expect = (m) => !!chord && CHORDS[chord].notes.some((x) => key(x) === key(m));
  shell.handler = (m) => {
    if (busy || !alive || !chord) return;
    const c = CHORDS[chord];
    if (c.notes.some((x) => key(x) === key(m))) {
      got.add(key(m));
      shell.keyboard.flash(m, 'good');
      if (mission.show || missRound) showNotes(true);
      if (got.size < new Set(c.notes.map(key)).size) return;
      // toutes les notes y sont !
      busy = true;
      clearTimeout(hintTimer);
      round++;
      shell.setProgress(round / rounds);
      sfxSuccess();
      if (shell.mode === 'screen') c.notes.forEach((x) => playNote(x, { when: 0.35, dur: 1.2, vel: 0.6 }));
      const cheers = isChord(c)
        ? ['Bravo, quel bel accord ! 🎶', 'Super !', 'Parfait !', 'Ça sonne bien !']
        : ['Boum ! Belle basse ! 🎻', 'Super !', 'Parfait !', 'Comme un vrai orchestre ! 🎶'];
      shell.say(cheers[round % 4], 'excited', false);
      setTimeout(nextRound, 1500);
    } else {
      if (missRound === 0) mistakes++;
      missRound++;
      got = new Set();
      shell.keyboard.flash(m, 'bad');
      sfxError();
      shell.say(
        isChord(c)
          ? `${noteName(m)} n’est pas dans l’accord de ${c.name}. Saute une touche entre chaque note !`
          : c.notes.some((x) => pc(x) === pc(m))
            ? `C’est bien un ${noteName(m)}, mais pas au bon endroit. Regarde les touches qui brillent !`
            : `${noteName(m)}, ce n’est pas ça. Il faut ${what(c)}.`,
        'oops',
        false,
      );
      hint();
    }
  };

  shell.onRefresh = () => {
    if (alive && chord && (mission.show || missRound)) hint();
  };

  setTimeout(nextRound, 400);
  return {
    destroy() {
      alive = false;
      clearTimeout(hintTimer);
      shell.acceptChords = false;
    },
  };
}
