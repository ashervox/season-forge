/* Service worker — offline support with fresh-when-online updates */
const CACHE = 'd3-s39-guide-v12';
const ASSETS = ['.', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network-first for the page/HTML so updates show immediately when online;
   fall back to cache when offline. Cache-first for static icons. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const isDoc = e.request.mode === 'navigate' ||
                e.request.destination === 'document' ||
                e.request.url.endsWith('/') ||
                e.request.url.endsWith('index.html');
  if (isDoc) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('index.html', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('index.html').then(h => h || caches.match('.')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      }))
    );
  }
});
