// Espace parents (réglages) et guide des gommettes.
import { h, confirmBox, toast } from '../ui.js';
import * as state from '../state.js';
import { go, back } from '../router.js';
import { PIANO_PRESETS, pianoPreset, noteName, noteColor, pc, STICKER_NAMES, WHITE_PCS } from '../music.js';
import { Keyboard } from '../keyboard.js';
import { mic, micSupported } from '../pitch.js';
import { setVolume, playNote, unlockAudio } from '../audio.js';
import { setVoiceEnabled, say } from '../speech.js';
import { VERSION } from '../version.js';
import { applyMicSettings } from './calibrate.js';

let gatePassed = false;

export function parentsScreen(app) {
  if (!gatePassed) return gate(app);
  const s = state.settings();
  const page = h('div', { class: 'page parents' });
  page.append(
    h(
      'div',
      { class: 'topbar' },
      h('button', { class: 'icon-btn', onclick: () => back('profiles') }, '←'),
      h('div', { class: 'topbar-title' }, 'Espace parents'),
      h('span'),
    ),
  );

  // --- Piano
  const sel = h(
    'select',
    {
      onchange: (e) => {
        state.setSetting('piano', e.target.value);
        renderKb();
        renderMicKb();
        applyMicSettings();
      },
    },
    PIANO_PRESETS.map((p) => h('option', { value: p.id, selected: p.id === s.piano }, p.label)),
  );
  const kbBox = h('div', { class: 'kb-wrap small display-only' });
  const renderKb = () => {
    const pr = pianoPreset(state.settings().piano);
    kbBox.innerHTML = '';
    kbBox.append(new Keyboard({ from: pr.from, to: pr.to, interactive: false, names: 'c' }).el);
  };
  renderKb();
  page.append(
    section(
      '🎹 Votre piano',
      h(
        'p',
        {},
        'Le clavier affiché dans l’app doit ressembler à votre piano. La touche tout à gauche de votre piano est-elle un Do (juste à gauche d’un groupe de 2 touches noires) ?',
      ),
      sel,
      kbBox,
    ),
  );

  // --- Micro
  const level = h('div', { class: 'meter' }, h('div', { class: 'meter-fill' }));
  const heard = h('div', { class: 'heard' }, '—');
  const slider = h('input', {
    type: 'range',
    min: 0,
    max: 1,
    step: 0.05,
    value: s.micSensitivity,
    oninput: (e) => {
      const v = parseFloat(e.target.value);
      state.setSetting('micSensitivity', v);
      mic.setSensitivity(v);
    },
  });
  // clavier qui montre la touche entendue : elle doit être celle que vous avez jouée
  const micKbBox = h('div', { class: 'kb-wrap small display-only' });
  let micKb = null;
  const renderMicKb = () => {
    const pr = pianoPreset(state.settings().piano);
    micKb = new Keyboard({ from: pr.from, to: pr.to, interactive: false, names: 'c' });
    micKbBox.innerHTML = '';
    micKbBox.append(micKb.el);
  };
  renderMicKb();

  // Réglage de l'octave (écran dédié : on joue la dernière touche blanche)
  const shiftInfo = h('p', { class: 'small-help' });
  const st = state.settings();
  const sh = st.octaveShift;
  const bassText =
    {
      ok: ' Les notes graves sont bien entendues.',
      octave: ' Attention : la touche de gauche a été entendue une octave trop haut (graves difficiles pour le micro).',
      other: ' Attention : la touche de gauche n’a pas été reconnue correctement.',
      skipped: ' La touche de gauche a été passée (graves difficiles à entendre).',
    }[st.bassCheck] || '';
  shiftInfo.textContent = !st.octaveCalibrated
    ? 'Réglage : pas encore fait.'
    : (!sh
        ? 'Réglage fait : aucun décalage d’octave.'
        : `Réglage fait : ce piano sonne ${Math.abs(sh) === 12 ? 'une octave' : Math.abs(sh) / 12 + ' octaves'} plus ${sh < 0 ? 'grave' : 'aigu'} que prévu (corrigé).`) +
      bassText;
  const calibBtn = h(
    'button',
    {
      class: 'btn ghost',
      onclick: () => {
        stopTest();
        go('calibrate', {});
      },
    },
    '🎯 Régler le micro',
  );

  // Journal : ce que l'app a compris à chaque attaque (utile si des touches posent problème)
  const diag = h('ul', { class: 'diag' });
  const pr0 = () => pianoPreset(state.settings().piano);
  const keyNo = (m) => m - pr0().from + 1; // numéro de la touche en partant de la gauche
  const reasons = {
    'trop faible': 'son trop faible pour le micro',
    'pas de son nouveau': 'pas de nouvelle note',
    'pas une note': 'pas reconnu comme une note',
    bruit: 'ressemble à un bruit',
    écho: 'écho de la note précédente',
    'pas juste': 'pas une note juste (voix, chant ?)',
    glisse: 'la hauteur glisse (voix, chant ?)',
  };
  function onDecision(info) {
    const names = info.notes ? info.notes.map((m) => `${noteName(m)} (touche ${keyNo(m)})`).join(' + ') : '';
    const line = info.ok
      ? h('li', { class: 'ok' }, '✓ ', names)
      : h(
          'li',
          { class: 'ko' },
          '✗ ',
          reasons[info.reason] || info.reason,
          names ? ` — ${names} ?` : '',
          ` · volume ${(info.level * 1000).toFixed(0)}`,
        );
    diag.prepend(line);
    while (diag.children.length > 10) diag.lastChild.remove();
  }

  function onHeard(notes) {
    const list = notes.slice().sort((a, b) => a - b);
    heard.textContent = list.map((m) => noteName(m)).join(' + ');
    heard.style.color = list.length > 1 ? '#fff' : noteColor(list[0]);
    if (micKb) list.forEach((m) => micKb.showPlayed(m));
  }

  let unsub = null;
  let unLevel = null;
  let unDiag = null;
  const testBtn = h('button', { class: 'btn ghost', onclick: () => toggleTest() }, '🎤 Tester le micro');
  async function toggleTest() {
    if (unsub) return stopTest();
    if (!micSupported()) return toast('Micro non disponible dans ce navigateur.');
    try {
      await unlockAudio();
      unsub = await mic.subscribe(onHeard);
      unDiag = mic.onDecision(onDecision);
      unLevel = mic.onLevel((l) => {
        level.firstChild.style.width = Math.min(100, l * 2500) + '%';
      });
      testBtn.textContent = '⏹ Arrêter le test';
      heard.textContent = 'Jouez une note…';
    } catch (e) {
      toast('Accès au micro refusé. Autorisez-le dans les réglages du navigateur.');
    }
  }
  function stopTest() {
    if (unsub) unsub();
    if (unLevel) unLevel();
    if (unDiag) unDiag();
    unsub = unLevel = unDiag = null;
    testBtn.textContent = '🎤 Tester le micro';
  }
  page.append(
    section(
      '🎤 Micro',
      h(
        'p',
        {},
        'L’app écoute le piano grâce au micro du téléphone. Posez le téléphone sur le pupitre, le piano à volume moyen. Jouez une note : son nom s’affiche et la touche s’allume sur le dessin.',
      ),
      h('div', { class: 'row' }, testBtn, calibBtn),
      level,
      heard,
      micKbBox,
      diag,
      shiftInfo,
      h(
        'p',
        { class: 'small-help' },
        'Si la touche allumée n’est pas celle jouée, appuyez sur « Régler le micro » : on joue la touche blanche tout à gauche puis tout à droite. La liste ci-dessus montre ce que l’app a compris à chaque touche.',
      ),
      h('label', { class: 'field' }, h('span', {}, 'Sensibilité'), slider),
      h(
        'p',
        { class: 'small-help' },
        'Si l’app entend des notes alors que personne ne joue : baissez la sensibilité. Si elle n’entend pas : augmentez-la.',
      ),
    ),
  );

  // --- Son et voix
  page.append(
    section(
      '🔊 Son et voix',
      toggle('Voix de Cosmo (lit les consignes)', s.voice, (v) => {
        state.setSetting('voice', v);
        setVoiceEnabled(v);
        if (v) say('Coucou, c’est Cosmo !');
      }),
      h(
        'label',
        { class: 'field' },
        h('span', {}, 'Volume de l’app'),
        h('input', {
          type: 'range',
          min: 0,
          max: 1,
          step: 0.05,
          value: s.volume,
          oninput: (e) => {
            const v = parseFloat(e.target.value);
            state.setSetting('volume', v);
            setVolume(v);
          },
          onchange: () => playNote(72),
        }),
      ),
    ),
  );

  // --- Progression
  page.append(
    section(
      '🚀 Progression',
      toggle('Tout débloquer (toutes les planètes et chansons)', s.unlockAll, (v) => state.setSetting('unlockAll', v)),
      h('button', { class: 'btn ghost', onclick: () => go('stickerGuide') }, '🎨 Guide des gommettes'),
    ),
  );

  // --- Profils
  const profs = h('div', { class: 'prof-admin' });
  const renderProfiles = () => {
    profs.innerHTML = '';
    state.profiles().forEach((p) => {
      profs.append(
        h(
          'div',
          { class: 'prof-row' },
          h('span', { class: 'avatar sm', style: { '--pc': p.color } }, p.avatar),
          h('span', { class: 'grow' }, p.name, ' · ⭐ ', state.totalStars(p)),
          h('button', { class: 'btn ghost small', onclick: () => go('editProfile', { id: p.id }) }, '✏️'),
          h(
            'button',
            {
              class: 'btn ghost small',
              onclick: async () => {
                if (await confirmBox(`Remettre à zéro la progression de ${p.name} ?`, 'Remettre à zéro')) {
                  state.resetProgress(p.id);
                  renderProfiles();
                }
              },
            },
            '↺',
          ),
          h(
            'button',
            {
              class: 'btn ghost small',
              onclick: async () => {
                if (await confirmBox(`Supprimer le profil de ${p.name} ?`, 'Supprimer')) {
                  state.deleteProfile(p.id);
                  renderProfiles();
                }
              },
            },
            '🗑️',
          ),
        ),
      );
    });
    profs.append(h('button', { class: 'btn ghost small', onclick: () => go('editProfile', {}) }, '＋ Ajouter un enfant'));
  };
  renderProfiles();
  page.append(section('👧 Profils', profs));

  page.append(
    section(
      '💡 Conseils',
      h(
        'ul',
        {},
        h('li', {}, 'Des séances courtes (10 minutes) tous les jours valent mieux qu’une longue séance par semaine.'),
        h('li', {}, 'Le bouton en haut à droite des jeux permet de choisir « Vrai piano » (micro) ou « Écran ».'),
        h(
          'li',
          {},
          'Ajoutez l’app à l’écran d’accueil (menu ⋮ de Chrome → « Ajouter à l’écran d’accueil ») pour l’ouvrir comme une vraie app.',
        ),
        h('li', {}, 'Les progrès sont enregistrés sur ce téléphone uniquement.'),
      ),
      h('p', { class: 'small-help' }, 'Version ' + VERSION),
    ),
  );
  app.append(page);
  return { destroy: stopTest };
}

function section(title, ...children) {
  return h('section', { class: 'card' }, h('h2', {}, title), ...children);
}

function toggle(label, value, onChange) {
  const input = h('input', { type: 'checkbox', checked: value, onchange: (e) => onChange(e.target.checked) });
  return h('label', { class: 'toggle' }, input, h('span', { class: 'switch' }), h('span', {}, label));
}

function gate(app) {
  const a = 6 + Math.floor(Math.random() * 4);
  const b = 6 + Math.floor(Math.random() * 4);
  const input = h('input', { class: 'name-input', type: 'number', inputmode: 'numeric', placeholder: '?' });
  const check = () => {
    if (parseInt(input.value, 10) === a * b) {
      gatePassed = true;
      go('parents', {}, { replace: true });
    } else {
      input.value = '';
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 500);
    }
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && check());
  app.append(
    h(
      'div',
      { class: 'page center-page' },
      h('button', { class: 'icon-btn top-left', onclick: () => back('profiles') }, '←'),
      h('h1', { class: 'title' }, 'Espace parents'),
      h('p', { class: 'lead' }, `Pour entrer, combien font ${a} × ${b} ?`),
      input,
      h('button', { class: 'btn primary', onclick: check }, 'Entrer'),
    ),
  );
  setTimeout(() => input.focus(), 100);
}

export function stickerGuideScreen(app) {
  const pr = pianoPreset(state.settings().piano);
  const counts = {};
  for (let m = pr.from; m <= pr.to; m++) if (WHITE_PCS.includes(pc(m))) counts[pc(m)] = (counts[pc(m)] || 0) + 1;
  const kbBox = h('div', { class: 'kb-wrap guide display-only' });
  kbBox.append(new Keyboard({ from: pr.from, to: pr.to, interactive: false, names: 'all', colors: true }).el);
  const legend = h(
    'div',
    { class: 'legend' },
    WHITE_PCS.map((p) =>
      h(
        'div',
        { class: 'legend-row' },
        h('span', { class: 'sticker-dot', style: { background: noteColor(p + 60) } }),
        h('b', {}, noteName(p + 60)),
        h('span', {}, ` : gommette ${STICKER_NAMES[p]} × ${counts[p] || 0}`),
      ),
    ),
  );
  app.append(
    h(
      'div',
      { class: 'page' },
      h(
        'div',
        { class: 'topbar' },
        h('button', { class: 'icon-btn', onclick: () => back('hub') }, '←'),
        h('div', { class: 'topbar-title' }, 'Les gommettes'),
        h('span'),
      ),
      h(
        'div',
        { class: 'card' },
        h(
          'p',
          {},
          'Colle une petite gommette de couleur en bas de chaque touche blanche, comme sur le dessin. Chaque note a sa couleur : c’est la même dans l’app !',
        ),
        kbBox,
        legend,
        h(
          'p',
          { class: 'small-help' },
          'Astuce : commence par les Do (rouges), juste à gauche des groupes de 2 touches noires. Les autres couleurs peuvent être collées au fur et à mesure des planètes.',
        ),
      ),
      h(
        'div',
        { class: 'row center' },
        h('button', { class: 'btn ghost', onclick: () => back('hub') }, 'Plus tard'),
        h(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              state.setSetting('stickerGuideSeen', true);
              back('hub');
            },
          },
          'C’est fait ! ✓',
        ),
      ),
    ),
  );
}
