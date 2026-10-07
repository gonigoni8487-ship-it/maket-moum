// 마트ON 서비스워커: 화면 오프라인 캐시 + 알림 클릭 처리
const CACHE = 'marton-v2';
const SHELL = ['/marton/', '/marton/manifest.webmanifest', '/marton/icon.svg'];

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

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const open = list.find(c => new URL(c.url).pathname.startsWith('/marton'));
      return open ? open.focus() : self.clients.openWindow('/marton/');
    }),
  );
});
