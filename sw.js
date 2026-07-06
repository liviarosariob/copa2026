const CACHE_NAME = "bolao-livia-camila-v22";
const ASSETS = [
  "./",
  "index.html",
  "src/app.js?v=22",
  "src/styles.css?v=22",
  "src/services/scoringService.js",
  "src/services/storageService.js",
  "src/services/supabaseConfig.js",
  "src/services/supabaseService.js",
  "src/services/importExportService.js",
  "src/services/footballResultsService.js",
  "src/services/countries.js",
  "manifest.webmanifest",
  "data/exemplo-rodada.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
  );
});
