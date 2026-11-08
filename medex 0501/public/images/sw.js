// MEDex Push Notification & Announcement Service Worker
const CACHE_NAME = 'medex-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle native Web Push event
self.addEventListener('push', (event) => {
  let data = {
    title: '📢 MEDex Announcement',
    message: 'A new clinical bulletin or update has been published.',
    url: '/news'
  };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (_) {
    if (event.data) {
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message || data.body || '',
    icon: data.image_url || data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'medex-news-' + (data.id || data.news_id || Date.now()),
    data: {
      url: data.url || (data.news_id ? `/news?id=${data.news_id}` : '/news')
    },
    vibrate: [120, 60, 120, 60, 240],
    actions: [
      { action: 'open', title: 'Read Announcement' }
    ],
    requireInteraction: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '📢 MEDex Announcement', options)
  );
});

// Handle notification click: focus or open URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/news';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle direct message from foreground tabs (e.g. backgrounded tab dispatch)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {};
    self.registration.showNotification(payload.title || '📢 MEDex Announcement', {
      body: payload.message || '',
      icon: payload.image_url || payload.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'medex-news-' + (payload.id || payload.news_id || Date.now()),
      data: {
        url: payload.url || (payload.news_id ? `/news?id=${payload.news_id}` : '/news')
      },
      vibrate: [120, 60, 120],
      requireInteraction: true
    });
  }
});
