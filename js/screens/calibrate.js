// Réglage du micro : on joue la touche blanche tout à gauche puis tout à droite ; l'app mesure
// si le clavier sonne une octave plus haut ou plus bas que prévu et si elle entend bien les graves.
import { h, mascot, toast, keepAwake } from '../ui.js';
import * as state from '../state.js';
import { go, back } from '../router.js';
import { Keyboard } from '../keyboard.js';
import { mic, micSupported, sensitivityForGate } from '../pitch.js';
import { unlockAudio, sfxSuccess, sfxError } from '../audio.js';
import { say } from '../speech.js';
import { pianoPreset, noteName, pc, isBlack } from '../music.js';

let skipped = false; // « Plus tard » : on ne redemande pas pendant cette visite
const CALIB_VERSION = 3; // 2 : touche de gauche + de droite ; 3 : + accord du clavier (justesse)
const MAX_AUTO_SENSITIVITY = 0.6;

// Faut-il proposer le réglage avant de jouer au vrai piano ?
export function needsCalibration() {
  const s = state.settings();
  return !skipped && micSupported() && (!s.octaveCalibrated || (s.calibVersion || 1) < CALIB_VERSION);
}

// Applique les réglages du micro (sensibilité, octave, notes possibles du clavier).
export function applyMicSettings() {
  if (!mic) return;
  const s = state.settings();
  const p = pianoPreset(s.piano);
  mic.setSensitivity(s.micSensitivity);
  mic.configure({ from: p.from, to: p.to, shift: s.octaveShift, calibrated: s.octaveCalibrated, tuning: s.tuningCents || 0 });
}

const whiteAtOrAbove = (m) => (isBlack(m) ? m + 1 : m);
const whiteAtOrBelow = (m) => (isBlack(m) ? m - 1 : m);

// Réglage en deux temps : la touche blanche tout à gauche, puis celle tout à droite (deux fois chacune).
// La touche de droite donne l'octave du clavier ; celle de gauche vérifie que les graves sont bien
// entendus (et rend le micro plus sensible s'ils sont faibles).
// `params.next` = {name, params} : l'écran où aller ensuite (sinon : retour).
export function calibrateScreen(app, params) {
  const piano = pianoPreset(state.settings().piano);
  const left = whiteAtOrAbove(piano.from);
  const right = whiteAtOrBelow(piano.to);
  const next = params.next || null;
  let phase = 'left';
  let target = left;
  let hits = [];
  let misses = 0;
  let leftResult = null; // {raw, level} ou null si l'étape est passée
  let unsub = null;
  let unLevel = null;
  let unDecision = null;
  let done = false;

  const continueTo = () => {
    if (next) go(next.name, next.params || {}, { replace: true });
    else back('parents');
  };

  const m = mascot('happy', 'small');
  const bubble = h('div', { class: 'bubble' });
  const status = h('div', { class: 'calib-msg' });
  const steps = h('div', { class: 'calib-steps' });
  const micDot = h('span', { class: 'mic-dot' }, '🎤');
  const kbBox = h('div', { class: 'kb-wrap calib display-only' });
  const kb = new Keyboard({ from: piano.from, to: piano.to, interactive: false, names: 'c' });
  kbBox.append(kb.el);
  const skipBtn = h('button', { class: 'btn ghost small', hidden: true, onclick: () => skipLeft() }, 'Passer cette touche');

  const talk = (text, mood = 'happy') => {
    bubble.textContent = text;
    m.setMood(mood);
    return say(text);
  };

  function renderSteps() {
    steps.innerHTML = '';
    steps.append(
      h(
        'span',
        { class: 'calib-step' + (phase === 'left' ? ' on' : ' ok') },
        phase === 'left' ? '① Touche de gauche' : '✓ Touche de gauche',
      ),
      h('span', { class: 'calib-step' + (phase === 'right' ? ' on' : '') }, '② Touche de droite'),
    );
  }

  function showPhase() {
    hits = [];
    misses = 0;
    kb.setTargets([target], { label: true });
    renderSteps();
    status.textContent = '';
    if (phase === 'left') {
      talk(
        'Avant de jouer, j’apprends à reconnaître ton piano. Joue la touche qui clignote : la touche blanche tout à gauche. Deux fois !',
      );
      setTimeout(() => {
        if (!done && phase === 'left') skipBtn.hidden = false;
      }, 15000);
    } else {
      skipBtn.hidden = true;
      talk('Bravo ! Maintenant la touche blanche tout à droite. Deux fois aussi !');
    }
  }

  async function start() {
    if (!micSupported()) {
      talk('Ce téléphone ne permet pas d’utiliser le micro ici. On jouera sur l’écran !', 'oops');
      return;
    }
    try {
      await unlockAudio();
      // pendant le réglage, on écoute toutes les notes possibles (l'ancien réglage ne doit pas gêner)
      mic.configure({ shift: 0, calibrated: false, tuning: 0 });
      mic.tracker.tuningCheck = false; // le clavier n'est peut-être pas accordé pile : on le mesure
      unsub = await mic.subscribe(onNote);
      unLevel = mic.onLevel((lvl, muted) => micDot.style.setProperty('--lvl', muted ? 0 : Math.min(1, lvl * 25)));
      unDecision = mic.onDecision(onDecision);
    } catch (e) {
      talk('Je n’ai pas accès au micro. Demande à un adulte de l’autoriser, ou joue sur l’écran.', 'oops');
    }
  }

  function stop() {
    if (unsub) unsub();
    if (unLevel) unLevel();
    if (unDecision) unDecision();
    unsub = unLevel = unDecision = null;
    if (!done) applyMicSettings(); // abandon : on remet les réglages d'avant
  }

  // Attaques entendues mais trop faibles : on le signale (sans toucher au réglage : un petit
  // bruit dans la pièce ne doit pas rendre le micro trop sensible)
  const centsSeen = [];
  function onDecision(info) {
    if (info.ok && typeof info.cents === 'number') centsSeen.push(info.cents);
    if (done || info.ok || info.reason !== 'trop faible') return;
    status.textContent = 'Je t’entends à peine… Joue un peu plus fort, ou rapproche le téléphone.';
  }

  function skipLeft() {
    leftResult = null;
    phase = 'right';
    target = right;
    showPhase();
  }

  function onNote(notes) {
    if (done) return;
    const raw = notes.find((x) => pc(x) === pc(target)) ?? notes[0]; // réglage remis à zéro : son réel
    if (pc(raw) !== pc(target)) {
      hits = [];
      misses++;
      sfxError();
      const where = phase === 'left' ? 'tout à gauche' : 'tout à droite';
      status.textContent = `J’ai entendu un ${noteName(raw)}. Joue la touche blanche ${where} de ton piano.`;
      if (phase === 'left' && misses >= 2) skipBtn.hidden = false;
      return;
    }
    // les deux touches du bout sont souvent des Do : la touche de droite doit être bien plus aiguë
    if (phase === 'right' && leftResult && raw - leftResult.raw < right - left - 12) {
      hits = [];
      status.textContent = 'Ça, c’est la touche de gauche ! Joue maintenant la touche blanche tout à droite.';
      return;
    }
    hits.push(raw);
    if (hits.length < 2 || hits[hits.length - 2] !== raw) {
      if (hits.length >= 2) hits = [raw];
      status.textContent = 'Super ! Encore une fois la même touche…';
      return;
    }
    sfxSuccess();
    if (phase === 'left') {
      leftResult = { raw, level: mic.tracker.level };
      phase = 'right';
      target = right;
      showPhase();
      return;
    }
    finish(raw, mic.tracker.level);
  }

  function finish(rawRight, rightLevel) {
    done = true;
    const shift = Math.round((rawRight - right) / 12) * 12;
    // les graves sont-ils entendus à la bonne octave ?
    let bass = 'skipped';
    if (leftResult) {
      const gap = rawRight - leftResult.raw; // écart attendu : right - left
      bass = gap === right - left ? 'ok' : gap === right - left - 12 ? 'octave' : 'other';
    }
    state.setSetting('octaveShift', shift);
    state.setSetting('octaveCalibrated', true);
    state.setSetting('bassCheck', bass);
    state.setSetting('calibVersion', CALIB_VERSION);
    // accord du clavier : médiane des écarts mesurés sur les touches jouées
    const cs = centsSeen.slice(-6).sort((a, b) => a - b);
    const tuning = cs.length ? cs[cs.length >> 1] : 0;
    state.setSetting('tuningCents', Math.abs(tuning) <= 45 ? Math.round(tuning) : 0);
    // micro assez sensible pour les deux touches jouées, sans dépasser un plafond
    // (trop sensible, il entendrait les voix et les bruits de la pièce)
    const levels = [rightLevel, leftResult && leftResult.level].filter((x) => x > 0);
    if (levels.length) {
      const wanted = Math.min(...levels) * 0.4;
      const s = state.settings();
      if (0.03 * Math.pow(0.067, s.micSensitivity) > wanted) {
        state.setSetting('micSensitivity', Math.min(MAX_AUTO_SENSITIVITY, sensitivityForGate(wanted)));
      }
    }
    applyMicSettings();
    kb.setTargets([]);
    status.textContent = '';
    m.bounce();
    talk('Merci ! Maintenant je connais bien ton piano. 🎹', 'excited');
    if (shift) toast(`Réglé : ce piano sonne une octave plus ${shift < 0 ? 'grave' : 'aigu'} que prévu.`, 3500);
    setTimeout(continueTo, 2200);
  }

  app.append(
    h(
      'div',
      { class: 'page calibrate-page' },
      h(
        'div',
        { class: 'topbar' },
        h('button', { class: 'icon-btn', 'aria-label': 'Retour', onclick: () => back('hub') }, '←'),
        h('div', { class: 'topbar-title' }, 'Je règle le micro'),
        micDot,
      ),
      h('div', { class: 'talk inline' }, m, bubble),
      steps,
      kbBox,
      status,
      h('div', { class: 'row center' }, skipBtn),
      h(
        'div',
        { class: 'row center' },
        next
          ? h(
              'button',
              {
                class: 'btn ghost',
                onclick: () => {
                  skipped = true;
                  continueTo();
                },
              },
              'Plus tard',
            )
          : null,
        next
          ? h(
              'button',
              {
                class: 'btn ghost',
                onclick: () => {
                  const p = state.currentProfile();
                  if (p) state.updateProfile(p.id, { inputMode: 'screen' });
                  continueTo();
                },
              },
              '📱 Jouer sur l’écran',
            )
          : null,
      ),
    ),
  );
  showPhase();
  keepAwake();
  start();
  return { destroy: stop };
}
