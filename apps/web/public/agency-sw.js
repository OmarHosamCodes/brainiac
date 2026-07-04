self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  const title = typeof payload.title === "string" ? payload.title : "Agency update";
  const body = typeof payload.body === "string" ? payload.body : "";
  const taskId = typeof payload.taskId === "string" ? payload.taskId : "";
  const url = typeof payload.url === "string" ? payload.url : "/agency?section=work";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { taskId, url },
      tag: typeof payload.notificationId === "string" ? payload.notificationId : undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const taskId = event.notification.data?.taskId;
  const url = event.notification.data?.url ?? "/agency?section=work";

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          await client.focus();
          client.postMessage({
            type: "agency-notification-click",
            taskId,
            url,
          });
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }
    })(),
  );
});
