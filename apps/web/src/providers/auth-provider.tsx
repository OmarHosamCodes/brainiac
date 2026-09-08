import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";

import { setAgencyLiveViewerUserId } from "@/features/shared/live/agency-live-connection";
import {
  resetAuthenticatedClientState,
  shouldResetAuthenticatedClientState,
} from "@/lib/authenticated-client-reset";
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
  const router = useRouter();
  const previousUserIdRef = useRef<string | null>(null);
  const resolved = resolveAuthSession(session, initialSession?.user ?? null);

  useEffect(() => {
    if (resolved.user || !session.isPending) {
      markAuthSessionReady();
    }
  }, [resolved.user, session.isPending]);

  useEffect(() => {
    const nextUserId = resolved.user?.id ?? null;
    if (
      shouldResetAuthenticatedClientState(previousUserIdRef.current, nextUserId, resolved.isPending)
    ) {
      resetAuthenticatedClientState({
        queryClient: router.options.context.queryClient,
        router,
      });
    }
    if (!resolved.isPending) {
      previousUserIdRef.current = nextUserId;
    }
  }, [resolved.isPending, resolved.user?.id, router]);

  // Publish the next id directly. Null only when the session is gone or this
  // provider unmounts — cleanup-null on every identity change would bump
  // generation twice and drop events until reconcile.
  useEffect(() => {
    setAgencyLiveViewerUserId(resolved.user?.id ?? null);
  }, [resolved.user?.id]);

  useEffect(() => {
    return () => {
      setAgencyLiveViewerUserId(null);
    };
  }, []);

  return <AuthSessionContext.Provider value={resolved}>{children}</AuthSessionContext.Provider>;
}
