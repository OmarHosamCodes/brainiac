const serverUrl =
  import.meta.env.VITE_PUBLIC_SERVER_URL ??
  import.meta.env.NUXT_PUBLIC_SERVER_URL ??
  "http://localhost:7000";

export function getServerUrl(): string {
  return serverUrl;
}
