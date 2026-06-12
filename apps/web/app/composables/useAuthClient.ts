import { computed, type Ref } from "vue";

type AuthSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
} & Record<string, unknown>;

type AuthSessionData = {
  user: AuthSessionUser;
  session: Record<string, unknown>;
} | null;

type AuthSessionState = {
  data: AuthSessionData;
  isPending: boolean;
  error: Error | null;
};

export function useAuthClient() {
  return useNuxtApp().$authClient;
}

/**
 * Returns Better Auth's client-side session state. SSR never resolves an
 * authenticated user; protected routes are rendered client-side and guarded by
 * client route middleware.
 */
export function useAuthSession(): Ref<AuthSessionState> {
  if (import.meta.server) {
    return computed<AuthSessionState>(() => ({
      data: null,
      isPending: false,
      error: null,
    })) as unknown as Ref<AuthSessionState>;
  }

  const liveSession = useAuthClient().useSession() as unknown as Ref<{
    data: AuthSessionData;
    isPending: boolean;
    error: Error | null;
  }>;

  return computed<AuthSessionState>(() => ({
    data: (liveSession.value?.data ?? null) as AuthSessionData,
    isPending: Boolean(liveSession.value?.isPending),
    error: liveSession.value?.error ?? null,
  })) as unknown as Ref<AuthSessionState>;
}

/**
 * Resolves once the client session has been determined. Route middleware should
 * `await` this rather than calling `authClient.getSession()` per navigation.
 */
export function whenAuthSessionReady(): Promise<void> {
  const ready = useNuxtApp().$whenSessionReady as (() => Promise<void>) | undefined;

  return ready ? ready() : Promise.resolve();
}

// Internal helper kept for tests that previously stubbed `useAuthSession`.
export type { AuthSessionData, AuthSessionState };
