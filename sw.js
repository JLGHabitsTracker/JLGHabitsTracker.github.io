self.addEventListener("install", function(){ self.skipWaiting(); });
self.addEventListener("activate", function(e){ e.waitUntil(self.clients.claim()); });
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
