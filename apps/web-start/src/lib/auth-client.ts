import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/react";

import { serverUrl } from "@/lib/server-url";

const SESSION_REQUEST_TIMEOUT_MS = 6_000;

export const authClient = createAuthClient({
  baseURL: serverUrl,
  plugins: [polarClient()],
  fetchOptions: {
    timeout: SESSION_REQUEST_TIMEOUT_MS,
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
