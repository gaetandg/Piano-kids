// Sauvegarde locale (sur le téléphone) : profils, progression, réglages.

const KEY = 'pianoKids.v1';

const DEFAULT = {
  profiles: [],
  currentId: null,
  settings: {
    piano: '37C',
    micSensitivity: 0.5,
    octaveShift: 0,
    octaveCalibrated: false,
    bassCheck: null, // 'ok' | 'octave' | 'other' | 'skipped' : les graves au réglage
    voice: true,
    volume: 0.8,
    unlockAll: false,
    stickerGuideSeen: false,
  },
};

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { ...DEFAULT, ...d, settings: { ...DEFAULT.settings, ...(d.settings || {}) } };
    }
  } catch (e) {
    /* stockage indisponible */
  }
  return structuredClone(DEFAULT);
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    /* tant pis */
  }
}

export const settings = () => data.settings;

export function setSetting(k, v) {
  data.settings[k] = v;
  save();
}

export const profiles = () => data.profiles;

export function currentProfile() {
  return data.profiles.find((p) => p.id === data.currentId) || null;
}

export function setCurrent(id) {
  data.currentId = id;
  save();
}

export function createProfile(name, avatar, color) {
  const p = {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    avatar,
    color,
    created: Date.now(),
    stars: {}, // missionId -> 0..3
    done: {}, // missionId -> true
    songStars: {}, // songId -> 0..3
    stickers: [],
    inputMode: 'piano', // 'piano' (vrai piano + micro) ou 'screen'
  };
  data.profiles.push(p);
  save();
  return p;
}

export function updateProfile(id, patch) {
  const p = data.profiles.find((x) => x.id === id);
  if (p) Object.assign(p, patch);
  save();
}

export function deleteProfile(id) {
  data.profiles = data.profiles.filter((p) => p.id !== id);
  if (data.currentId === id) data.currentId = null;
  save();
}

export function resetProgress(id) {
  updateProfile(id, { stars: {}, done: {}, songStars: {}, stickers: [] });
}

export function totalStars(p) {
  const a = Object.values(p.stars || {}).reduce((s, v) => s + v, 0);
  const b = Object.values(p.songStars || {}).reduce((s, v) => s + v, 0);
  return a + b;
}
