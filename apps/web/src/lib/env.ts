declare const __BRAINIAC_SERVER_URL__: string;

const serverUrl = __BRAINIAC_SERVER_URL__ || (import.meta.env.DEV ? "http://localhost:7000" : "");

export function getServerUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  if (!serverUrl) {
    throw new Error("VITE_PUBLIC_SERVER_URL is required in production builds");
  }

  return serverUrl;
}

/** Route RPC through the web app origin so production can proxy to the API. */
export function getRpcBaseUrl(): string {
  return getServerUrl();
}

/** Route auth through the web app origin so session cookies stay first-party. */
export function getAuthBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return getServerUrl();
}
