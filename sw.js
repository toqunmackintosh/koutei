/* 工事工程表エディタ ─ オフライン用
   ネットがあれば最新を取りに行き、無ければ保存済みを使う */
const CACHE = "koutei-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest",
              "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", ev => {
  ev.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ev => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 本体（ページ）は「まずネット、だめなら保存済み」＝更新が届き、圏外でも開ける
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html")) {
    ev.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => { c.put("./index.html", copy); c.put("./", copy.clone && res.clone()); }).catch(()=>{});
        return res;
      }).catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }
  // それ以外は「まず保存済み、裏で更新」
  ev.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        caches.open(CACHE).then(c => c.put(req, res.clone())).catch(()=>{});
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

self.addEventListener("message", ev => { if (ev.data === "skipWaiting") self.skipWaiting(); });
