// Récompenses : étoiles et album d'autocollants.
import { currentProfile, updateProfile, totalStars } from './state.js';

export const STARS_PER_STICKER = 4;

export const STICKERS = [
  { id: 'rocket', e: '🚀', name: 'Fusée' },
  { id: 'moon', e: '🌙', name: 'Lune' },
  { id: 'saturn', e: '🪐', name: 'Saturne' },
  { id: 'alien', e: '👽', name: 'Martien' },
  { id: 'comet', e: '☄️', name: 'Comète' },
  { id: 'ufo', e: '🛸', name: 'Soucoupe' },
  { id: 'astro', e: '🧑‍🚀', name: 'Astronaute' },
  { id: 'earth', e: '🌍', name: 'Terre' },
  { id: 'shooting', e: '🌠', name: 'Étoile filante' },
  { id: 'sat', e: '🛰️', name: 'Satellite' },
  { id: 'sun', e: '☀️', name: 'Soleil' },
  { id: 'robot', e: '🤖', name: 'Robot' },
  { id: 'telescope', e: '🔭', name: 'Télescope' },
  { id: 'galaxy', e: '🌌', name: 'Galaxie' },
  { id: 'fullmoon', e: '🌕', name: 'Pleine lune' },
  { id: 'monster', e: '👾', name: 'Petit monstre' },
  { id: 'glow', e: '🌟', name: 'Super étoile' },
  { id: 'music', e: '🎶', name: 'Musique' },
  { id: 'piano', e: '🎹', name: 'Piano' },
  { id: 'trophy', e: '🏆', name: 'Trophée' },
  { id: 'crown', e: '👑', name: 'Couronne' },
  { id: 'rainbow', e: '🌈', name: 'Arc-en-ciel' },
  { id: 'gem', e: '💎', name: 'Diamant' },
  { id: 'medal', e: '🥇', name: 'Médaille d’or' },
];

// Enregistre un résultat. `key` = id de mission (ou de chanson si `song`).
// Renvoie {stars, best, newStickers}.
export function recordResult(key, stars, { song = false } = {}) {
  const p = currentProfile();
  if (!p) return { stars, best: stars, newStickers: [] };
  const field = song ? 'songStars' : 'stars';
  const map = { ...(p[field] || {}) };
  const prev = map[key] || 0;
  if (stars != null) map[key] = Math.max(prev, stars);
  const patch = { [field]: map };
  if (!song) patch.done = { ...(p.done || {}), [key]: true };
  updateProfile(p.id, patch);

  // Nouveaux autocollants ?
  const earned = Math.min(STICKERS.length, Math.floor(totalStars(p) / STARS_PER_STICKER));
  const have = p.stickers || [];
  const newStickers = [];
  for (let i = have.length; i < earned; i++) newStickers.push(STICKERS[i]);
  if (newStickers.length) updateProfile(p.id, { stickers: [...have, ...newStickers.map((s) => s.id)] });
  return { stars, best: map[key] || 0, prev, newStickers };
}

export function starsToNextSticker(p) {
  const t = totalStars(p);
  if ((p.stickers || []).length >= STICKERS.length) return null;
  return STARS_PER_STICKER - (t % STARS_PER_STICKER);
}
