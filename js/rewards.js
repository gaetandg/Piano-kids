// Récompenses : étoiles, pochettes surprises et album d'autocollants.
// Tous les 4 ⭐, une pochette à ouvrir : un autocollant au hasard parmi ceux qu'on n'a pas encore,
// parfois en version brillante ✨. Quand on a tout, les pochettes donnent les versions brillantes.
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
  { id: 'snowman', e: '⛄', name: 'Bonhomme de neige' },
  { id: 'tree', e: '🎄', name: 'Sapin' },
  { id: 'gift', e: '🎁', name: 'Cadeau' },
  { id: 'bell', e: '🔔', name: 'Clochette' },
  { id: 'sparkles', e: '✨', name: 'Paillettes' },
  { id: 'sled', e: '🛷', name: 'Traîneau' },
  { id: 'deer', e: '🦌', name: 'Renne' },
  { id: 'cookie', e: '🍪', name: 'Biscuit' },
  { id: 'score', e: '🎼', name: 'Partition' },
  { id: 'violin', e: '🎻', name: 'Violon' },
  { id: 'drum', e: '🥁', name: 'Tambour' },
  { id: 'trumpet', e: '🎺', name: 'Trompette' },
  // pour décorer sa planète
  { id: 'oak', e: '🌳', name: 'Arbre' },
  { id: 'flower', e: '🌸', name: 'Fleur' },
  { id: 'house', e: '🏠', name: 'Maison' },
  { id: 'cat', e: '🐱', name: 'Chat' },
  { id: 'dog', e: '🐶', name: 'Chien' },
  { id: 'unicorn', e: '🦄', name: 'Licorne' },
  { id: 'dragon', e: '🐉', name: 'Dragon' },
  { id: 'dino', e: '🦖', name: 'Dinosaure' },
  { id: 'octopus', e: '🐙', name: 'Pieuvre' },
  { id: 'butterfly', e: '🦋', name: 'Papillon' },
  { id: 'mushroom', e: '🍄', name: 'Champignon' },
  { id: 'cactus', e: '🌵', name: 'Cactus' },
];

export const SHINY_CHANCE = 0.12;

export function findSticker(id) {
  return STICKERS.find((s) => s.id === id) || null;
}

// Pochettes gagnées mais pas encore ouvertes.
export function packsAvailable(p) {
  if (!p) return 0;
  const earned = Math.floor(totalStars(p) / STARS_PER_STICKER);
  // les anciens profils recevaient les autocollants directement : ils comptent comme des pochettes ouvertes
  const opened = p.packsOpened ?? (p.stickers || []).length;
  const left = 2 * STICKERS.length - (p.stickers || []).length - (p.shiny || []).length; // ce qu'il reste à gagner
  return Math.max(0, Math.min(earned - opened, left));
}

// Ouvre une pochette. Renvoie {sticker, shiny, isNew} ou null s'il n'y en a pas.
export function openPack() {
  const p = currentProfile();
  if (!packsAvailable(p)) return null;
  const have = p.stickers || [];
  const shinies = p.shiny || [];
  const missing = STICKERS.filter((s) => !have.includes(s.id));
  let sticker;
  let shiny;
  if (missing.length) {
    sticker = missing[Math.floor(Math.random() * missing.length)];
    shiny = Math.random() < SHINY_CHANCE;
  } else {
    const dull = STICKERS.filter((s) => !shinies.includes(s.id));
    sticker = dull[Math.floor(Math.random() * dull.length)];
    shiny = true;
  }
  const isNew = !have.includes(sticker.id);
  updateProfile(p.id, {
    stickers: isNew ? [...have, sticker.id] : have,
    shiny: shiny ? [...shinies, sticker.id] : shinies,
    packsOpened: (p.packsOpened ?? have.length) + 1,
  });
  return { sticker, shiny, isNew };
}

// Enregistre un résultat. `key` = id de mission (ou de chanson si `song`).
// Renvoie {stars, best, newPacks} (newPacks : pochettes gagnées avec ce résultat).
export function recordResult(key, stars, { song = false } = {}) {
  const p = currentProfile();
  if (!p) return { stars, best: stars, newPacks: 0 };
  const before = packsAvailable(p);
  const field = song ? 'songStars' : 'stars';
  const map = { ...(p[field] || {}) };
  const prev = map[key] || 0;
  if (stars != null) map[key] = Math.max(prev, stars);
  const patch = { [field]: map };
  if (!song) patch.done = { ...(p.done || {}), [key]: true };
  updateProfile(p.id, patch);

  return { stars, best: map[key] || 0, prev, newPacks: packsAvailable(p) - before };
}

// Pluie de notes : meilleur score par chanson et par vitesse.
// Les étoiles (la meilleure par chanson) comptent aussi pour les autocollants.
export function recordRain(songId, speed, { stars, score, acc, maxCombo }) {
  const p = currentProfile();
  if (!p) return { stars, record: false, newPacks: 0 };
  if (songId.startsWith('comp:')) return { stars, record: false, newPacks: 0 }; // une composition : pas de record
  const before = packsAvailable(p);
  const all = { ...(p.rain || {}) };
  const bySpeed = { ...(all[songId] || {}) };
  const prev = bySpeed[speed];
  const record = !prev || score > prev.score;
  bySpeed[speed] = record
    ? { score, acc, maxCombo, stars: Math.max(stars, prev ? prev.stars : 0) }
    : { ...prev, stars: Math.max(stars, prev.stars) };
  all[songId] = bySpeed;
  const rainStars = { ...(p.rainStars || {}), [songId]: Math.max((p.rainStars || {})[songId] || 0, stars) };
  updateProfile(p.id, { rain: all, rainStars });
  return { stars, record, prevScore: prev ? prev.score : 0, newPacks: packsAvailable(p) - before };
}

// Étoiles qu'il manque pour la prochaine pochette (null quand la collection est complète).
export function starsToNextPack(p) {
  if ((p.stickers || []).length + (p.shiny || []).length >= 2 * STICKERS.length) return null;
  return STARS_PER_STICKER - (totalStars(p) % STARS_PER_STICKER);
}
