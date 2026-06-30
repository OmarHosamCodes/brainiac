import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

import { getAuthBaseUrl } from "@/lib/env";

const SESSION_REQUEST_TIMEOUT_MS = 6_000;

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [polarClient()],
  fetchOptions: {
    timeout: SESSION_REQUEST_TIMEOUT_MS,
    credentials: "include",
  },
});

let resolveReady: (() => void) | undefined;
const sessionReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

let readySettled = false;

export function whenAuthSessionReady(): Promise<void> {
  return sessionReady;
}

export function markAuthSessionReady(): void {
  if (readySettled) {
    return;
  }
  readySettled = true;
  resolveReady?.();
}

setTimeout(() => markAuthSessionReady(), SESSION_REQUEST_TIMEOUT_MS);
