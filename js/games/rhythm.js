// « Le tambour » : les notes glissent vers la cible, on tape sur le tambour quand elles y arrivent.
// D'abord Cosmo montre le rythme (il joue tout seul), puis c'est à l'enfant.
// Durées en temps ; une durée négative est un silence (on ne tape pas).
// Option notation : chaque note montre sa figure (noire, blanche, croche, soupir…).
import { h, wait } from '../ui.js';
import { drum, getCtx, sfxSuccess } from '../audio.js';
import { figureSVG } from '../staff.js';

export const config = () => ({ allowMode: false, showKeyboard: false });

const BPM = 72;
const LEAD = 2.6; // temps (en battements) pour qu'une note traverse la piste jusqu'à la cible
const PERFECT = 0.11; // secondes
const GOOD = 0.22;

function symbol(d) {
  if (d < 0) return { cls: 'rest', label: 'chut' };
  if (d >= 4) return { cls: 'taa', label: 'ta-a-a-a' };
  if (d >= 2) return { cls: 'taa', label: 'ta-a' };
  if (d <= 0.5) return { cls: 'ti', label: 'ti' };
  return { cls: 'ta', label: 'ta' };
}

export default function rhythm(shell, mission, finish) {
  const patterns = mission.patterns;
  const notation = !!mission.notation;
  const beat = 60 / BPM;
  let idx = 0;
  let attempt = 0;
  let totalHits = 0;
  let totalNotes = 0;
  let alive = true;
  let raf = 0;
  let run = null; // passage en cours : {start, notes:[{t, el, hit}], demo}

  const counter = h('div', { class: 'counter' });
  const track = h('div', { class: 'r-track' + (notation ? ' notation' : '') }, h('div', { class: 'r-target' }));
  const feedback = h('div', { class: 'r-feedback' });
  const pad = h('button', { class: 'drum-pad', 'aria-label': 'Tambour' }, '🥁');
  const area = h('div', { class: 'r-area' }, h('div', { class: 'r-left' }, track, feedback), pad);
  shell.stage.append(counter, area);

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tap(e.timeStamp || performance.now());
  });

  function trackGeom() {
    const w = track.clientWidth || 300;
    return { w, x0: Math.min(70, w * 0.16) }; // x0 : centre de la cible
  }

  function buildRun(demo) {
    track.querySelectorAll('.r-note, .r-count').forEach((el) => el.remove());
    const p = patterns[idx];
    const start = performance.now() + 400; // instant du premier « top » du décompte
    const notes = [];
    // décompte : 4 tops (1 2 3 4) puis le rythme
    for (let i = 0; i < 4; i++) {
      const el = h('div', { class: 'r-count' }, String(i + 1));
      track.append(el);
      notes.push({ t: start + i * beat * 1000, el, count: true });
    }
    let t = 4 * beat;
    for (const d of p) {
      const s = symbol(d);
      const rest = d < 0;
      const len = Math.abs(d);
      const el = h(
        'div',
        { class: 'r-note ' + s.cls },
        ...[
          notation ? h('span', { class: 'r-fig', html: figureSVG(len, { rest }) }) : null,
          !rest && len >= 2 ? h('span', { class: 'r-tail' }) : null,
          h('span', { class: 'r-dot' }, rest ? '🤫' : ''),
          h('small', {}, s.label),
        ].filter(Boolean),
      );
      track.append(el);
      notes.push({ t: start + t * 1000, el, dur: len, rest, hit: false });
      t += len * beat;
    }
    const first = notes.find((n) => !n.count && !n.rest);
    // sons : le décompte (et tout le rythme quand Cosmo montre), calés sur l'horloge audio
    const ctx = getCtx();
    const lat = ctx.outputLatency || ctx.baseLatency || 0.04;
    for (const n of notes) {
      if (n.count || (demo && !n.rest)) drum(Math.max(0, (n.t - performance.now()) / 1000 - lat), n === first);
    }
    return { start, notes, first, demo, end: start + t * 1000 + 600, stray: 0 };
  }

  function frame() {
    if (!alive || !run) return;
    const now = performance.now();
    const { w, x0 } = trackGeom();
    const pxPerSec = (w - x0) / (LEAD * beat);
    track.querySelector('.r-target').style.left = x0 + 'px';
    for (const n of run.notes) {
      const x = x0 + ((n.t - now) / 1000) * pxPerSec;
      n.el.style.transform = `translateX(${x}px)`;
      const tail = n.dur >= 2 && n.el.querySelector('.r-tail');
      if (tail) tail.style.width = n.dur * beat * pxPerSec + 'px';
      n.el.style.opacity = x < -40 || x > w + 40 ? 0 : 1;
      if (!n.count && !n.rest && !n.hit && !n.missed && now - n.t > GOOD * 1000) {
        n.missed = true;
        n.el.classList.add('miss');
        if (!run.demo) say('Raté', 'miss');
      }
      if (run.demo && !n.count && !n.rest && !n.hit && now >= n.t) {
        n.hit = true;
        n.el.classList.add('good');
        flashTarget();
      }
    }
    if (now > run.end) {
      const r = run;
      run = null;
      endRun(r);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function say(text, cls) {
    feedback.textContent = text;
    feedback.className = 'r-feedback ' + cls;
    feedback.classList.remove('pop');
    void feedback.offsetWidth;
    feedback.classList.add('pop');
  }

  function flashTarget() {
    const tg = track.querySelector('.r-target');
    tg.classList.remove('flash');
    void tg.offsetWidth;
    tg.classList.add('flash');
  }

  function tap(at) {
    drum(0, false);
    pad.classList.remove('hit');
    void pad.offsetWidth;
    pad.classList.add('hit');
    if (!run || run.demo) return;
    // la note la plus proche pas encore jouée
    let best = null;
    let bestD = Infinity;
    for (const n of run.notes) {
      if (n.count || n.rest || n.hit || n.missed) continue;
      const d = Math.abs(at - n.t) / 1000;
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (!best || bestD > GOOD) {
      // coup dans le vide (pendant le rythme) : taper sans arrêt ne marche pas
      if (run.first && at > run.first.t - GOOD * 1000) {
        run.stray++;
        // pendant un silence : on se tait !
        const hush = run.notes.some((n) => n.rest && at >= n.t - GOOD * 1000 && at <= n.t + n.dur * beat * 1000 - GOOD * 1000);
        say(hush ? 'Chut ! C’est un silence 🤫' : 'Attends que la note arrive !', 'miss');
      }
      return;
    }
    best.hit = true;
    best.el.classList.add('good');
    flashTarget();
    if (bestD <= PERFECT) say('Parfait ! ⭐', 'perfect');
    else say('Bien !', 'ok');
  }

  async function endRun(r) {
    if (!alive) return;
    if (r.demo) {
      say('', '');
      shell.say('À toi ! Tape sur le tambour quand une note arrive dans le cercle.', 'happy', false);
      await wait(700);
      if (alive) startRun(false);
      return;
    }
    const notes = r.notes.filter((n) => !n.count && !n.rest);
    const hits = notes.filter((n) => n.hit).length;
    const ok = hits / notes.length >= 0.75 && r.stray <= Math.max(1, notes.length / 2);
    if (ok || attempt >= 1) {
      // les coups dans le vide font perdre des points
      totalHits += Math.max(0, hits - r.stray);
      totalNotes += notes.length;
    }
    if (ok) {
      sfxSuccess();
      shell.say(hits === notes.length ? 'Tout juste, super batteur ! 🥁' : 'Bravo, c’est le bon rythme !', 'excited', false);
      await wait(1300);
      next();
    } else if (attempt === 0) {
      attempt = 1;
      shell.say(
        r.stray > Math.max(1, notes.length / 2)
          ? 'Trop de coups ! Tape seulement quand une note est dans le cercle.'
          : `Tu en as eu ${hits} sur ${notes.length}. On réessaie !`,
        'oops',
        false,
      );
      await wait(1400);
      if (alive) startRun(false);
    } else {
      shell.say('Pas grave, on passe au suivant !', 'happy', false);
      await wait(1300);
      next();
    }
  }

  function startRun(demo) {
    cancelAnimationFrame(raf);
    run = buildRun(demo);
    raf = requestAnimationFrame(frame);
  }

  function next() {
    if (!alive) return;
    idx++;
    attempt = 0;
    shell.setProgress(idx / patterns.length);
    if (idx >= patterns.length) {
      alive = false;
      const r = totalNotes ? totalHits / totalNotes : 0;
      finish(r >= 0.85 ? 3 : r >= 0.6 ? 2 : 1);
      return;
    }
    start();
  }

  async function start() {
    counter.textContent = `${idx + 1} / ${patterns.length}`;
    say('', '');
    if (idx === 0) {
      await shell.say('Les notes glissent vers le cercle. Regarde et écoute d’abord !', 'happy');
      if (!alive) return;
    } else shell.say('Écoute le nouveau rythme…', 'think', false);
    await wait(400);
    if (alive) startRun(true);
  }

  start();
  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
    },
  };
}
