// RIXARLOG service worker: app disponible sin conexión (los datos van por Supabase)
const CACHE = "rixarlog-v1.3.0";
const SHELL = ["./", "index.html", "css/app.css", "manifest.webmanifest", "airports.json",
  "js/config.js", "js/i18n.js", "js/sun.js", "js/store.js", "js/io.js", "js/integrity.js", "js/app.js",
  "vendor/supabase.js", "vendor/591.supabase.js", "vendor/chart.umd.js", "vendor/jspdf.umd.min.js",
  "vendor/jspdf.plugin.autotable.min.js", "vendor/xlsx.mini.min.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.hostname.endsWith("supabase.co")) return;
  if (u.origin === location.origin) {
    // red primero para el código (actualizaciones), caché si no hay conexión
    e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html"))));
  } else if (u.hostname.includes("fonts.g")) {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((n) => { const c = n.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return n; })));
  }
});
