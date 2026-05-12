// sw.js — Service worker that makes Swiped install as a real standalone PWA
// (vs. an "add shortcut" entry that just reopens Chrome). Chrome on Android
// requires a registered SW with a fetch handler to qualify the page as
// installable; this one just passes fetches through to the network so the
// no-cache HTTP headers configured in render.yaml continue to control
// freshness. No precaching, no offline mode for now.

const VERSION = '2026-05-13-02';

// App-owned files we want guaranteed-fresh on every load. iOS PWAs have
// been observed holding on to cached copies of these despite the no-cache
// HTTP headers, which broke the calendar / sync layer when their wire
// shape changed. For these we ask fetch() to bypass any cache entirely.
const FORCE_FRESH_RE = /\/(ics(?:-v\d+)?|sync|wheel|liquid|detail|settings|app)\.(jsx?)(?:\?|$)/;

self.addEventListener('install', () => {
  // Replace any older SW version immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of open tabs / the installed PWA window so updates apply
  // without the user needing a manual refresh. Also wipe any Cache API
  // entries the browser may have collected — we never use them, so any
  // leftovers from older SW versions only get in the way.
  event.waitUntil((async () => {
    await self.clients.claim();
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (e) { /* not all browsers expose caches */ }
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && FORCE_FRESH_RE.test(url.pathname + url.search)) {
    // Force a network round-trip ignoring any HTTP cache.
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => new Response('Offline', {
        status: 503, headers: { 'Content-Type': 'text/plain' },
      }))
    );
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    }))
  );
});
