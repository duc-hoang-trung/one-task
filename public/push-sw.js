/**
 * Phần xử lý push, được service worker do Workbox sinh ra importScripts vào
 * (xem workbox.importScripts trong vite.config.ts). Để plain JS ở public/ nên không qua bundler:
 * đổi cách sinh SW sang injectManifest chỉ vì mấy chục dòng này là đánh đổi không đáng.
 */
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: event.data && event.data.text ? event.data.text() : '' }
  }
  const title = data.title || 'Một Việc'
  const options = {
    body: data.body || undefined,
    // tag trùng nhau thì thông báo sau thay thông báo trước, không xếp chồng.
    tag: data.tag || 'motviec',
    icon: data.icon || 'icon-192.png',
    badge: data.badge || 'icon-192.png',
    data: { url: data.url || './' },
    renotify: Boolean(data.tag),
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || './', self.location.href).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Đang mở sẵn thì đưa tab đó lên, không mở thêm cửa sổ mới.
      for (const c of list) {
        if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus()
      }
      return self.clients.openWindow(target)
    }),
  )
})
