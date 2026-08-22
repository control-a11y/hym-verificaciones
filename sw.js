// Service worker mínimo: lo exige la instalación como PWA/TWA (Android).
// Los assets de Vite llevan hash en el nombre → cache-first es seguro.
// El HTML/manifest van RED-PRIMERO para que cada deploy a Pages llegue al
// teléfono sin reinstalar nada; la cache solo es respaldo sin conexión.
// Solo toca peticiones GET del mismo origen — Supabase pasa de largo.
const CACHE = 'hym-verificaciones-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.includes('/assets/')) {
    // Hasheados: si está en cache es idéntico al de la red.
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then(
          (hit) =>
            hit ??
            fetch(req).then((res) => {
              if (res.ok) c.put(req, res.clone())
              return res
            }),
        ),
      ),
    )
  } else {
    // HTML, manifest, iconos: red primero, cache de respaldo.
    e.respondWith(
      caches.open(CACHE).then((c) =>
        fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone())
            return res
          })
          .catch(() => c.match(req).then((hit) => hit ?? Response.error())),
      ),
    )
  }
})
