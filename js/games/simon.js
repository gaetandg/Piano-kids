// « Le code des Martiens » : répéter une suite de notes qui s'allonge.
import { h, wait } from '../ui.js';
import { playNote, sfxSuccess, sfxError, sfxBigSuccess } from '../audio.js';
import { pc, pick, noteColor } from '../music.js';

export const config = (m) => ({ allowMode: true, kb: { range: [Math.min(...m.notes), Math.max(...m.notes, 72)] } });

export default function simon(shell, mission, finish) {
  const notes = mission.notes;
  const goal = mission.goal || 5;
  let seq = [];
  let pos = 0;
  let lives = 3;
  let best = 0;
  let alive = true;
  let listening = false;

  const ufo = h('div', { class: 'ufo' }, '🛸');
  const code = h('div', { class: 'code-dots' });
  const livesEl = h('div', { class: 'lives' });
  const replayBtn = h('button', { class: 'btn sound', onclick: () => listening && playSeq() }, '🔊 Réécouter');
  shell.stage.append(livesEl, ufo, code, replayBtn);

  function renderCode() {
    code.innerHTML = '';
    seq.forEach((m, i) => {
      const d = h('span', { class: 'code-dot' + (i < pos ? ' on' : '') });
      if (i < pos) d.style.background = noteColor(m);
      code.append(d);
    });
    livesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
  }

  function addNote() {
    let m;
    do m = pick(notes);
    while (seq.length && m === seq[seq.length - 1] && Math.random() < 0.6);
    seq.push(m);
  }

  async function playSeq() {
    listening = false;
    pos = 0;
    renderCode();
    shell.inputEnabled = false;
    ufo.classList.add('beam');
    await wait(400);
    for (const m of seq) {
      if (!alive) return;
      shell.keyboard.setTargets([m], { label: true });
      playNote(m, { dur: 0.5 });
      await wait(650);
      shell.keyboard.setTargets([]);
      await wait(120);
    }
    ufo.classList.remove('beam');
    if (!alive) return;
    shell.inputEnabled = true;
    listening = true;
    shell.say('À toi ! Répète le code.', 'happy', false);
  }

  async function round() {
    if (!alive) return;
    shell.setProgress((seq.length - 1) / goal);
    shell.say(
      seq.length === 1 ? 'Bip bip ! Écoute mon code secret…' : `Bip bip ! Un code de ${seq.length} notes…`,
      'think',
      false,
    );
    await wait(900);
    playSeq();
  }

  shell.handler = async (m) => {
    if (!listening || !alive) return;
    if (pc(m) === pc(seq[pos])) {
      shell.keyboard.flash(m, 'good');
      pos++;
      renderCode();
      if (pos === seq.length) {
        listening = false;
        best = seq.length;
        if (seq.length >= goal) {
          sfxBigSuccess();
          shell.setProgress(1);
          shell.say('Tu as ouvert la porte du vaisseau ! 🛸', 'excited');
          await wait(1500);
          end();
          return;
        }
        sfxSuccess();
        shell.say('Code correct ! 🎉', 'excited', false);
        await wait(1100);
        addNote();
        round();
      }
    } else {
      listening = false;
      shell.keyboard.flash(m, 'bad');
      sfxError();
      lives--;
      renderCode();
      if (lives <= 0) {
        shell.say('Oh non, plus de vies ! Tu feras mieux la prochaine fois.', 'oops');
        await wait(1800);
        end();
        return;
      }
      shell.say('Oups ! Écoute encore une fois…', 'oops', false);
      await wait(1300);
      playSeq();
    }
  };

  function end() {
    if (!alive) return;
    alive = false;
    let stars = 1;
    if (best >= goal) stars = lives === 3 ? 3 : 2;
    else if (best >= goal - 1) stars = 2;
    finish(stars);
  }

  addNote();
  renderCode();
  setTimeout(round, 400);
  return {
    destroy() {
      alive = false;
    },
  };
}
