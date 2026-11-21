// « Pluie de notes » : les notes tombent au-dessus de leur touche, on les joue quand elles touchent la ligne.
// Vitesses : tortue (les notes attendent la bonne touche), lapin (lent), fusée (rapide).
import { h, wait } from '../ui.js';
import { noteColor, noteName, isBlack, pc, foldIntoRange } from '../music.js';
import { getSong } from '../songs.js';
import { currentProfile } from '../state.js';

export const SPEEDS = {
  tortue: { label: 'Tortue', icon: '🐢', tempo: 0.6, lead: 3.4, wait: true, hint: true },
  lapin: { label: 'Lapin', icon: '🐇', tempo: 0.6, lead: 3.0, wait: false, hint: true },
  fusee: { label: 'Fusée', icon: '🚀', tempo: 0.9, lead: 2.4, wait: false, hint: false },
  comete: { label: 'Comète', icon: '☄️', tempo: 1.2, lead: 1.9, wait: false, hint: false },
};

// La chanson à jouer : une chanson de la bibliothèque, ou une composition de l'enfant (« comp:0 »).
export function rainSong(id) {
  if (id.startsWith('comp:')) {
    const p = currentProfile();
    const c = p && (p.compositions || [])[+id.slice(5)];
    if (!c) return null;
    return {
      id,
      title: 'Ma composition',
      emoji: '✍️',
      bpm: 110,
      notes: c.notes.map((midi) => ({ midi, dur: 1 })),
      hands: 'right',
    };
  }
  return getSong(id);
}

export const config = (m) => {
  const s = rainSong(m.song);
  const ms = s.notes.map((n) => n.midi);
  return { allowMode: true, kb: { range: [Math.min(...ms), Math.max(...ms)] } };
};

const PERFECT = 0.13; // secondes
const GOOD = 0.3;
const MIC_DELAY = 0.12; // le micro entend la note un peu après qu'elle est jouée

export default function rain(shell, mission, finish) {
  const song = rainSong(mission.song);
  const sp = SPEEDS[mission.speed] || SPEEDS.tortue;
  const beat = 60 / ((song.bpm || 96) * sp.tempo);
  const twoHands = song.hands && song.hands !== 'right';
  const flat = song.notes.some((n) => n.flat);
  // à l'écran on vise la bonne touche ; au micro, la bonne note (et la bonne octave à deux mains)
  const exact = () => shell.mode === 'screen' || ((twoHands || !!mission.exact) && shell.octaveStrict());
  const matches = (m, n) => (exact() ? m === n.midi : pc(m) === pc(n.midi));

  let t = 0;
  const notes = song.notes.map((n) => {
    const o = { midi: n.midi, dur: n.dur || 1, t, state: 'wait', tries: 0, at: 0 };
    t += (n.dur || 1) * beat;
    return o;
  });
  const total = notes.length;

  let alive = true;
  let raf = 0;
  let clock = -sp.lead; // temps de la chanson (s) ; la 1re note touche la ligne à 0
  let last = 0;
  let running = false;
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let hits = 0;
  let perfects = 0;
  let firstTry = 0;
  let pops = []; // textes « Parfait ! » qui s'envolent
  let cols = new Map(); // midi → {x, w} (position de la touche)

  const box = h('div', { class: 'rain-box' });
  const canvas = h('canvas', { class: 'rain-canvas' });
  const hud = h(
    'div',
    { class: 'rain-hud' },
    h('span', { class: 'rain-score' }, '0'),
    h('span', { class: 'rain-speed' }, sp.icon),
    h('span', { class: 'rain-combo' }),
  );
  const countEl = h('div', { class: 'rain-count' });
  box.append(canvas, hud, countEl);
  shell.stage.append(box);
  shell.stage.classList.add('rain-stage');
  shell.root.classList.add('rain-game');
  const ctx = canvas.getContext('2d');
  box._rain = { notes, clock: () => clock }; // pour les tests automatiques

  function layout() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = new Map();
    if (!shell.keyboard) return;
    for (const m of shell.keyboard.midis()) {
      const k = shell.keyboard.rectOf(m);
      if (k) cols.set(m, { x: k.left + k.width / 2 - r.left, w: k.width });
    }
  }

  function colOf(m) {
    const kb = shell.keyboard;
    const f = kb ? foldIntoRange(m, kb.from, kb.to) : m;
    return cols.get(f) || cols.get(m) || null;
  }

  function roundRect(x, y, w, hgt, r) {
    const rr = Math.min(r, w / 2, hgt / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + hgt, rr);
    ctx.arcTo(x + w, y + hgt, x, y + hgt, rr);
    ctx.arcTo(x, y + hgt, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function draw(now) {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    ctx.clearRect(0, 0, W, H);
    const lineY = H - 6;
    const speed = lineY / sp.lead; // pixels par seconde
    // prochaine note : sa colonne s'éclaire
    const next = notes.find((n) => n.state === 'wait');
    if (next && sp.hint) {
      const c = colOf(next.midi);
      if (c) {
        const g = ctx.createLinearGradient(0, 0, 0, lineY);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(255,255,255,0.13)');
        ctx.fillStyle = g;
        ctx.fillRect(c.x - c.w / 2, 0, c.w, lineY);
      }
    }
    for (const n of notes) {
      const c = colOf(n.midi);
      if (!c) continue;
      const yb = lineY - (n.t - clock) * speed;
      const len = Math.max(n.dur * beat * speed - 4, 18);
      if (yb < -4 || yb - len > H) continue;
      let alpha = 1;
      if (n.state === 'hit') {
        alpha = Math.max(0, 1 - (now - n.at) / 350);
        if (alpha <= 0) continue;
      }
      const w = Math.max(10, c.w * (isBlack(n.midi) ? 0.9 : 0.78));
      const x = c.x - w / 2;
      const y = (n.state === 'hit' ? lineY : yb) - len;
      ctx.globalAlpha = n.state === 'miss' ? 0.3 : alpha;
      roundRect(x, y, w, len, 8);
      ctx.fillStyle = n.state === 'miss' ? '#8890b0' : isBlack(n.midi) ? '#1a1a2e' : noteColor(n.midi);
      ctx.fill();
      ctx.lineWidth = n.state === 'hit' ? 4 : 2;
      ctx.strokeStyle = n.state === 'hit' ? '#fff' : isBlack(n.midi) ? '#ffd60a' : 'rgba(255,255,255,0.55)';
      ctx.stroke();
      if (len >= 20 && w >= 22) {
        ctx.fillStyle = isBlack(n.midi) ? '#ffd60a' : [2, 4, 5, 7].includes(pc(n.midi)) ? '#1a1a2e' : '#fff';
        ctx.font = `700 ${Math.min(15, w * 0.42)}px Fredoka, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(noteName(n.midi, flat), c.x, y + len - 3);
      }
      ctx.globalAlpha = 1;
    }
    // la ligne où il faut jouer
    ctx.fillStyle = '#ffd60a';
    ctx.shadowColor = '#ffd60a';
    ctx.shadowBlur = 12;
    ctx.fillRect(0, lineY, W, 4);
    ctx.shadowBlur = 0;
    // « Parfait ! », « Bien ! »…
    pops = pops.filter((p) => now - p.at < 700);
    for (const p of pops) {
      const k = (now - p.at) / 700;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.color;
      ctx.font = '700 18px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.text, Math.min(Math.max(p.x, 40), W - 40), lineY - 24 - k * 40);
      ctx.globalAlpha = 1;
    }
  }

  function pop(m, text, color) {
    const c = colOf(m);
    pops.push({ x: c ? c.x : canvas.clientWidth / 2, text, color, at: performance.now() });
  }

  function updateHud() {
    hud.children[0].textContent = String(score);
    hud.children[2].textContent = combo >= 3 ? `combo × ${combo}` : '';
    shell.setProgress(notes.filter((n) => n.state !== 'wait').length / total);
  }

  function hintKey() {
    if (!shell.keyboard) return;
    const next = notes.find((n) => n.state === 'wait');
    shell.keyboard.setTargets(sp.hint && next ? [next.midi] : [], { label: true, flat });
  }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (running) {
      const next = notes.find((n) => n.state === 'wait');
      // tortue : la chanson s'arrête quand la note arrive sur la ligne, jusqu'à ce qu'on la joue
      if (sp.wait && next && clock + dt >= next.t) clock = Math.max(clock, next.t);
      else clock += dt;
      if (!sp.wait) {
        for (const n of notes) {
          if (n.state === 'wait' && clock - n.t > GOOD + (shell.mode === 'piano' ? MIC_DELAY : 0)) {
            n.state = 'miss';
            combo = 0;
            pop(n.midi, 'Raté', '#ff9a9a');
            updateHud();
            hintKey();
          }
        }
      }
      if (!notes.some((n) => n.state === 'wait') && clock > notes[total - 1].t + 1) {
        end();
        return;
      }
    }
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function addPoints(base) {
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    score += Math.round(base * (1 + Math.min(2, Math.floor(combo / 10) * 0.5)));
  }

  // la note attendue : celle qui arrive sur la ligne en ce moment (sert aussi à rattraper un doigt un peu à côté)
  shell.expect = (m) =>
    notes.some(
      (n) =>
        n.state === 'wait' &&
        matches(m, n) &&
        (sp.wait ? n === notes.find((x) => x.state === 'wait') : Math.abs(n.t - clock) <= GOOD + MIC_DELAY),
    );
  shell.handler = (m, source) => {
    if (!running || !alive) return;
    if (sp.wait) {
      const n = notes.find((x) => x.state === 'wait');
      if (!n) return;
      if (n.t - clock > 0.6) return; // trop tôt : la note n'est pas encore là
      if (matches(m, n)) {
        n.state = 'hit';
        n.at = performance.now();
        hits++;
        if (n.tries === 0) firstTry++;
        addPoints(n.tries === 0 ? 100 : 40);
        if (n.tries === 0) pop(m, combo >= 5 ? `Super ! ×${combo}` : 'Bravo !', '#ffd60a');
        shell.keyboard.flash(m, 'good');
      } else {
        n.tries++;
        combo = 0;
        shell.keyboard.flash(m, 'bad');
        pop(m, noteName(m, flat) + ' ?', '#ff9a9a');
      }
      updateHud();
      hintKey();
      return;
    }
    const at = clock - (source === 'mic' ? MIC_DELAY : 0);
    let best = null;
    for (const n of notes) {
      if (n.state !== 'wait' || !matches(m, n)) continue;
      const d = Math.abs(n.t - at);
      if (d <= GOOD && (!best || d < Math.abs(best.t - at))) best = n;
    }
    if (!best) {
      // fausse note : pas de point, le combo repart à zéro
      combo = 0;
      shell.keyboard.flash(m, 'bad');
      updateHud();
      return;
    }
    best.state = 'hit';
    best.at = performance.now();
    hits++;
    const perfect = Math.abs(best.t - at) <= PERFECT;
    if (perfect) perfects++;
    addPoints(perfect ? 100 : 60);
    pop(m, perfect ? (combo >= 5 ? `Parfait ! ×${combo}` : 'Parfait !') : 'Bien !', perfect ? '#ffd60a' : '#7bed9f');
    shell.keyboard.flash(m, 'good');
    updateHud();
    hintKey();
  };

  shell.onRefresh = () => {
    layout();
    hintKey();
  };

  function end() {
    if (!alive) return;
    alive = false;
    running = false;
    cancelAnimationFrame(raf);
    if (shell.keyboard) shell.keyboard.setTargets([]);
    const acc = sp.wait ? firstTry / total : hits / total;
    const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    finish(stars, {
      rain: true,
      score,
      acc: Math.round(acc * 100),
      maxCombo,
      perfects,
      speed: mission.speed,
    });
  }

  async function start() {
    layout();
    hintKey();
    last = performance.now();
    raf = requestAnimationFrame(frame);
    await shell.say(
      sp.wait
        ? 'Les notes tombent au-dessus de leur touche. Joue chaque note quand elle arrive sur la ligne jaune : elle t’attend !'
        : 'Joue chaque note au moment où elle touche la ligne jaune. Prêt ?',
      'happy',
    );
    if (!alive) return;
    for (const c of ['3', '2', '1']) {
      countEl.textContent = c;
      countEl.classList.remove('pop');
      void countEl.offsetWidth;
      countEl.classList.add('pop');
      await wait(650);
      if (!alive) return;
    }
    countEl.textContent = '';
    shell.say(sp.wait ? 'C’est parti ! 🌠' : 'C’est parti, en rythme ! 🌠', 'excited', false);
    shell.root.classList.add('rain-running'); // à l'horizontale : Cosmo se pousse pour laisser la place
    requestAnimationFrame(layout);
    last = performance.now();
    running = true;
  }

  setTimeout(start, 300);
  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      shell.stage.classList.remove('rain-stage');
      shell.root.classList.remove('rain-game', 'rain-running');
    },
  };
}
