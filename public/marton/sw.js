// 마트ON 서비스워커: 화면 오프라인 캐시 + 웹 푸시 수신 + 알림 클릭 처리
const CACHE = 'marton-v4';
const SHELL = ['/marton/', '/marton/manifest.webmanifest', '/marton/icon.svg', '/marton/icon-192.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

// 화면은 네트워크 우선, 실패 시 캐시. API/실시간 스트림은 절대 캐시하지 않는다.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('/marton/'))),
  );
});

// 서버 푸시: 앱이 닫혀 있거나 화면이 꺼져 있어도 표시된다
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: '마트ON', body: event.data ? event.data.text() : '' }; }
  const urgent = Boolean(data.urgent);
  event.waitUntil(
    self.registration.showNotification(data.title || '마트ON', {
      body: data.body || '',
      tag: data.tag || 'marton',
      renotify: true,
      requireInteraction: urgent, // 긴급은 직접 닫을 때까지 유지
      vibrate: urgent ? [500, 200, 500, 200, 500, 200, 500] : [200, 100, 200],
      icon: '/marton/icon-192.png',
      badge: '/marton/badge-96.png',
      data: { url: data.url || '/marton/' },
    }),
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => new URL(c.url).pathname.startsWith('/marton'));
      return open ? open.focus() : self.clients.openWindow('/marton/');
    }),
  );
});
