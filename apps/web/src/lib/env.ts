const serverUrl =
  import.meta.env.VITE_PUBLIC_SERVER_URL ??
  import.meta.env.NUXT_PUBLIC_SERVER_URL ??
  "http://localhost:7000";

export function getServerUrl(): string {
  return serverUrl;
}

/** In dev, route RPC through the Vite proxy so WS and HTTP share the page origin. */
export function getRpcBaseUrl(): string {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return window.location.origin;
  }
  return getServerUrl();
}
