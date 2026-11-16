// « Écoute et choisis » : joyeux ou triste (majeur / mineur), crescendo ou decrescendo, vite ou lent.
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError } from '../audio.js';
import { pick } from '../music.js';
import { starsFromMistakes } from './shell.js';

export const config = () => ({ allowMode: false, kb: { range: [55, 79], interactive: false } });

// Pour chaque sorte de question : les deux réponses (la 1re est celle de gauche).
const KINDS = {
  mood: {
    ask: 'Écoute bien : cette musique est joyeuse ou triste ?',
    a: { key: 'joy', emoji: '😊', label: 'Joyeux' },
    b: { key: 'sad', emoji: '😢', label: 'Triste' },
    yes: { joy: 'Oui ! C’était joyeux : un accord majeur. 😊', sad: 'Oui ! C’était triste : un accord mineur. 😢' },
    no: {
      joy: 'Non, c’était joyeux : un accord majeur.',
      sad: 'Non, c’était triste : un accord mineur, avec une note un peu plus grave.',
    },
  },
  volume: {
    ask: 'La musique devient de plus en plus forte, ou de plus en plus douce ?',
    a: { key: 'loud', emoji: '🦁', label: 'Plus fort' },
    b: { key: 'soft', emoji: '🐭', label: 'Plus doux' },
    yes: { loud: 'Oui ! De plus en plus fort : crescendo ! 🦁', soft: 'Oui ! De plus en plus doux : decrescendo. 🐭' },
    no: { loud: 'Non, ça devenait plus fort : crescendo.', soft: 'Non, ça devenait plus doux : decrescendo.' },
  },
  tempo: {
    ask: 'Cette musique va vite, ou lentement ?',
    a: { key: 'fast', emoji: '🐇', label: 'Vite' },
    b: { key: 'slow', emoji: '🐢', label: 'Lent' },
    yes: { fast: 'Oui ! C’était rapide : allegro ! 🐇', slow: 'Oui ! C’était lent : lento. 🐢' },
    no: { fast: 'Non, c’était rapide.', slow: 'Non, c’était lent.' },
  },
};

// petits motifs (en demi-tons depuis la note de départ), version majeure
const MOTIFS = [
  [0, 4, 7, 12, 7, 4, 0],
  [0, 2, 4, 5, 7, 4, 0],
  [7, 4, 0, 4, 7, 12],
  [0, 4, 7, 4, 0],
];
const toMinor = (iv) => (iv % 12 === 4 ? iv - 1 : iv % 12 === 9 ? iv - 1 : iv);

// Joue un exemple. kind : 'mood' | 'volume' | 'tempo' ; answer : la bonne réponse. Renvoie {notes, secs}.
export function playExample(kind, answer, { root = pick([60, 62, 65, 67]), motif = pick(MOTIFS) } = {}) {
  let iv = motif;
  if (kind === 'mood' && answer === 'sad') iv = motif.map(toMinor);
  const notes = iv.map((x) => root + x);
  const step = kind === 'tempo' ? (answer === 'fast' ? 0.16 : 0.62) : 0.34;
  let seq = notes;
  if (kind === 'volume') seq = [...notes, ...notes.slice(1, 4)]; // assez long pour entendre le changement
  seq.forEach((m, i) => {
    const k = seq.length > 1 ? i / (seq.length - 1) : 0;
    const vel = kind === 'volume' ? (answer === 'loud' ? 0.1 + 0.95 * k : 1.05 - 0.95 * k) : 0.85;
    playNote(m, { when: i * step, dur: step * 1.6, vel });
  });
  let secs = seq.length * step;
  // l'accord final, joué ensemble, pour bien entendre majeur / mineur
  if (kind === 'mood') {
    const chord = [0, answer === 'sad' ? 3 : 4, 7].map((x) => root + x);
    chord.forEach((m) => playNote(m, { when: secs + 0.1, dur: 1.2, vel: 0.6 }));
    secs += 1.1;
    return { notes: chord, secs };
  }
  return { notes, secs };
}

export default function listen(shell, mission, finish) {
  const kinds = mission.kinds || ['mood'];
  const rounds = mission.rounds || 8;
  let round = 0;
  let mistakes = 0;
  let alive = true;
  let locked = true;
  let cur = null; // {kind, answer, root, motif, notes}

  const counter = h('div', { class: 'counter' });
  const row = h('div', { class: 'hl-row listen-game' });
  shell.stage.append(counter, row);

  // une suite équilibrée de réponses et de sortes de questions
  const plan = Array.from({ length: rounds }, (_, i) => {
    const kind = kinds[i % kinds.length];
    return { kind, answer: i % 2 ? KINDS[kind].b.key : KINDS[kind].a.key };
  }).sort(() => Math.random() - 0.5);

  function buttons(kind) {
    const K = KINDS[kind];
    row.innerHTML = '';
    const mk = (o) =>
      h(
        'button',
        { class: 'hl-btn ' + o.key, onclick: () => answer(o.key) },
        h('span', { class: 'hl-emoji' }, o.emoji),
        h('span', {}, o.label),
      );
    row.append(
      mk(K.a),
      h('button', { class: 'icon-btn sound-round', 'aria-label': 'Réécouter', onclick: () => !locked && play() }, '🔊'),
      mk(K.b),
    );
  }

  async function play() {
    locked = true;
    shell.keyboard.setTargets([]);
    const { notes, secs } = playExample(cur.kind, cur.answer, cur);
    cur.notes = notes;
    await wait(secs * 1000 + 250);
    if (alive) locked = false;
  }

  async function nextRound() {
    if (!alive) return;
    if (round >= rounds) {
      alive = false;
      finish(starsFromMistakes(mistakes, rounds));
      return;
    }
    counter.textContent = `${round + 1} / ${rounds}`;
    const p = plan[round];
    cur = { ...p, root: pick([60, 62, 65, 67]), motif: pick(MOTIFS) };
    row._answer = p.answer; // pour les tests automatiques
    buttons(p.kind);
    const first = round === 0 || plan[round - 1].kind !== p.kind;
    await shell.say(first ? KINDS[p.kind].ask : 'Écoute…', 'think', first);
    if (!alive) return;
    await wait(250);
    play();
  }

  async function answer(key) {
    if (locked || !alive) return;
    locked = true;
    const K = KINDS[cur.kind];
    const ok = key === cur.answer;
    if (cur.kind === 'mood') shell.keyboard.setTargets(cur.notes, { label: true, flat: cur.answer === 'sad' });
    if (ok) {
      sfxSuccess();
      shell.say(K.yes[cur.answer], 'excited', false);
    } else {
      mistakes++;
      sfxError();
      shell.say(K.no[cur.answer], 'oops', false);
    }
    round++;
    shell.setProgress(round / rounds);
    await wait(2000);
    nextRound();
  }

  setTimeout(nextRound, 300);
  return {
    destroy() {
      alive = false;
    },
  };
}
