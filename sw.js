/**
 * Swappo Service Worker
 * Handles offline functionality, caching strategies, and push notifications
 * Cache-first for assets, Network-first for HTML and API calls
 */

const CACHE_NAME = 'swappo-v10';
const ASSET_CACHE = 'swappo-assets-v7';
const API_CACHE = 'swappo-api-v7';

// Files to pre-cache during install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/mock-data.js',
  '/js/demo-engine.js',
  '/js/i18n.js',
  '/js/animations.js',
  '/js/publier.js',
  '/js/cookie-consent.js',
  '/pages/catalogue.html',
  '/pages/login.html',
  '/pages/publier.html',
  '/pages/giveaway.html',
  '/pages/product.html',
  '/pages/profile.html',
  '/pages/chat.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

/**
 * INSTALL EVENT
 * Pre-cache essential files for offline access
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching critical resources');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Install error:', error);
      })
  );
});

/**
 * ACTIVATE EVENT
 * Clean up old caches and claim clients
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME &&
                cacheName !== ASSET_CACHE &&
                cacheName !== API_CACHE) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[Service Worker] Activation error:', error);
      })
  );
});

/**
 * FETCH EVENT
 * Implement different caching strategies based on resource type
 *
 * Strategy:
 * - HTML pages: Network-first (always try fresh)
 * - CSS/JS/Images: Cache-first (use cached if available)
 * - API calls: Network-first with fallback
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests that aren't from CDNs
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('cdnjs.cloudflare.com') &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  // HTML pages - Network-first strategy
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response for offline use
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached version if network fails
          return caches.match(request)
            .then((cached) => {
              return cached || cacheOfflinePage();
            });
        })
    );
    return;
  }

  // CSS, JavaScript, and Images - Cache-first strategy
  if (request.method === 'GET' &&
      (request.destination === 'style' ||
       request.destination === 'script' ||
       request.destination === 'image' ||
       request.url.includes('.css') ||
       request.url.includes('.js') ||
       request.url.includes('.png') ||
       request.url.includes('.jpg') ||
       request.url.includes('.jpeg') ||
       request.url.includes('.svg') ||
       request.url.includes('.webp'))) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request)
            .then((response) => {
              if (response && response.status === 200) {
                const responseClone = response.clone();
                caches.open(ASSET_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // Return offline image placeholder if available
              if (request.destination === 'image') {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#e0e0e0" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999" font-size="12">Offline</text></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
              return cacheOfflinePage();
            });
        })
    );
    return;
  }

  // API calls - Network-first strategy
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cached) => {
              return cached || offlineAPIResponse();
            });
        })
    );
    return;
  }

  // Default: Network-first
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  );
});

/**
 * PUSH NOTIFICATION EVENT
 * Handle incoming push notifications from backend
 * Typically triggered by admin for alerts, messages, or promotional content
 */
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Swappo',
    body: 'You have a new update',
    icon: '/img/icon-192.png',
    badge: '/img/icon-192.png',
    tag: 'swappo-notification',
    requireInteraction: false
  };

  // Parse push event data if available
  if (event.data) {
    try {
      notificationData = {
        ...notificationData,
        ...event.data.json()
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: {
        url: notificationData.url || '/'
      }
    })
  );
});

/**
 * NOTIFICATION CLICK EVENT
 * Handle user clicking on a push notification
 * Opens the app or navigates to the specified URL
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Look for an existing window/tab already open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // If no existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/**
 * NOTIFICATION CLOSE EVENT
 * Optional: Track when users dismiss notifications
 */
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event.notification.tag);
});

/**
 * Helper: Return offline fallback page
 */
function cacheOfflinePage() {
  return caches.match('/index.html')
    .then((cached) => {
      return cached || new Response(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Swappo - Offline</title>
          <style>
            * { margin: 0; padding: 0; }
            body {
              font-family: 'Inter', sans-serif;
              background: #f5f5f5;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 20px;
            }
            .offline-container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              text-align: center;
              max-width: 400px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .offline-icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #09b1ba;
              margin-bottom: 12px;
              font-size: 24px;
            }
            p {
              color: #666;
              margin-bottom: 24px;
              line-height: 1.6;
            }
            .note {
              background: #f0f0f0;
              border-left: 4px solid #09b1ba;
              padding: 16px;
              text-align: left;
              border-radius: 4px;
              font-size: 14px;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1>You're Offline</h1>
            <p>It looks like your internet connection is unavailable.</p>
            <div class="note">
              <strong>Cached pages:</strong> Some previously loaded pages are available offline. Check back when you're connected to access real-time features.
            </div>
          </div>
        </body>
        </html>`,
        {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    });
}

/**
 * Helper: Return offline API response
 */
function offlineAPIResponse() {
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Please check your connection.',
      cached: false
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Log service worker status
console.log('[Service Worker] Loaded successfully');
