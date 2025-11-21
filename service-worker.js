
const CACHE_NAME = 'timezen-v1';
const OFFLINE_CACHE = 'timezen-offline-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/edutrack/',
  '/edutrack/index.html',
  '/edutrack/style.css',
  '/edutrack/script.js',
  '/edutrack/firebase-config.js',
  '/edutrack/fcm-client.js',
  '/edutrack/offline.html',
  '/edutrack/offline-style.css',
  '/edutrack/offline-script.js',
  '/edutrack/about.html',
  '/edutrack/about-style.css',
  '/edutrack/about-script.js',
  '/edutrack/settings.html',
  '/edutrack/settings-style.css',
  '/edutrack/settings-script.js',
  '/edutrack/admin.html',
  '/edutrack/admin-style.css',
  '/edutrack/admin-script.js',
  '/edutrack/image-viewer.html',
  '/edutrack/image-viewer-style.css',
  '/edutrack/image-viewer-script.js',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap',
  'https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('[Service Worker] Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network first, then cache, with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Firebase requests - network only (but cache data for offline)
  if (url.origin.includes('firebase') || url.origin.includes('googleapis')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(OFFLINE_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if available
          return caches.match(request);
        })
    );
    return;
  }

  // For all other requests - Network First strategy
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If HTML page and not in cache, return offline page
          if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/edutrack/offline.html');
          }
          
          // For other resources, return a basic offline response
          return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});
