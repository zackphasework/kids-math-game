/* Power-Up Math service worker: lets the game install as an app and keep working offline.
   The game's own files are network-first, so every update shows up as soon as there's internet;
   fonts and three.js (for the 3D islands) come from CDNs and are cached the first time they load.
   Family saves (Supabase) always go straight to the network. */
const CACHE = 'pum-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/core.js', 'js/math.js', 'js/levels.js', 'js/engine.js', 'js/sky-art.js', 'js/sky.js', 'js/sky3d.js',
  'js/store.js', 'js/crew.js', 'js/rig.js', 'js/trucks.js', 'js/app.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon.png'];
const CDN = /^https:\/\/(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch:true}).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined))));
    return;
  }
  if (CDN.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
