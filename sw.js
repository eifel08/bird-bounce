/* Bird Bounce — service worker: precaches the whole game so it runs fully offline. */
const CACHE = 'bird-bounce-v3';
const FONT_CACHE = 'bird-bounce-fonts';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './js/config.js',
  './js/utils.js',
  './js/storage.js',
  './js/audio.js',
  './js/entities.js',
  './js/render.js',
  './js/ai.js',
  './js/achievements.js',
  './js/sessions.js',
  './js/versus.js',
  './js/cave.js',
  './js/ui.js',
  './js/pwa.js',
  './js/main.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: serve from cache, refresh in the background when online.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') c.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Game files: answer from cache instantly (works offline) and refresh the cache in the background,
  // so a new version shows up on the next launch.
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req)
        .then((res) => {
          if (res.ok) c.put(req, res.clone());
          return res;
        })
        .catch(() => hit || (req.mode === 'navigate' ? c.match('./index.html') : Response.error()));
      if (hit) {
        e.waitUntil(net.catch(() => {}));
        return hit;
      }
      return net;
    })
  );
});
