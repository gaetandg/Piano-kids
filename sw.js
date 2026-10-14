// Service worker : l'app marche hors connexion, mais prend toujours la dernière version en ligne.
const CACHE = 'piano-cosmos-v0.2.1';
const CORE = [
  './',
  './index.html',
  './css/style.css',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './js/main.js',
  './js/router.js',
  './js/ui.js',
  './js/state.js',
  './js/music.js',
  './js/audio.js',
  './js/speech.js',
  './js/pitch.js',
  './js/pitchcore.js',
  './js/keyboard.js',
  './js/songs.js',
  './js/curriculum.js',
  './js/rewards.js',
  './js/version.js',
  './js/screens/profiles.js',
  './js/screens/hub.js',
  './js/screens/game.js',
  './js/screens/free.js',
  './js/screens/library.js',
  './js/screens/parents.js',
  './js/screens/calibrate.js',
  './js/games/shell.js',
  './js/games/art.js',
  './js/games/intro.js',
  './js/games/findkey.js',
  './js/games/namenote.js',
  './js/games/playnote.js',
  './js/games/highlow.js',
  './js/games/simon.js',
  './js/games/rhythm.js',
  './js/games/song.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour voir tout de suite les nouveautés), cache si hors ligne.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  e.respondWith(
    fetch(sameOrigin ? new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html'))),
  );
});
