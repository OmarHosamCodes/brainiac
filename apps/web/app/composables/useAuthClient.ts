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
 * Returns a unified session ref:
 *
 * - On the server, reads from the `auth-session-initial` payload populated by
 *   the SSR plugin so SSR-rendered components see the authenticated user
 *   without a round-trip.
 * - On the client, reuses Better Auth's reactive session ref but falls back to
 *   the SSR-hydrated value while Better Auth is still resolving its first
 *   request. This eliminates the "isPending" flash on every navigation.
 *
 * Shape matches Better Auth's `useSession()` return value: consumers can keep
 * accessing `.value.data.user`, `.value.isPending`, etc.
 */
export function useAuthSession(): Ref<AuthSessionState> {
  const initial = useState<AuthSessionData | undefined>("auth-session-initial", () => undefined);

  if (import.meta.server) {
    return computed<AuthSessionState>(() => ({
      data: (initial.value ?? null) as AuthSessionData,
      isPending: false,
      error: null,
    })) as unknown as Ref<AuthSessionState>;
  }

  const liveSession = useAuthClient().useSession() as unknown as Ref<{
    data: AuthSessionData;
    isPending: boolean;
    error: Error | null;
  }>;

  return computed<AuthSessionState>(() => {
    const live = liveSession.value;

    // While Better Auth is mid-request on the client, prefer the SSR-hydrated
    // value (if any) so the UI stays authenticated through navigations.
    if (live?.isPending && initial.value !== undefined) {
      return {
        data: (initial.value ?? null) as AuthSessionData,
        isPending: false,
        error: null,
      };
    }

    return {
      data: (live?.data ?? null) as AuthSessionData,
      isPending: Boolean(live?.isPending),
      error: live?.error ?? null,
    };
  }) as unknown as Ref<AuthSessionState>;
}

/**
 * Resolves once the session has been determined (SSR hydration or first
 * client `getSession`). Route middleware should `await` this rather than
 * calling `authClient.getSession()` per navigation.
 */
export function whenAuthSessionReady(): Promise<void> {
  const ready = useNuxtApp().$whenSessionReady as (() => Promise<void>) | undefined;

  return ready ? ready() : Promise.resolve();
}

// Internal helper kept for tests that previously stubbed `useAuthSession`.
export type { AuthSessionData, AuthSessionState };
