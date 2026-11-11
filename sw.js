// NAS 电源控制面板 PWA Service Worker
// 缓存本地lib脚本与页面本体: 首次在线加载后, 断网也能打开面板(仅MQTT需在线)
var CACHE = "npsw-panel-v2";

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll([
      "lib/mqtt.min.js",
      "lib/uPlot.iife.min.js",
      "lib/uPlot.min.css"
    ]);
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (e.request.url.indexOf("/lib/") !== -1) {
    // lib脚本: 缓存优先, 安装后加载不耗流量
    e.respondWith(caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      });
    }));
  } else {
    // 页面本体: 网络优先保证最新, 断网时用缓存兜底
    e.respondWith(fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); }));
  }
});
