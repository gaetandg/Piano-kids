// Trophées : des exploits à trois paliers (bronze, argent, or), calculés à partir du profil.
import { PLANETS } from './curriculum.js';
import { totalStars, updateProfile } from './state.js';

export const TIERS = [
  { icon: '🥉', name: 'bronze' },
  { icon: '🥈', name: 'argent' },
  { icon: '🥇', name: 'or' },
];

const realPlanets = PLANETS.filter((pl) => !pl.comingSoon && pl.missions.length);
const songMissions = new Map(
  realPlanets.flatMap((pl) => pl.missions.filter((m) => m.type === 'song').map((m) => [m.id, m.song])),
);
const isIntro = new Set(realPlanets.flatMap((pl) => pl.missions.filter((m) => m.type === 'intro').map((m) => m.id)));

const rainBest = (p, key) =>
  Math.max(0, ...Object.values(p.rain || {}).flatMap((bySpeed) => Object.values(bySpeed).map((r) => r[key] || 0)));

// Plus longue suite de jours joués d'affilée.
function bestStreak(days = []) {
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of [...days].sort()) {
    const t = Date.parse(d + 'T12:00:00');
    run = prev != null && Math.round((t - prev) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export const TROPHIES = [
  {
    id: 'explorer',
    icon: '🪐',
    name: 'Explorateur',
    goal: (n) => `Termine ${n} planète${n > 1 ? 's' : ''}`,
    tiers: [1, 6, realPlanets.length],
    value: (p) => realPlanets.filter((pl) => pl.missions.every((m) => (p.done || {})[m.id])).length,
  },
  {
    id: 'stars',
    icon: '⭐',
    name: 'Pluie d’étoiles',
    goal: (n) => `Gagne ${n} étoiles`,
    tiers: [25, 100, 250],
    value: (p) => totalStars(p),
  },
  {
    id: 'perfect',
    icon: '💯',
    name: 'Perfectionniste',
    goal: (n) => `Fais ${n} missions avec 3 étoiles`,
    tiers: [10, 40, 100],
    value: (p) => Object.entries(p.stars || {}).filter(([id, s]) => s === 3 && !isIntro.has(id)).length,
  },
  {
    id: 'singer',
    icon: '🎵',
    name: 'Musicien',
    goal: (n) => `Joue ${n} chanson${n > 1 ? 's' : ''} sans faute (3 étoiles)`,
    tiers: [1, 10, 25],
    value: (p) => {
      const songs = new Set(
        Object.entries(p.songStars || {})
          .filter(([, s]) => s === 3)
          .map(([id]) => id),
      );
      for (const [id, s] of Object.entries(p.stars || {})) if (s === 3 && songMissions.has(id)) songs.add(songMissions.get(id));
      return songs.size;
    },
  },
  {
    id: 'rain',
    icon: '🌠',
    name: 'Attrape-notes',
    goal: (n) => `Fais ${n} points en Pluie de notes`,
    tiers: [1000, 4000, 8000],
    value: (p) => rainBest(p, 'score'),
  },
  {
    id: 'combo',
    icon: '🔥',
    name: 'Combo de feu',
    goal: (n) => `Enchaîne ${n} notes justes en Pluie de notes`,
    tiers: [15, 30, 50],
    value: (p) => rainBest(p, 'maxCombo'),
  },
  {
    id: 'days',
    icon: '📅',
    name: 'Fidèle au piano',
    goal: (n) => `Joue ${n} jours de suite`,
    tiers: [3, 7, 30],
    value: (p) => bestStreak(p.days),
  },
  {
    id: 'stickers',
    icon: '🎁',
    name: 'Collectionneur',
    goal: (n) => `Trouve ${n} autocollants`,
    tiers: [10, 25, 48],
    value: (p) => (p.stickers || []).length,
  },
  {
    id: 'shiny',
    icon: '✨',
    name: 'Chasseur de brillants',
    goal: (n) => `Trouve ${n} autocollant${n > 1 ? 's' : ''} brillant${n > 1 ? 's' : ''}`,
    tiers: [1, 5, 15],
    value: (p) => (p.shiny || []).length,
  },
  {
    id: 'composer',
    icon: '✍️',
    name: 'Compositeur',
    goal: (n) => `Invente ${n} chanson${n > 1 ? 's' : ''}`,
    tiers: [1, 5, 12],
    value: (p) => (p.compositions || []).length,
  },
  {
    id: 'memory-levels', // nouveau nom : les paliers ont changé avec les niveaux du Mémory
    icon: '🐘',
    name: 'Mémoire d’éléphant',
    goal: (n) => `Gagne ${n} étoiles au Mémory`,
    tiers: [4, 12, 20],
    value: (p) => Object.values(p.memoStars || {}).reduce((a, b) => a + b, 0),
  },
  {
    id: 'deco',
    icon: '🎨',
    name: 'Décorateur',
    goal: (n) => `Colle ${n} autocollants sur ta planète`,
    tiers: [3, 10, 25],
    value: (p) => ((p.deco && p.deco.items) || []).length,
  },
];

// Palier atteint (0 = aucun, 3 = or).
export function tierOf(t, p) {
  const v = t.value(p);
  return t.tiers.filter((x) => v >= x).length;
}

// Les nouveaux paliers atteints et pas encore annoncés.
export function newTrophies(p) {
  if (!p) return [];
  const seen = p.trophiesSeen || {};
  return TROPHIES.map((t) => ({ trophy: t, tier: tierOf(t, p) })).filter((x) => x.tier > (seen[x.trophy.id] || 0));
}

// Marque ces trophées comme annoncés.
export function markTrophiesSeen(p, list) {
  if (!p || !list.length) return;
  const seen = { ...(p.trophiesSeen || {}) };
  list.forEach((x) => (seen[x.trophy.id] = Math.max(seen[x.trophy.id] || 0, x.tier)));
  updateProfile(p.id, { trophiesSeen: seen });
}

// Note qu'on a joué aujourd'hui (pour les jours de suite).
export function markDay(p) {
  if (!p) return;
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const days = p.days || [];
  if (!days.includes(day)) updateProfile(p.id, { days: [...days, day].slice(-400) });
}
