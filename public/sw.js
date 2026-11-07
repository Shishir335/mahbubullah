/* eslint-disable no-restricted-globals, arrow-body-style */
// Service Worker for Portfolio Website Caching & Offline Capabilities
const STATIC_CACHE_NAME = 'portfolio-static-v1';
const API_CACHE_NAME = 'portfolio-api-v1';

const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/js/portfolio.js',
  '/img/avatar.png',
  '/img/app_showcase.png'
];

// Install: Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.debug('Failed to pre-cache some assets during install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== API_CACHE_NAME) {
            return caches.delete(key);
          }
          return null;
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Caching strategies based on request type
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Only handle http and https requests (ignore chrome-extension:, etc.)
  if (!url.protocol.startsWith('http')) return;

  // 2. Never intercept non-GET requests or admin/auth routes
  if (req.method !== 'GET') return;
  if (
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/api/v1/admin/profile') ||
    url.pathname.startsWith('/api/v1/admin/messages') ||
    url.pathname.startsWith('/api/v1/admin/login') ||
    url.pathname.startsWith('/api/v1/users')
  ) {
    return;
  }

  // 3. Public Profile API: Network-First with Cache Fallback
  if (url.pathname === '/api/v1/admin/public-profile') {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cachedRes) => {
            if (cachedRes) return cachedRes;
            return new Response(JSON.stringify({ status: 'error', message: 'Offline' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // 4. Static Assets (CSS, JS, Fonts, Images): Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith('/css/') ||
    url.pathname.startsWith('/js/') ||
    url.pathname.startsWith('/img/') ||
    url.pathname.startsWith('/assets/') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedRes) => {
        const fetchPromise = fetch(req)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(req, resClone);
              });
            }
            return networkRes;
          })
          .catch(() => cachedRes);

        return cachedRes || fetchPromise;
      })
    );
    return;
  }

  // 5. HTML Navigation: Network-First with Cache Fallback
  const acceptHeader = req.headers.get('accept');
  if (req.mode === 'navigate' || (acceptHeader && acceptHeader.includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(req, resClone);
            });
          }
          return networkRes;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Default: Network with Cache Fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
