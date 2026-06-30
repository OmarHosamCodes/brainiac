declare const __BRAINIAC_SERVER_URL__: string;

const serverUrl = __BRAINIAC_SERVER_URL__ || (import.meta.env.DEV ? "http://localhost:7000" : "");

export function getServerUrl(): string {
  if (!serverUrl) {
    throw new Error("VITE_PUBLIC_SERVER_URL is required in production builds");
  }

  return serverUrl;
}

/** In dev, route RPC through the Vite proxy so WS and HTTP share the page origin. */
export function getRpcBaseUrl(): string {
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return window.location.origin;
  }
  return getServerUrl();
}

/** Route auth through the web app origin so session cookies stay first-party. */
export function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getServerUrl();
}
