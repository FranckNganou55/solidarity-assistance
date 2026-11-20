const CACHE_NAME = 'makenene-solidarite-shell-v3'
const APP_SHELL = '/'
const APP_ASSETS = ['/build/assets/app.js', '/build/assets/app.css']
const APP_ICONS = ['/icons/icon-192.png', '/icons/icon-512.png', '/manifest.webmanifest']

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([APP_SHELL, ...APP_ASSETS, ...APP_ICONS])))
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('makenene-solidarite-') && key !== CACHE_NAME).map(key => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(APP_SHELL, copy))
        }
        return response
      }).catch(async () => (await caches.match(APP_SHELL)) || Response.error())
    )
    return
  }

  if (url.pathname.startsWith('/build/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
        }
        return response
      }).catch(async () => (await caches.match(request)) || Response.error())
    )
  }
})
