// Offline shell for the installed game. Network first, so a deploy is picked up as
// soon as the device can reach it; the cache is what makes it playable on a plane.
const CACHE="galaga-v1";
const SHELL=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./icon-180.png"];

self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>{}));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()).catch(()=>{}));
});
self.addEventListener("fetch",e=>{
  const req=e.request;
  if(req.method!=="GET"||new URL(req.url).origin!==location.origin)return;
  e.respondWith(
    fetch(req).then(res=>{
      const copy=res.clone();
      caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match(req).then(hit=>hit||caches.match("./index.html")))
  );
});
