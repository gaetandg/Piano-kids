// Voix de Cosmo (synthèse vocale du téléphone, en français).

let enabled = true;
let voice = null;
let noFrench = false; // aucune voix française sur l'appareil : on se tait plutôt que de mal parler
let speakingUntil = 0;
let speaking = false;
let lastId = 0;
let endedAt = -1e9; // fin de la dernière phrase : le micro attend encore un peu (écho de la voix)

const hasTTS = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice() {
  if (!hasTTS()) return;
  const vs = window.speechSynthesis.getVoices();
  const fr = vs.filter((v) => /^fr/i.test(v.lang));
  voice =
    fr.find((v) => /fr[-_]FR/i.test(v.lang) && /google/i.test(v.name)) ||
    fr.find((v) => /fr[-_]FR/i.test(v.lang)) ||
    fr[0] ||
    null;
  noFrench = vs.length > 0 && !voice;
}

if (hasTTS()) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function setVoiceEnabled(v) {
  enabled = v;
  if (!v && hasTTS()) window.speechSynthesis.cancel();
}

export function voiceEnabled() {
  return enabled && hasTTS() && !noFrench;
}

function clean(text) {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/♯/g, ' dièse')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fait parler Cosmo. Renvoie une promesse résolue à la fin de la phrase.
export function say(text) {
  if (!voiceEnabled() || !text) return Promise.resolve();
  const synth = window.speechSynthesis;
  const wasBusy = synth.speaking || synth.pending;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(clean(text));
  u.lang = 'fr-FR';
  if (voice) u.voice = voice;
  u.rate = 1.0;
  u.pitch = 1.25;
  speaking = true;
  const id = ++lastId;
  // garde-fou si l'événement de fin n'arrive jamais
  speakingUntil = performance.now() + 1500 + text.length * 90;
  return new Promise((resolve) => {
    const done = () => {
      // une phrase interrompue ne doit pas couper l'état de la suivante
      if (id === lastId && speaking) {
        speaking = false;
        endedAt = performance.now();
      }
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    // Sur Android, parler juste après cancel() perd parfois la phrase
    if (wasBusy) setTimeout(() => synth.speak(u), 60);
    else synth.speak(u);
    setTimeout(done, speakingUntil - performance.now());
  });
}

export function stopSpeaking() {
  if (hasTTS()) window.speechSynthesis.cancel();
  speaking = false;
}

export function isSpeaking() {
  const now = performance.now();
  return (speaking && now < speakingUntil) || now < endedAt + 400;
}
