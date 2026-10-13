// Cadre commun à tous les jeux : en-tête, Cosmo, barre de progression, clavier, micro.
import { h, mascot, keepAwake, toast } from '../ui.js';
import { Keyboard } from '../keyboard.js';
import { mic, micSupported } from '../pitch.js';
import { playNote, unlockAudio } from '../audio.js';
import { say, stopSpeaking } from '../speech.js';
import * as state from '../state.js';
import { pianoPreset, fitRange, whiteCount } from '../music.js';

export function createShell(app, opts) {
  const {
    title,
    onExit,
    allowMode = true, // l'enfant peut choisir vrai piano / écran
    showKeyboard = true,
    kb = {}, // {range:[a,b], names, colors, interactive}
  } = opts;

  const profile = state.currentProfile();
  const piano = pianoPreset(state.settings().piano);
  let mode = allowMode ? (profile && profile.inputMode) || 'piano' : 'screen';
  if (!micSupported()) mode = 'screen';
  let kbOpts = { ...kb };

  const root = h('div', { class: 'game' });
  const micDot = h('span', { class: 'mic-dot', title: 'Micro' }, '🎤');
  const modeBtn = allowMode
    ? h('button', { class: 'mode-btn', onclick: () => setMode(mode === 'piano' ? 'screen' : 'piano') })
    : null;
  const header = h(
    'div',
    { class: 'game-header' },
    h('button', { class: 'icon-btn', 'aria-label': 'Quitter', onclick: onExit }, '✕'),
    h('div', { class: 'game-title' }, title),
    modeBtn || h('span'),
  );
  const fill = h('div', { class: 'progress-fill' });
  const rocket = h('div', { class: 'progress-rocket' }, '🚀');
  const progress = h(
    'div',
    { class: 'progress' },
    h('div', { class: 'progress-track' }, fill),
    rocket,
    h('span', { class: 'progress-goal' }, '🪐'),
  );
  const mascotEl = mascot('happy', 'small');
  const bubble = h('div', { class: 'bubble' });
  const talk = h('div', { class: 'talk' }, mascotEl, bubble);
  const stage = h('div', { class: 'stage' });
  const kbWrap = h('div', { class: 'kb-wrap' });
  root.append(header, progress, talk, stage);
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
    playTaps: true, // jouer le son quand on touche l'écran
    inputEnabled: true,
    onRefresh: null, // appelé après changement de mode ou de taille
    get mode() {
      return mode;
    },
  };

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

  function onMic(m) {
    if (!shell.inputEnabled || destroyed) return;
    if (shell.keyboard) shell.keyboard.showPlayed(m);
    if (shell.handler) shell.handler(m, 'mic');
  }

  function computeRange() {
    if (mode === 'piano' || kbOpts.range === 'piano') return [piano.from, piano.to];
    const [a, b] = kbOpts.range || [60, 72];
    const width = kbWrap.clientWidth || app.clientWidth || window.innerWidth;
    const need = whiteCount(a, b);
    const target = Math.max(need, Math.min(kbOpts.maxWhites || 15, Math.floor(width / 50)));
    return fitRange(a, b, target, Math.min(a, 36), Math.max(b, 96));
  }

  function buildKeyboard() {
    if (!showKeyboard) return;
    const [from, to] = computeRange();
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
    kbWrap.append(shell.keyboard.el);
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
    modeBtn.innerHTML = '';
    if (mode === 'piano') modeBtn.append(micDot, h('span', {}, 'Vrai piano'));
    else modeBtn.append(h('span', {}, '📱 Écran'));
    modeBtn.classList.toggle('screen', mode === 'screen');
  }

  function setMode(m, silent = false) {
    if (m === 'piano' && !micSupported()) {
      toast('Ce téléphone ne permet pas d’utiliser le micro ici.');
      m = 'screen';
    }
    mode = m;
    if (profile && allowMode) state.updateProfile(profile.id, { inputMode: m });
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
