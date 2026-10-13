// « Le tambour martien » : écouter un rythme puis le refaire.
import { h, wait } from '../ui.js';
import { drum, sfxSuccess, sfxError } from '../audio.js';

export const config = () => ({ allowMode: true, showKeyboard: false });

const BPM = 76;

function symbol(d) {
  if (d >= 2) return { cls: 'taa', label: 'ta-a' };
  if (d <= 0.5) return { cls: 'ti', label: 'ti' };
  return { cls: 'ta', label: 'ta' };
}

export default function rhythm(shell, mission, finish) {
  const patterns = mission.patterns;
  const beat = 60 / BPM;
  let idx = 0;
  let attempt = 0;
  let successes = 0;
  let alive = true;
  let taps = [];
  let accepting = false;
  let evalTimer = null;

  const counter = h('div', { class: 'counter' });
  const row = h('div', { class: 'rhythm-row' });
  const pad = h('button', { class: 'drum-pad', 'aria-label': 'Tambour' }, '🥁');
  const help = h('div', { class: 'small-help' });
  const listenBtn = h('button', { class: 'btn sound', onclick: () => accepting && demo() }, '🔊 Réécouter');
  shell.stage.append(counter, row, pad, help, listenBtn);

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tap(true);
  });
  // Au vrai piano : chaque note jouée compte comme un coup de tambour
  shell.handler = (m, src) => {
    if (src === 'mic') tap(false);
  };

  function renderRow(states = []) {
    row.innerHTML = '';
    patterns[idx].forEach((d, i) => {
      const s = symbol(d);
      const el = h(
        'div',
        { class: 'rsym ' + s.cls + (states[i] ? ' ' + states[i] : '') },
        h('span', { class: 'rnote' }),
        h('small', {}, s.label),
      );
      el.style.flexGrow = d;
      row.append(el);
    });
  }

  function setLit(i) {
    [...row.children].forEach((el, k) => el.classList.toggle('lit', k === i));
  }

  async function demo() {
    accepting = false;
    taps = [];
    clearTimeout(evalTimer);
    renderRow();
    help.textContent = 'Écoute…';
    pad.classList.add('disabled');
    const p = patterns[idx];
    let t = 0;
    const startDelay = 0.3;
    p.forEach((d, i) => {
      drum(startDelay + t, i === 0);
      setTimeout(() => alive && setLit(i), (startDelay + t) * 1000);
      t += d * beat;
    });
    await wait((startDelay + t) * 1000 + 200);
    if (!alive) return;
    setLit(-1);
    pad.classList.remove('disabled');
    help.textContent =
      shell.mode === 'piano' ? 'À toi ! Tape sur le tambour ou joue une note au piano.' : 'À toi ! Tape sur le tambour.';
    shell.say('À toi !', 'happy', false);
    accepting = true;
  }

  function tap(fromPad) {
    if (fromPad) drum(0, taps.length === 0);
    pad.classList.remove('hit');
    void pad.offsetWidth;
    pad.classList.add('hit');
    if (!accepting) return;
    taps.push(performance.now() / 1000);
    setLit(taps.length - 1);
    clearTimeout(evalTimer);
    if (taps.length >= patterns[idx].length) evalTimer = setTimeout(evaluate, 250);
    else evalTimer = setTimeout(evaluate, 2500);
  }

  async function evaluate() {
    if (!alive || !accepting) return;
    accepting = false;
    setLit(-1);
    const p = patterns[idx];
    // moments attendus (en secondes, depuis le premier coup)
    const exp = [];
    let t = 0;
    for (const d of p) {
      exp.push(t);
      t += d * beat;
    }
    const act = taps.map((x) => x - taps[0]);
    const states = [];
    let ok = taps.length === p.length;
    // on accepte un tempo un peu plus lent ou plus rapide
    let scale = 1;
    if (taps.length === p.length && exp[exp.length - 1] > 0) {
      scale = act[act.length - 1] / exp[exp.length - 1];
      if (scale < 0.7 || scale > 1.45) ok = false;
      scale = Math.max(0.7, Math.min(1.45, scale));
    }
    for (let i = 0; i < p.length; i++) {
      if (i >= act.length) {
        states.push('miss');
        ok = false;
        continue;
      }
      const err = Math.abs(act[i] / scale - exp[i]) / beat;
      const good = err < 0.3;
      if (!good) ok = false;
      states.push(good ? 'good' : 'bad');
    }
    renderRow(states);
    if (ok) {
      successes++;
      sfxSuccess();
      shell.say(['Bravo, c’est le bon rythme !', 'Parfait !', 'Super batteur !'][idx % 3], 'excited', false);
      await wait(1400);
      next();
    } else if (attempt === 0) {
      attempt = 1;
      sfxError();
      shell.say(
        taps.length < p.length ? 'Il manque des coups ! Écoute encore.' : 'Presque ! Écoute encore une fois.',
        'oops',
        false,
      );
      await wait(1600);
      demo();
    } else {
      shell.say('Pas grave, on passe au suivant !', 'happy', false);
      await wait(1400);
      next();
    }
  }

  function next() {
    if (!alive) return;
    idx++;
    attempt = 0;
    shell.setProgress(idx / patterns.length);
    if (idx >= patterns.length) {
      alive = false;
      const r = successes / patterns.length;
      finish(r >= 0.8 ? 3 : r >= 0.5 ? 2 : 1);
      return;
    }
    start();
  }

  async function start() {
    counter.textContent = `${idx + 1} / ${patterns.length}`;
    renderRow();
    if (idx === 0) {
      await shell.say('Les Martiens jouent du tambour ! Écoute le rythme, puis refais-le.', 'happy');
      if (!alive) return;
    } else shell.say('Écoute le nouveau rythme…', 'think', false);
    await wait(500);
    demo();
  }

  start();
  return {
    destroy() {
      alive = false;
      clearTimeout(evalTimer);
    },
  };
}
