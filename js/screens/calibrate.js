// Réglage du micro : on joue la dernière touche blanche du piano (tout à droite) et l'app
// mesure si le clavier sonne une octave plus haut ou plus bas que prévu.
import { h, mascot, toast, keepAwake } from '../ui.js';
import * as state from '../state.js';
import { go, back } from '../router.js';
import { Keyboard } from '../keyboard.js';
import { mic, micSupported } from '../pitch.js';
import { unlockAudio, sfxSuccess, sfxError } from '../audio.js';
import { say } from '../speech.js';
import { pianoPreset, noteName, pc, isBlack } from '../music.js';

let skipped = false; // « Plus tard » : on ne redemande pas pendant cette visite

// Faut-il proposer le réglage avant de jouer au vrai piano ?
export function needsCalibration() {
  return !skipped && micSupported() && !state.settings().octaveCalibrated;
}

// `params.next` = {name, params} : l'écran où aller ensuite (sinon : retour).
export function calibrateScreen(app, params) {
  const piano = pianoPreset(state.settings().piano);
  let target = piano.to;
  while (isBlack(target)) target--;
  const next = params.next || null;
  let hits = [];
  let unsub = null;
  let unLevel = null;
  let done = false;

  const continueTo = () => {
    if (next) go(next.name, next.params || {}, { replace: true });
    else back('parents');
  };

  const m = mascot('happy', 'small');
  const bubble = h('div', { class: 'bubble' });
  const status = h('div', { class: 'calib-msg' });
  const micDot = h('span', { class: 'mic-dot' }, '🎤');
  const kbBox = h('div', { class: 'kb-wrap calib display-only' });
  const kb = new Keyboard({ from: piano.from, to: piano.to, interactive: false, names: 'c' });
  kb.setTargets([target], { label: true });
  kbBox.append(kb.el);

  const talk = (text, mood = 'happy') => {
    bubble.textContent = text;
    m.setMood(mood);
    return say(text);
  };

  async function start() {
    if (!micSupported()) {
      talk('Ce téléphone ne permet pas d’utiliser le micro ici. On jouera sur l’écran !', 'oops');
      return;
    }
    try {
      await unlockAudio();
      unsub = await mic.subscribe(onNote);
      unLevel = mic.onLevel((lvl, muted) => micDot.style.setProperty('--lvl', muted ? 0 : Math.min(1, lvl * 25)));
    } catch (e) {
      talk('Je n’ai pas accès au micro. Demande à un adulte de l’autoriser, ou joue sur l’écran.', 'oops');
    }
  }

  function stop() {
    if (unsub) unsub();
    if (unLevel) unLevel();
    unsub = unLevel = null;
  }

  function onNote(notes) {
    if (done) return;
    const heard = notes.find((m) => pc(m) === pc(target)) ?? notes[0];
    const raw = heard + mic.octaveShift; // ce que le piano fait vraiment entendre
    if (pc(raw) !== pc(target)) {
      hits = [];
      sfxError();
      status.textContent = `J’ai entendu un ${noteName(raw)}. Joue la dernière touche blanche, tout à droite de ton piano.`;
      return;
    }
    hits.push(raw);
    if (hits.length < 2 || hits[hits.length - 2] !== raw) {
      if (hits.length >= 2) hits = [raw];
      status.textContent = 'Super ! Encore une fois la même touche…';
      return;
    }
    done = true;
    const shift = Math.round((raw - target) / 12) * 12;
    state.setSetting('octaveShift', shift);
    state.setSetting('octaveCalibrated', true);
    mic.setOctaveShift(shift);
    sfxSuccess();
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
      kbBox,
      status,
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
  talk(
    'Avant de jouer, j’apprends à reconnaître ton piano. Joue la touche qui clignote : la dernière touche blanche, tout à droite. Deux fois !',
  );
  keepAwake();
  start();
  return { destroy: stop };
}
