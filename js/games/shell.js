// Cadre commun à tous les jeux : en-tête, Cosmo, barre de progression, clavier, micro.
import { h, mascot, keepAwake, toast } from '../ui.js';
import { Keyboard } from '../keyboard.js';
import { mic, micSupported } from '../pitch.js';
import { playNote, unlockAudio } from '../audio.js';
import { say, stopSpeaking } from '../speech.js';
import * as state from '../state.js';
import { pianoPreset, screenRange } from '../music.js';
import { needsCalibration } from '../screens/calibrate.js';

export function createShell(app, opts) {
  const {
    title,
    onExit,
    allowMode = true, // l'enfant peut choisir vrai piano / écran
    showKeyboard = true,
    kb = {}, // {range:[a,b], names, colors, interactive}
    onNeedCalibration = null, // appelé si on passe au vrai piano sans avoir réglé le micro
  } = opts;

  const profile = state.currentProfile();
  const piano = pianoPreset(state.settings().piano);
  let mode = allowMode ? (profile && profile.inputMode) || 'piano' : 'screen';
  if (!micSupported()) mode = 'screen';
  let kbOpts = { ...kb };

  const root = h('div', { class: 'game' });
  const micDot = h('span', { class: 'mic-dot', title: 'Micro' }, '🎤');
  // Choix « vrai piano » / « écran » : les deux options sont visibles, celle choisie est allumée
  const pianoBtn = h('button', { onclick: () => mode !== 'piano' && setMode('piano') });
  const screenBtn = h('button', { onclick: () => mode !== 'screen' && setMode('screen') });
  const modeBtn = allowMode
    ? h('div', { class: 'mode-seg', role: 'group', 'aria-label': 'Jouer sur' }, pianoBtn, screenBtn)
    : null;
  const fill = h('div', { class: 'progress-fill' });
  const rocket = h('div', { class: 'progress-rocket' }, '🚀');
  const progress = h(
    'div',
    { class: 'progress' },
    h('div', { class: 'progress-track' }, fill),
    rocket,
    h('span', { class: 'progress-goal' }, '🪐'),
  );
  const header = h(
    'div',
    { class: 'game-header' },
    h('button', { class: 'icon-btn', 'aria-label': 'Quitter', onclick: onExit }, '✕'),
    h('div', { class: 'game-title' }, title),
    progress,
    modeBtn || h('span'),
  );
  const mascotEl = mascot('happy', 'small');
  const bubble = h('div', { class: 'bubble' });
  const actions = h('div', { class: 'talk-actions' });
  const talk = h('div', { class: 'talk' }, mascotEl, bubble, actions);
  const stage = h('div', { class: 'stage' });
  const kbWrap = h('div', { class: 'kb-wrap' });
  const rotateHint = h('div', { class: 'rotate-hint', hidden: true }, '🔄 Tourne le téléphone pour voir tout le clavier');
  root.append(header, talk, stage);
  if (showKeyboard) root.append(kbWrap);
  app.append(root);

  let unsubMic = null;
  let unsubLevel = null;
  let destroyed = false;

  const shell = {
    root,
    stage,
    kbWrap,
    talk,
    mascot: mascotEl,
    bubble,
    profile,
    piano,
    keyboard: null,
    handler: null, // (midi, source) => void
    expect: null, // (midi) => vrai si c'est une note attendue (pour choisir dans un accord)
    acceptChords: false, // vrai : toutes les notes d'un accord sont transmises au jeu
    playTaps: true, // jouer le son quand on touche l'écran
    inputEnabled: true,
    onRefresh: null, // appelé après changement de mode ou de taille
    get mode() {
      return mode;
    },
  };

  // Peut-on exiger la bonne octave ? Oui à l'écran, ou au vrai piano quand le micro est réglé.
  shell.octaveStrict = () => mode === 'screen' || !!state.settings().octaveCalibrated;

  shell.say = (text, mood = 'happy', speak = true) => {
    bubble.textContent = text;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
    mascotEl.setMood(mood);
    if (mood === 'excited') mascotEl.bounce();
    if (mood === 'oops') mascotEl.shake();
    return speak ? say(text) : Promise.resolve();
  };

  shell.setProgress = (frac) => {
    const f = Math.max(0, Math.min(1, frac));
    fill.style.width = f * 100 + '%';
    rocket.style.left = `calc(${f} * (100% - 56px) + 4px)`;
  };
  shell.setProgress(0);

  function onTap(m) {
    if (!shell.inputEnabled) return;
    if (shell.playTaps) playNote(m);
    if (shell.handler) shell.handler(m, 'touch');
  }

  function onMic(notes) {
    if (!shell.inputEnabled || destroyed) return;
    if (shell.keyboard) notes.forEach((m) => shell.keyboard.showPlayed(m));
    if (shell.acceptChords) {
      // exercice « deux notes ensemble » : chaque note de l'accord compte
      for (const x of notes) if (shell.handler && (!shell.expect || shell.expect(x))) shell.handler(x, 'mic');
      return;
    }
    // Accord : si une des notes est celle attendue, c'est elle qui compte (une seule réponse)
    const m = (shell.expect && notes.find((x) => shell.expect(x))) ?? notes[0];
    if (shell.handler) shell.handler(m, 'mic');
  }

  function computeRange() {
    if (mode === 'piano' || kbOpts.range === 'piano') return { from: piano.from, to: piano.to, full: true };
    const [a, b] = kbOpts.range || [60, 72];
    const width = kbWrap.clientWidth || app.clientWidth || window.innerWidth;
    return screenRange(a, b, piano, width);
  }

  function buildKeyboard() {
    if (!showKeyboard) return;
    const { from, to, full } = computeRange();
    // en portrait, le clavier est raccourci : on propose de tourner le téléphone
    rotateHint.hidden = full || window.innerWidth > window.innerHeight;
    const interactive = kbOpts.interactive !== false && mode === 'screen';
    shell.keyboard = new Keyboard({
      from,
      to,
      interactive,
      names: kbOpts.names || 'none',
      colors: kbOpts.colors !== false,
      onNote: onTap,
    });
    kbWrap.innerHTML = '';
    kbWrap.append(rotateHint, shell.keyboard.el);
    kbWrap.classList.toggle('display-only', !interactive);
    kbWrap.classList.toggle('full', to - from > 30);
  }

  async function startMic() {
    if (unsubMic || destroyed) return;
    try {
      unsubMic = await mic.subscribe(onMic);
      if (destroyed) {
        unsubMic();
        return;
      }
      unsubLevel = mic.onLevel((lvl, muted) => {
        micDot.style.setProperty('--lvl', muted ? 0 : Math.min(1, lvl * 25));
        micDot.classList.toggle('muted', muted);
      });
    } catch (e) {
      console.warn('Micro indisponible', e);
      toast('🎤 Micro indisponible : on joue sur l’écran.');
      setMode('screen', true);
    }
  }

  function stopMic() {
    if (unsubMic) unsubMic();
    if (unsubLevel) unsubLevel();
    unsubMic = null;
    unsubLevel = null;
  }

  function renderModeBtn() {
    if (!modeBtn) return;
    pianoBtn.innerHTML = '';
    pianoBtn.append(mode === 'piano' ? micDot : h('span', {}, '🎹'), h('span', { class: 'seg-label' }, 'Piano'));
    screenBtn.innerHTML = '';
    screenBtn.append(h('span', {}, '📱'), h('span', { class: 'seg-label' }, 'Écran'));
    pianoBtn.classList.toggle('on', mode === 'piano');
    screenBtn.classList.toggle('on', mode === 'screen');
  }

  // Téléphone à l'horizontale avec peu de hauteur : on range les boutons à côté de Cosmo
  // pour qu'ils restent visibles sans faire défiler.
  const docked = [];
  const isCompact = () => window.innerHeight < 520 && window.innerWidth > window.innerHeight;
  function placeDocked() {
    const compact = isCompact();
    root.classList.toggle('compact', compact);
    for (const d of docked) {
      if (compact) {
        if (d.el.parentNode !== actions) actions.append(d.el);
      } else if (d.el.parentNode !== d.parent) {
        d.parent.insertBefore(d.el, d.next && d.next.parentNode === d.parent ? d.next : null);
      }
    }
  }
  shell.dock = (el) => {
    docked.push({ el, parent: el.parentNode, next: el.nextSibling });
    placeDocked();
  };

  function setMode(m, silent = false) {
    if (m === 'piano' && !micSupported()) {
      toast('Ce téléphone ne permet pas d’utiliser le micro ici.');
      m = 'screen';
    }
    mode = m;
    if (profile && allowMode) state.updateProfile(profile.id, { inputMode: m });
    if (m === 'piano' && onNeedCalibration && needsCalibration()) return onNeedCalibration();
    renderModeBtn();
    buildKeyboard();
    if (mode === 'piano') startMic();
    else stopMic();
    if (!silent && modeBtn) toast(mode === 'piano' ? '🎹 Joue sur ton vrai piano, je t’écoute !' : '📱 Joue sur l’écran');
    if (shell.onRefresh) shell.onRefresh();
  }

  // Change les options du clavier (ex. d'une diapo à l'autre).
  shell.setKeyboard = (o) => {
    kbOpts = { ...kb, ...o };
    buildKeyboard();
  };

  shell.refreshKeyboard = () => buildKeyboard();

  let resizeT = null;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (destroyed) return;
      placeDocked();
      buildKeyboard();
      if (shell.onRefresh) shell.onRefresh();
    }, 150);
  };
  window.addEventListener('resize', onResize);

  shell.destroy = () => {
    destroyed = true;
    window.removeEventListener('resize', onResize);
    stopMic();
    stopSpeaking();
  };

  renderModeBtn();
  placeDocked();
  // Le clavier a besoin de la largeur réelle : on attend la mise en page.
  buildKeyboard();
  requestAnimationFrame(() => {
    if (!destroyed && mode === 'screen') buildKeyboard();
    if (shell.onRefresh) shell.onRefresh();
  });
  if (mode === 'piano') startMic();
  unlockAudio();
  keepAwake();
  return shell;
}

// Calcule les étoiles à partir du nombre d'erreurs.
export function starsFromMistakes(mistakes, total = 10) {
  const ok3 = Math.max(1, Math.round(total * 0.1));
  const ok2 = Math.max(4, Math.round(total * 0.35));
  if (mistakes <= ok3) return 3;
  if (mistakes <= ok2) return 2;
  return 1;
}
