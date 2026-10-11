/* AID-C2S V5 production-only app-shell cache. */
const CACHE = 'aid-c2s-v5-shell';
const APP_SHELL = ['/', '/manifest.webmanifest', '/favicon.svg'];
const LOCAL_MEDIA = ['/media/sensor-grid.mp4', '/media/aerial-day.mp4', '/media/aerial-night.mp4'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Cache items independently: one optional asset failing must not prevent app-shell install.
    await Promise.all([...APP_SHELL, ...LOCAL_MEDIA].map(asset => cache.add(asset).catch(() => undefined)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('aid-c2s-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Navigation is network-first so fresh deployments do not get stuck on stale HTML.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put('/', copy)).catch(() => undefined); return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/'))));
    return;
  }
  // Explicit media/app-shell assets are cache-first for offline training.
  if (LOCAL_MEDIA.includes(url.pathname) || APP_SHELL.includes(url.pathname) || /\/assets\/.+\.(js|css|woff2?)$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => undefined); }
      return response;
    })));
  }
});
