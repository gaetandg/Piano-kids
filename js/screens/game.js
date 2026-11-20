// Écran de jeu : lance la bonne mission puis affiche le résultat.
import { h, mascot, starsRow, confetti, modal, wait } from '../ui.js';
import * as state from '../state.js';
import { go, back } from '../router.js';
import { findMission, nextMission, missionUnlocked } from '../curriculum.js';
import { getSong } from '../songs.js';
import { recordResult, recordRain, packsAvailable } from '../rewards.js';
import { packOpener, trophyLines } from './album.js';
import { newTrophies, markTrophiesSeen } from '../trophies.js';
import { createShell } from '../games/shell.js';
import { sfxStar, sfxBigSuccess, sfxWhoosh } from '../audio.js';
import { say } from '../speech.js';
import { needsCalibration } from './calibrate.js';

import * as intro from '../games/intro.js';
import * as findkey from '../games/findkey.js';
import * as namenote from '../games/namenote.js';
import * as playnote from '../games/playnote.js';
import * as highlow from '../games/highlow.js';
import * as simon from '../games/simon.js';
import * as rhythm from '../games/rhythm.js';
import * as song from '../games/song.js';
import * as samediff from '../games/samediff.js';
import * as compose from '../games/compose.js';
import * as rain from '../games/rain.js';
import * as listen from '../games/listen.js';
import * as chord from '../games/chord.js';

const GAMES = { intro, findkey, namenote, playnote, highlow, simon, rhythm, song, samediff, compose, rain, listen, chord };

export function gameScreen(app, params) {
  const p = state.currentProfile();
  if (!p) return go('profiles', {}, { replace: true });

  let mission;
  let isLibrarySong = false;
  const isRain = !!params.rain;
  if (isRain) {
    // Pluie de notes
    const s = rain.rainSong(params.rain);
    if (!s) return go('rain', {}, { replace: true });
    const sp = rain.SPEEDS[params.speed] || rain.SPEEDS.tortue;
    mission = { id: 'rain:' + params.rain, type: 'rain', song: params.rain, speed: params.speed, title: `${sp.icon} ${s.title}` };
  } else if (params.song) {
    const s = getSong(params.song);
    if (!s) return go('songs', {}, { replace: true });
    mission = { id: 'song:' + s.id, type: 'song', song: s.id, title: s.title };
    isLibrarySong = true;
  } else {
    mission = findMission(params.mission);
    if (!mission) return go('hub', {}, { replace: true });
  }

  const mod = GAMES[mission.type];
  const cfg = mod.config(mission);
  const exit = () =>
    isRain ? back('rain', {}) : back(isLibrarySong ? 'songs' : 'planet', isLibrarySong ? {} : { planet: mission.planetId });
  // Première fois au vrai piano : on règle d'abord le micro (octave du clavier)
  const calibrate = () => go('calibrate', { next: { name: 'game', params } }, { replace: true });
  if (cfg.allowMode !== false && p.inputMode !== 'screen' && needsCalibration()) return calibrate();
  const shell = createShell(app, { title: mission.title, onExit: exit, onNeedCalibration: calibrate, ...cfg });

  let game = null;
  let finished = false;
  let destroyed = false;
  const finish = (stars, extra = null) => {
    if (finished) return;
    finished = true;
    const res = isRain
      ? recordRain(mission.song, mission.speed, { stars, ...extra })
      : recordResult(isLibrarySong ? mission.song : mission.id, stars, { song: isLibrarySong });
    showResult(stars, res, extra);
  };

  async function showResult(stars, res, extra) {
    shell.inputEnabled = false;
    const m = mascot('excited', 'big');
    const msg =
      stars == null
        ? 'Mission terminée !'
        : stars === 3
          ? ['Incroyable !', 'Champion !', 'Trop fort !'][Math.floor(Math.random() * 3)]
          : stars === 2
            ? 'Bravo, c’est très bien !'
            : 'Bien joué ! Rejoue pour gagner plus d’étoiles.';
    const starEl = stars == null ? h('div', { class: 'result-done' }, '✅') : starsRow(0, 3, 'big');
    const next = !isLibrarySong && !isRain ? nextMission(mission.id) : null;
    const nextOk = next && missionUnlocked(state.currentProfile(), next.id, state.settings().unlockAll);
    const stickerBox = h('div', { class: 'sticker-new-box' });

    const buttons = h('div', { class: 'result-buttons' });
    if (stars != null)
      buttons.append(h('button', { class: 'btn ghost', onclick: () => go('game', params, { replace: true }) }, '↺ Rejouer'));
    if (nextOk) {
      buttons.append(
        h(
          'button',
          {
            class: 'btn primary',
            onclick: () => {
              sfxWhoosh();
              if (next.planetId !== mission.planetId) go('planet', { planet: next.planetId }, { replace: true });
              else go('game', { mission: next.id }, { replace: true });
            },
          },
          next.planetId !== mission.planetId ? 'Nouvelle planète ! 🪐' : 'Suivant ▶',
        ),
      );
    }
    buttons.append(
      h('button', { class: 'btn ghost', onclick: exit }, isRain ? '🌠 Pluie' : isLibrarySong ? '🎵 Chansons' : '🗺️ Carte'),
    );
    // Pluie de notes : score, record, précision, combo
    const stats =
      extra && extra.rain
        ? h(
            'div',
            { class: 'rain-stats' },
            h('div', { class: 'rain-big' }, `${extra.score} points`),
            res.record && res.prevScore ? h('div', { class: 'rain-record' }, '🏆 Nouveau record !') : null,
            !res.record && res.prevScore ? h('div', { class: 'rain-best' }, `Record : ${res.prevScore}`) : null,
            h('div', {}, `🎯 ${extra.acc} % de notes justes · 🔥 combo ${extra.maxCombo}`),
          )
        : null;

    modal(h('div', { class: 'result' }, m, h('h2', {}, msg), starEl, stats, stickerBox, buttons), { dismissable: false });
    say(msg);

    if (stars != null) {
      for (let i = 0; i < 3; i++) {
        await wait(380);
        if (i < stars) {
          starEl.children[i].classList.add('on', 'pop');
          sfxStar(i);
        }
      }
      if (stars === 3) {
        confetti();
        sfxBigSuccess();
      }
    } else {
      confetti(40);
      sfxBigSuccess();
    }
    // nouveaux trophées
    const tr = newTrophies(state.currentProfile());
    markTrophiesSeen(state.currentProfile(), tr.slice(0, 2)); // les autres restent « Nouveau ! » dans l'album
    if (tr.length) {
      await wait(500);
      stickerBox.append(trophyLines(tr));
      sfxStar(1);
    }
    if (res.newPacks > 0) {
      await wait(600);
      // une pochette surprise gagnée : on peut l'ouvrir tout de suite
      stickerBox.append(
        h('div', { class: 'packs-title' }, '🎁 Tu as gagné une pochette surprise !'),
        packOpener({
          onOpened: () => {
            const left = packsAvailable(state.currentProfile());
            if (left) stickerBox.append(h('div', { class: 'packs-more' }, `Encore ${left} à ouvrir dans l’album !`));
          },
        }),
      );
      sfxStar(2);
    }
  }

  // Le jeu est lancé une fois la mise en page faite (le clavier a besoin de sa largeur).
  requestAnimationFrame(() => {
    if (!finished && !destroyed) game = mod.default(shell, mission, finish);
  });

  return {
    destroy() {
      destroyed = true;
      if (game && game.destroy) game.destroy();
      shell.destroy();
    },
  };
}
