import { useEffect, type ReactNode } from "react";

import { setAgencyLiveViewerUserId } from "@/features/shared/live/agency-live-connection";
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

  useEffect(() => {
    setAgencyLiveViewerUserId(resolved.user?.id ?? null);
    return () => {
      setAgencyLiveViewerUserId(null);
    };
  }, [resolved.user?.id]);

  return <AuthSessionContext.Provider value={resolved}>{children}</AuthSessionContext.Provider>;
}
