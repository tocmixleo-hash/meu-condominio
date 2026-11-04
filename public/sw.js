// Service worker do portal — cache leve para instalar no celular (PWA).
// • API sempre na rede (dados ao vivo, nunca cacheados)
// • Estáticos (/_next/static, ícones): cache-first
// • Navegação: rede primeiro, cai para o cache quando offline
const CACHE = "mc-portal-v3";
const ESTATICOS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/fotos/logo-flor.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ESTATICOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // dados sempre ao vivo

  const estatico =
    url.pathname.startsWith("/_next/static/") || ESTATICOS.includes(url.pathname);

  if (estatico) {
    e.respondWith(
      caches.match(e.request).then(
        (cacheado) =>
          cacheado ||
          fetch(e.request).then((resposta) => {
            const copia = resposta.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copia));
            return resposta;
          }),
      ),
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((resposta) => {
        if (e.request.mode === "navigate") {
          const copia = resposta.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resposta;
      })
      .catch(() =>
        caches.match(e.request).then((cacheado) => cacheado || caches.match("/")),
      ),
  );
});
