/* MEHR FOOD service worker: internetsiz ishlash va avtomatik yangilanish.
   - data/*.json  → avval internetdan (yangi retseptlar darhol ko'rinadi), bo'lmasa saqlangan nusxa
   - ilova fayllari → saqlangan nusxa darhol ochiladi, orqada yangilanadi
   - rasmlar       → bir marta yuklanadi va saqlanadi */
const VERSION = "mehr-v2";
const SHELL = ["./", "index.html", "js/i18n.js", "js/app.js", "js/icons.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const keyOf = req => { const u = new URL(req.url); u.search = ""; return u.toString(); };

async function networkFirst(req){
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(keyOf(req), res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(keyOf(req));
    if (hit) return hit;
    throw e;
  }
}
async function staleWhileRevalidate(req){
  const cache = await caches.open(VERSION);
  const hit = await cache.match(keyOf(req));
  const net = fetch(req).then(res => { if (res.ok || res.type === "opaque") cache.put(keyOf(req), res.clone()); return res; }).catch(() => hit);
  return hit || net;
}
async function cacheFirst(req){
  const cache = await caches.open(VERSION);
  const hit = await cache.match(keyOf(req));
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === "opaque") cache.put(keyOf(req), res.clone());
  return res;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.includes("/data/")) return e.respondWith(networkFirst(req));
    if (/\.(jpe?g|png|webp|svg)$/i.test(url.pathname)) return e.respondWith(cacheFirst(req));
    if (/\.(mp4|webm)$/i.test(url.pathname)) return; // videolar oqim bilan o'ynaydi, saqlanmaydi
    if (req.mode === "navigate") return e.respondWith(networkFirst(req).catch(() => caches.match(new URL("index.html", self.registration.scope).toString())));
    return e.respondWith(staleWhileRevalidate(req));
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return e.respondWith(cacheFirst(req));
});
