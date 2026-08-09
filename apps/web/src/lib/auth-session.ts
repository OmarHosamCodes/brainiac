import { createContext, useContext } from "react";

import { authClient } from "@/lib/auth-client";
import type { BootSessionUser } from "@/lib/session-boot";

export type AuthSessionUser = BootSessionUser;

export type ResolvedAuthSession = {
  user: AuthSessionUser | null;
  isPending: boolean;
};

export function resolveAuthSession(
  clientUser: AuthSessionUser | null | undefined,
  clientPending: boolean,
  initialUser: AuthSessionUser | null | undefined,
): ResolvedAuthSession {
  const user = clientUser ?? initialUser ?? null;
  return { user, isPending: !user && clientPending };
}

export const AuthSessionContext = createContext<ResolvedAuthSession | null>(null);

export function useAuthSession(): ResolvedAuthSession {
  const ctx = useContext(AuthSessionContext);
  const session = authClient.useSession();
  if (ctx) return ctx;
  return resolveAuthSession(session.data?.user, session.isPending, null);
}
