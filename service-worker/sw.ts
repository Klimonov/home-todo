/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

function resolveAppUrl(url?: string) {
  if (!url) {
    return self.registration.scope
  }

  if (/^https?:\/\//.test(url)) {
    return url
  }

  return new URL(url.replace(/^\/+/, ''), self.registration.scope).toString()
}

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? 'Home Todo'
  const iconUrl = new URL('pwa.svg', self.registration.scope).toString()
  const options: NotificationOptions = {
    body: data.body ?? 'Новое уведомление',
    icon: iconUrl,
    badge: iconUrl,
    data: {
      url: resolveAppUrl(data.url),
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = resolveAppUrl(event.notification.data?.url)

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find((client) => 'focus' in client)

    if (existing) {
      await existing.focus()
      return
    }

    await self.clients.openWindow(targetUrl)
  })())
})
