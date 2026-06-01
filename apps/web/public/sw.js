// Storytime service worker. Manual cache strategies — no workbox.
// Bumping this version string invalidates all caches.
const VERSION = 'storytime-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const API_CACHE = `${VERSION}-api`;
const MEDIA_CACHE = `${VERSION}-media`;

const SHELL_URLS = ['/', '/favicon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isAsset(url) {
  return url.pathname.startsWith('/assets/') ||
         url.pathname.startsWith('/voice-samples/') ||
         url.pathname === '/favicon.svg' ||
         url.pathname === '/manifest.webmanifest';
}

function isListOrGetStoryApi(url) {
  return url.pathname === '/api/listStories' ||
         url.pathname === '/api/getStory';
}

function isMediaApi(url) {
  return url.pathname === '/api/media';
}

function isMutationOrAdmin(url) {
  if (url.pathname.startsWith('/api/_admin')) return true;
  return /^\/api\/(createStory|updateStory|translateStory|deleteStory|deleteStoryVersion|moderate|askVoice)$/.test(url.pathname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && (request.method === 'GET' || request.method === 'HEAD')) {
    cache.put(request, response.clone()).catch(() => {});
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  }).catch(() => null);
  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }
  const fresh = await networkPromise;
  if (fresh) return fresh;
  return new Response(JSON.stringify({ error: 'offline' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' && request.method !== 'HEAD') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // SPA navigation: serve the shell index.html for any in-app route.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = await caches.match('/');
        if (cached) {
          // Refresh shell in the background.
          fetch(request).then((r) => {
            if (r.ok) caches.open(SHELL_CACHE).then((c) => c.put('/', r.clone()));
          }).catch(() => {});
          return cached;
        }
        return fetch(request);
      })(),
    );
    return;
  }

  if (isMutationOrAdmin(url)) return;       // network-only
  if (isAsset(url)) { event.respondWith(cacheFirst(request, ASSET_CACHE)); return; }
  if (isMediaApi(url)) { event.respondWith(cacheFirst(request, MEDIA_CACHE)); return; }
  if (isListOrGetStoryApi(url)) { event.respondWith(staleWhileRevalidate(request, API_CACHE)); return; }
});
