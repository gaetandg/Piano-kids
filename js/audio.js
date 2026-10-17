// Synthèse sonore (aucun fichier audio à télécharger).
import { midiToFreq } from './music.js';

let ctx = null;
let master = null;
let volume = 0.8;
let busyUntil = 0; // temps (ctx) jusqu'auquel l'app joue un son : le micro l'ignore

export function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
  }
  return ctx;
}

export async function unlockAudio() {
  const c = getCtx();
  if (c.state !== 'running') {
    try {
      await c.resume();
    } catch (e) {
      /* ignoré */
    }
  }
  return c;
}

export function setVolume(v) {
  volume = v;
  if (master) master.gain.value = v;
}

function markBusy(t) {
  busyUntil = Math.max(busyUntil, t);
}

// Vrai si l'app joue (ou vient de jouer) un son.
export function isBusy() {
  return !!ctx && ctx.currentTime < busyUntil + 0.2;
}

export function now() {
  return getCtx().currentTime;
}

// ---------- Instruments ----------

function piano(c, out, midi, t, dur, vel) {
  const f = midiToFreq(midi);
  const env = c.createGain();
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.min(f * 10, 14000), t);
  lp.frequency.exponentialRampToValueAtTime(Math.min(f * 3, 9000), t + 1.2);
  const decay = Math.max(0.35, Math.min(1.4, 1.6 - (midi - 48) * 0.025));
  const peak = 0.32 * vel;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(peak, t + 0.004);
  env.gain.setTargetAtTime(0, t + 0.004, decay);
  env.gain.setTargetAtTime(0, t + dur, 0.07);
  env.connect(lp).connect(out);
  const partials = [1, 0.5, 0.28, 0.14, 0.09, 0.05];
  const B = 0.0004; // légère inharmonicité
  const stopAt = t + dur + 0.5;
  partials.forEach((amp, i) => {
    const n = i + 1;
    if (f * n > 16000) return;
    const o = c.createOscillator();
    o.frequency.value = f * n * Math.sqrt(1 + B * n * n);
    const g = c.createGain();
    g.gain.setValueAtTime(amp, t);
    g.gain.setTargetAtTime(0, t, decay / (1 + i * 0.8));
    o.connect(g).connect(env);
    o.start(t);
    o.stop(stopAt);
  });
  return t + dur + 0.3; // moment où on ne l'entend plus
}

// Lame de xylophone ; `short` : version brève pour les petits sons de l'app (ding, étoiles)
function bar(c, out, midi, t, vel, short) {
  const f = midiToFreq(midi);
  const k = short ? 0.3 : 1;
  const stopAt = t + (short ? 0.5 : 1.2);
  [
    [1, 1, 0.5 * k],
    [3.93, 0.25, 0.12 * k],
    [9.2, 0.08, 0.05 * k],
  ].forEach(([ratio, amp, tau]) => {
    const o = c.createOscillator();
    o.frequency.value = f * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(amp * 0.35 * vel, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.003, tau);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(stopAt);
  });
  return t + (short ? 0.45 : 1.0);
}

function xylo(c, out, midi, t, dur, vel) {
  return bar(c, out, midi, t, vel, false);
}

function chime(c, out, midi, t, dur, vel) {
  return bar(c, out, midi, t, vel, true);
}

function space(c, out, midi, t, dur, vel) {
  const f = midiToFreq(midi);
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.22 * vel, t + 0.05);
  env.gain.setTargetAtTime(0.12 * vel, t + 0.05, 0.3);
  env.gain.setTargetAtTime(0, t + dur, 0.35);
  const lfo = c.createOscillator();
  lfo.frequency.value = 5.5;
  const lfoG = c.createGain();
  lfoG.gain.value = f * 0.012;
  lfo.connect(lfoG);
  const stopAt = t + dur + 1.6;
  [0, 7].forEach((det) => {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    o.detune.value = det;
    lfoG.connect(o.frequency);
    o.connect(env);
    o.start(t);
    o.stop(stopAt);
  });
  lfo.start(t);
  lfo.stop(stopAt);
  env.connect(out);
  return t + dur + 1.2;
}

function robot(c, out, midi, t, dur, vel) {
  const f = midiToFreq(midi);
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = f;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = f * 4;
  lp.Q.value = 6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.12 * vel, t + 0.01);
  g.gain.setTargetAtTime(0, t + dur * 0.6, 0.08);
  o.connect(lp).connect(g).connect(out);
  const stopAt = t + dur + 0.5;
  o.start(t);
  o.stop(stopAt);
  return t + dur * 0.6 + 0.35;
}

export const INSTRUMENTS = {
  piano: { label: 'Piano', emoji: '🎹', fn: piano },
  xylo: { label: 'Xylophone', emoji: '🎶', fn: xylo },
  space: { label: 'Spatial', emoji: '🛸', fn: space },
  robot: { label: 'Robot', emoji: '🤖', fn: robot },
};
const SFX = { chime: { fn: chime } }; // sons de l'app (pas proposés au piano libre)

// Joue une note. `when` = délai en secondes depuis maintenant.
export function playNote(midi, { when = 0, dur = 0.8, vel = 0.9, instrument = 'piano' } = {}) {
  const c = getCtx();
  const t = c.currentTime + 0.01 + when;
  const fn = (INSTRUMENTS[instrument] || SFX[instrument] || INSTRUMENTS.piano).fn;
  // le micro n'écoute pas tant que ce son est audible (sinon l'app s'entendrait elle-même)
  const end = fn(c, master, midi, t, dur, vel);
  markBusy(end + 0.1);
  return t;
}

// Joue une suite de notes [{midi, dur}] ; renvoie la durée totale en secondes.
export function playSequence(notes, { gap = 0.05, instrument = 'piano', startDelay = 0 } = {}) {
  let when = startDelay;
  for (const n of notes) {
    if (n.midi != null) playNote(n.midi, { when, dur: Math.max(0.2, n.dur - gap), instrument });
    when += n.dur;
  }
  return when;
}

// ---------- Effets sonores ----------

export function sfxSuccess() {
  [72, 76, 79, 84].forEach((m, i) => playNote(m, { when: i * 0.07, dur: 0.25, vel: 0.5, instrument: 'chime' }));
}

export function sfxBigSuccess() {
  [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => playNote(m, { when: i * 0.08, dur: 0.35, vel: 0.5, instrument: 'chime' }));
}

export function sfxError() {
  const c = getCtx();
  const t = c.currentTime + 0.01;
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(260, t);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.35);
  markBusy(t + 0.35);
}

export function sfxStar(i = 0) {
  playNote(84 + i * 4, { when: 0, dur: 0.3, vel: 0.45, instrument: 'chime' });
  playNote(91 + i * 4, { when: 0.06, dur: 0.3, vel: 0.35, instrument: 'chime' });
}

export function sfxClick() {
  playNote(96, { dur: 0.05, vel: 0.15, instrument: 'chime' });
}

export function sfxWhoosh() {
  const c = getCtx();
  const t = c.currentTime + 0.01;
  const len = 0.9;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 2;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.exponentialRampToValueAtTime(3000, t + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(bp).connect(g).connect(master);
  src.start(t);
  markBusy(t + len);
}

// Tambour (jeu de rythme).
export function drum(when = 0, accent = false) {
  const c = getCtx();
  const t = c.currentTime + 0.01 + when;
  const o = c.createOscillator();
  o.frequency.setValueAtTime(accent ? 190 : 160, t);
  o.frequency.exponentialRampToValueAtTime(55, t + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.6, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.4);
  markBusy(t + 0.4);
  return t;
}
