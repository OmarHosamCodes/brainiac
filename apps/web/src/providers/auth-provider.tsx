import { useEffect, type ReactNode } from "react";

import { authClient, markAuthSessionReady } from "@/lib/auth-client";
import { AuthSessionContext, resolveAuthSession } from "@/lib/auth-session";
import type { BootSession } from "@/lib/session-boot";

export function AuthProvider({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: BootSession;
}) {
  const session = authClient.useSession();
  const resolved = resolveAuthSession(
    session.data?.user,
    session.isPending,
    initialSession?.user ?? null,
  );

  useEffect(() => {
    if (resolved.user || !session.isPending) {
      markAuthSessionReady();
    }
  }, [resolved.user, session.isPending]);

  return <AuthSessionContext.Provider value={resolved}>{children}</AuthSessionContext.Provider>;
}
