// « Trouve la touche » : groupes de touches noires, les Do...
import { h, wait } from '../ui.js';
import { sfxSuccess, sfxError } from '../audio.js';
import { pc, pick, blackGroup } from '../music.js';
import { starsFromMistakes } from './shell.js';

export const config = (m) => ({ allowMode: true, kb: { range: m.range || [60, 72] } });

// Toutes les touches du même groupe noir que `m`.
function groupOf(m) {
  const p = pc(m);
  const offs = { 1: [0, 2], 3: [-2, 0], 6: [0, 2, 4], 8: [-2, 0, 2], 10: [-4, -2, 0] }[p];
  return offs ? offs.map((o) => m + o) : [m];
}

export default function findkey(shell, mission, finish) {
  let alive = true;
  let mistakes = 0;
  let round = 0;
  let missesThisRound = 0;
  let prompt = null;
  let busy = false;
  const rounds = mission.rounds || 6;

  const big = h('div', { class: 'big-prompt' });
  const counter = h('div', { class: 'counter' });
  shell.stage.append(big, counter);

  // ----- Mode « trouve tous les Do » -----
  const fa = mission.findAll;
  let found = new Set();
  let hits = 0;

  function allTargets() {
    return shell.keyboard.midis().filter((m) => pc(m) === fa.pc);
  }

  function needed() {
    if (shell.mode === 'piano') {
      let n = 0;
      for (let m = shell.piano.from; m <= shell.piano.to; m++) if (pc(m) === fa.pc) n++;
      return n;
    }
    return allTargets().length;
  }

  function renderFindAll() {
    const n = needed();
    const got = shell.mode === 'piano' ? hits : found.size;
    big.textContent = shell.mode === 'piano' ? `Joue les ${n} Do de ton piano !` : `Trouve les ${n} Do !`;
    counter.innerHTML = '';
    for (let k = 0; k < n; k++) counter.append(h('span', { class: 'cdot' + (k < got ? ' on red' : '') }, k < got ? '★' : '○'));
    shell.setProgress(got / n);
    shell.keyboard.clearMarks();
    if (shell.mode === 'screen') found.forEach((m) => shell.keyboard.mark(m));
  }

  // ----- Mode normal : une consigne par manche -----
  function nextRound() {
    if (!alive) return;
    if (round >= rounds) return done();
    missesThisRound = 0;
    const prev = prompt;
    const list = mission.prompts;
    prompt = list.length > 1 && prev && Math.random() < 0.7 ? pick(list.filter((p) => p !== prev)) : pick(list);
    renderRound();
    shell.say(prompt.text, 'happy');
  }

  function renderRound() {
    big.textContent = prompt ? prompt.text : '';
    counter.textContent = `${Math.min(round + 1, rounds)} / ${rounds}`;
    shell.setProgress(round / rounds);
    shell.keyboard.setTargets([]);
    shell.keyboard.clearMarks();
  }

  function matches(m) {
    if (!prompt.pcs.includes(pc(m))) return false;
    // En mode écran, on vérifie aussi l'endroit (grave / milieu / aigu)
    if (shell.mode === 'screen' && prompt.zone) {
      if (prompt.zone === 'middle') return m === 60;
      if (prompt.zone === 'low') return m < 60;
      if (prompt.zone === 'high') return m > 60;
    }
    return true;
  }

  function hint() {
    shell.keyboard.setTargets(shell.keyboard.midis().filter(matches));
  }

  shell.handler = (m) => {
    if (busy || !alive || (!fa && !prompt)) return;
    if (fa) {
      if (pc(m) === fa.pc) {
        if (shell.mode === 'screen') {
          if (found.has(m)) return;
          found.add(m);
        } else hits++;
        shell.keyboard.flash(m, 'good');
        sfxSuccess();
        renderFindAll();
        const got = shell.mode === 'piano' ? hits : found.size;
        if (got >= needed()) {
          busy = true;
          shell.say('Tu as trouvé tous les Do ! 🎉', 'excited');
          setTimeout(done, 1200);
        } else shell.say(['Super !', 'Bravo !', 'Encore un autre !', 'Oui !'][got % 4], 'excited', false);
      } else {
        mistakes++;
        shell.keyboard.flash(m, 'bad');
        sfxError();
        shell.say('Non, ce n’est pas un Do. Cherche les 2 touches noires !', 'oops', false);
        if (mistakes % 2 === 0) shell.keyboard.setTargets(allTargets().filter((x) => !found.has(x)));
      }
      return;
    }

    if (matches(m)) {
      busy = true;
      groupOf(m).forEach((x) => shell.keyboard.mark(x));
      shell.keyboard.flash(m, 'good');
      sfxSuccess();
      shell.say(['Bravo !', 'Super !', 'Génial !', 'Exactement !', 'Trop fort !'][round % 5], 'excited', false);
      round++;
      shell.setProgress(round / rounds);
      setTimeout(() => {
        busy = false;
        nextRound();
      }, 1100);
    } else {
      mistakes++;
      missesThisRound++;
      shell.keyboard.flash(m, 'bad');
      sfxError();
      let msg = 'Essaie encore !';
      if (prompt.pcs.includes(pc(m)) && prompt.zone)
        msg = prompt.zone === 'middle' ? 'C’est un Do, mais pas celui du milieu !' : 'C’est un Do, mais pas au bon endroit !';
      else if (blackGroup(m) && prompt.pcs.some((p) => blackGroup(p + 60))) msg = `Ça, c’est un groupe de ${blackGroup(m)} !`;
      shell.say(msg, 'oops', false);
      if (missesThisRound >= 2) hint();
    }
  };

  function done() {
    if (!alive) return;
    alive = false;
    finish(starsFromMistakes(mistakes, fa ? 4 : rounds));
  }

  shell.onRefresh = () => {
    if (!alive) return;
    if (fa) {
      found = new Set([...found].filter((m) => shell.keyboard.midis().includes(m)));
      renderFindAll();
    } else if (prompt) renderRound();
  };

  if (fa) {
    renderFindAll();
    shell.say(mission.intro || 'Trouve tous les Do !', 'happy');
  } else {
    // on laisse le temps de lire la consigne, même sans la voix
    Promise.all([shell.say(mission.intro, 'happy'), wait(2500)]).then(() => {
      if (alive && !prompt) nextRound();
    });
  }

  return {
    destroy() {
      alive = false;
    },
  };
}
