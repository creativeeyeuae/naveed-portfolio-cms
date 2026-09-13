// Admin push-notification service worker. Only ever shows notifications this site's own
// server sent (see functions/_shared/webpush.ts) -- it has no other job.
self.addEventListener("push", (event) => {
  let data = { title: "Creative Fusion CMS", body: "You have a new update." };
  try { if (event.data) data = event.data.json(); } catch {}
  const title = data.title || "Creative Fusion CMS";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon",
      badge: "/icon",
      data: { url: data.url || "/?admin=1" },
      tag: title,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/?admin=1";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
