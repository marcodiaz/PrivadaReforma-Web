/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

clientsClaim()
self.skipWaiting()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data?.json() as {
        title?: string
        body?: string
        url?: string
        tag?: string
        data?: Record<string, unknown>
      }
    } catch {
      return {}
    }
  })()

  const title = payload.title ?? 'Privada Reforma'
  const body = payload.body ?? 'Tienes una actualizacion.'
  const url = payload.url ?? '/app/home'
  const tag = payload.tag ?? 'privada-notification'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: {
        url,
        ...(payload.data ?? {}),
      },
      icon: '/privada-ai-logo.svg',
      badge: '/privada-ai-logo.svg',
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl =
    typeof event.notification.data?.url === 'string' && event.notification.data.url.length > 0
      ? event.notification.data.url
      : '/app/home'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && 'navigate' in client) {
          const windowClient = client as WindowClient
          return windowClient.navigate(targetUrl).then(() => windowClient.focus())
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
