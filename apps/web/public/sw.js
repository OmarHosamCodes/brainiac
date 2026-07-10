self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {};
  const title = typeof payload.title === "string" ? payload.title : "Brainiac";
  const body = typeof payload.body === "string" ? payload.body : "";
  const url = typeof payload.url === "string" ? payload.url : "/agency";
  const notificationId = typeof payload.notificationId === "string" ? payload.notificationId : "";
  const teamId = typeof payload.teamId === "string" ? payload.teamId : "";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: notificationId || undefined,
      data: { url, notificationId, teamId },
      icon: "/favicon.ico",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/agency";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
