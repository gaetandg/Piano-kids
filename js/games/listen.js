// « Écoute et choisis » : joyeux ou triste (majeur / mineur), crescendo ou decrescendo, vite ou lent,
// « qui a composé cette musique ? », « de quel pays vient cette chanson ? » et « jumelles ou pas ? » (la même note à une octave d'écart).
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError } from '../audio.js';
import { pick } from '../music.js';
import { getSong } from '../songs.js';
import { starsFromMistakes } from './shell.js';

export const config = () => ({ allowMode: false, kb: { range: [55, 79], interactive: false } });

// Pour chaque sorte de question : les réponses possibles (`a`, `b`, et parfois `c`), de gauche à droite.
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
  composer: {
    ask: 'Écoute ce début de morceau : qui l’a composé ?',
    a: { key: 'mozart', emoji: '🎻', label: 'Mozart' },
    b: { key: 'beethoven', emoji: '🎹', label: 'Beethoven' },
    c: { key: 'brahms', emoji: '🌙', label: 'Brahms' },
    yes: {
      mozart: 'Oui ! C’était Mozart. 🎻',
      beethoven: 'Oui ! C’était Beethoven. 🎹',
      brahms: 'Oui ! C’était la berceuse de Brahms. 🌙',
    },
    no: { mozart: 'Non, c’était Mozart.', beethoven: 'Non, c’était Beethoven.', brahms: 'Non, c’était Brahms.' },
  },
  country: {
    ask: 'Écoute ce début de chanson : de quel pays vient-elle ?',
    a: { key: 'uk', emoji: '🇬🇧', label: 'Angleterre' },
    b: { key: 'canada', emoji: '🇨🇦', label: 'Canada' },
    c: { key: 'japan', emoji: '🇯🇵', label: 'Japon' },
    yes: {
      uk: 'Oui ! Le pont de Londres, en Angleterre. 🇬🇧',
      canada: 'Oui ! Alouette, au Canada. 🇨🇦',
      japan: 'Oui ! Sakura, au Japon. 🇯🇵',
    },
    no: {
      uk: 'Non, c’était le pont de Londres, en Angleterre.',
      canada: 'Non, c’était Alouette, au Canada.',
      japan: 'Non, c’était Sakura, au Japon.',
    },
  },
  twins: {
    ask: 'Écoute les deux notes : ce sont des jumelles (la même note, en grave et en aigu) ou deux notes différentes ?',
    a: { key: 'twin', emoji: '👯', label: 'Jumelles' },
    b: { key: 'diff', emoji: '🙅', label: 'Différentes' },
    yes: { twin: 'Oui ! La même note, une octave plus loin. 👯', diff: 'Oui ! Deux notes différentes.' },
    no: {
      twin: 'Non, c’étaient des jumelles : la même note, une octave plus loin.',
      diff: 'Non, c’étaient deux notes différentes. Regarde leurs noms !',
    },
  },
};

// Deux notes « jumelles » (une octave d'écart) ou différentes, dans un ordre au hasard.
function twinPair(answer) {
  const a = pick([55, 57, 60, 62, 64, 65, 67]);
  const b = a + (answer === 'twin' ? 12 : pick([4, 5, 7, 9]));
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

// les morceaux de chaque compositeur (on joue leur début)
const PIECES = {
  mozart: ['mozart-nuit', 'maman'],
  beethoven: ['beethoven-elise', 'hymne'],
  brahms: ['brahms-berceuse'],
  uk: ['london-bridge'],
  canada: ['alouette'],
  japan: ['sakura'],
};
const options = (K) => [K.a, K.b, K.c].filter(Boolean);

// petits motifs (en demi-tons depuis la note de départ), version majeure
const MOTIFS = [
  [0, 4, 7, 12, 7, 4, 0],
  [0, 2, 4, 5, 7, 4, 0],
  [7, 4, 0, 4, 7, 12],
  [0, 4, 7, 4, 0],
];
const toMinor = (iv) => (iv % 12 === 4 ? iv - 1 : iv % 12 === 9 ? iv - 1 : iv);

// Joue un exemple. kind : 'mood' | 'volume' | 'tempo' ; answer : la bonne réponse. Renvoie {notes, secs}.
export function playExample(
  kind,
  answer,
  { root = pick([60, 62, 65, 67]), motif = pick(MOTIFS), piece = null, pair = null } = {},
) {
  if (kind === 'twins') {
    const notes = pair || twinPair(answer);
    notes.forEach((m, i) => playNote(m, { when: i * 0.9, dur: 0.85 }));
    return { notes, secs: 1.8 };
  }
  if (kind === 'composer' || kind === 'country') {
    // le début du morceau, avec ses vraies durées
    const song = getSong(piece || pick(PIECES[answer]));
    const beat = 60 / (song.bpm || 100);
    let t = 0;
    const notes = song.notes.slice(0, 9).map((n) => n.midi);
    song.notes.slice(0, 9).forEach((n) => {
      playNote(n.midi, { when: t, dur: Math.max(0.3, n.dur * beat * 0.95) });
      t += n.dur * beat;
    });
    return { notes, secs: t };
  }
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
    const opts = options(KINDS[kind]);
    return { kind, answer: opts[Math.floor(i / kinds.length) % opts.length].key };
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
    const replay = h(
      'button',
      { class: 'icon-btn sound-round', 'aria-label': 'Réécouter', onclick: () => !locked && play() },
      '🔊',
    );
    // trois réponses : côte à côte, le bouton pour réécouter en dessous
    row.classList.toggle('three', !!K.c);
    if (K.c) row.append(mk(K.a), mk(K.b), mk(K.c), replay);
    else row.append(mk(K.a), replay, mk(K.b));
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
    cur = {
      ...p,
      root: pick([60, 62, 65, 67]),
      motif: pick(MOTIFS),
      piece: PIECES[p.answer] ? pick(PIECES[p.answer]) : null,
      pair: p.kind === 'twins' ? twinPair(p.answer) : null,
    };
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
    if (cur.kind === 'mood' || cur.kind === 'twins')
      shell.keyboard.setTargets(cur.notes, { label: true, flat: cur.answer === 'sad' });
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
