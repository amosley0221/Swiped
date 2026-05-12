// sw.js — Service worker that makes Swiped install as a real standalone PWA
// (vs. an "add shortcut" entry that just reopens Chrome). Chrome on Android
// requires a registered SW with a fetch handler to qualify the page as
// installable; this one just passes fetches through to the network so the
// no-cache HTTP headers configured in render.yaml continue to control
// freshness. No precaching, no offline mode for now.

const VERSION = '2026-05-13-01';

self.addEventListener('install', () => {
  // Replace any older SW version immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of open tabs / the installed PWA window so updates apply
  // without the user needing a manual refresh.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first, no cache. If you ever want true offline support, this is
  // where you'd add a precache + cache-first lookup for the app shell.
  event.respondWith(
    fetch(event.request).catch(() => new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    }))
  );
});
