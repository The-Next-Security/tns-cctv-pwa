// Service worker TNS CCTV (D9): push real + click-through a la alerta.
// Sin precache: la PWA opera online contra el backend; el SW existe para
// instalabilidad y para recibir Web Push (VAPID) con la app cerrada.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'TNS CCTV — Alerta'
  const options = {
    body: data.body || 'Nueva notificación de seguridad',
    icon: '/brand/tns-logo.png',
    badge: '/brand/tns-logo.png',
    tag: data.tag || 'tns-cctv-alert',
    data: { url: data.url || '/operacion' },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/operacion'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
