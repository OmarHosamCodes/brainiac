import { createContext, useContext } from "react";

import { authClient } from "@/lib/auth-client";
import type { BootSessionUser } from "@/lib/session-boot";

export type AuthSessionUser = BootSessionUser;

export type ClientAuthSessionState = {
  data: { user?: AuthSessionUser | null } | null | undefined;
  isPending: boolean;
  error?: unknown;
};

export type ResolvedAuthSession = {
  user: AuthSessionUser | null;
  isPending: boolean;
};

export function resolveAuthSession(
  client: ClientAuthSessionState,
  initialUser: AuthSessionUser | null | undefined,
): ResolvedAuthSession {
  const clientUser = client.data?.user ?? null;
  if (clientUser?.id) {
    return { user: clientUser, isPending: false };
  }

  if (client.isPending) {
    return { user: initialUser ?? null, isPending: !initialUser };
  }

  const signedOut =
    client.error == null &&
    (client.data === null || (client.data !== undefined && !client.data.user));
  if (signedOut) {
    return { user: null, isPending: false };
  }

  return { user: initialUser ?? null, isPending: false };
}

export const AuthSessionContext = createContext<ResolvedAuthSession | null>(null);

export function useAuthSession(): ResolvedAuthSession {
  const ctx = useContext(AuthSessionContext);
  const session = authClient.useSession();
  if (ctx) return ctx;
  return resolveAuthSession(session, null);
}
