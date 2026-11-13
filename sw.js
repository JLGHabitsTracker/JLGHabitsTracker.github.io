/* Offline shell: the app opens from the device cache and refreshes itself in the background. Data requests (Supabase) are never cached. */
var CACHE = "jlg-shell-v1";
var SHELL = ["./", "vendor/supabase.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
var FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(SHELL.map(function(u){
      return fetch(u, {cache:"reload"}).then(function(r){ if(r.ok) return c.put(u, r); }).catch(function(){});
    }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ if(k !== CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

function refresh(req, key){
  return fetch(req).then(function(r){
    if(r && r.ok){ var copy = r.clone(); caches.open(CACHE).then(function(c){ c.put(key || req, copy); }); }
    return r;
  });
}

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url), same = url.origin === self.location.origin;
  if(!same && FONT_HOSTS.indexOf(url.hostname) < 0) return;
  if(same && /version\.json$/.test(url.pathname)) return;

  var scopePath = new URL(self.registration.scope).pathname;
  if(req.mode === "navigate" && (url.pathname === scopePath || url.pathname === scopePath + "index.html")){
    var page = new URL("./", self.registration.scope).href;
    var fresh = function(){ return refresh(new Request(page, {cache:"no-cache"}), page); };
    if(/[?&]v=/.test(url.search)){
      /* An update was just detected: take the new copy from the network, fall back to the saved one. */
      e.respondWith(fresh().catch(function(){ return caches.match(page); }));
      return;
    }
    e.respondWith(caches.match(page).then(function(hit){
      var net = fresh();
      if(hit){ e.waitUntil(net.catch(function(){})); return hit; }
      return net;
    }));
    return;
  }

  e.respondWith(caches.match(req, {ignoreSearch: same}).then(function(hit){
    var net = refresh(req, same ? url.origin + url.pathname : req);
    if(hit){ e.waitUntil(net.catch(function(){})); return hit; }
    return net;
  }));
});

self.addEventListener("push", function(e){
  var d = {};
  try{ d = e.data.json(); }catch(x){ d = {title:"JLG Habits", body: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.title || "JLG Habits", {body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", tag: d.tag || undefined}));
});
self.addEventListener("notificationclick", function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window", includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){ if("focus" in cs[i]) return cs[i].focus(); }
    return self.clients.openWindow("./");
  }));
});
