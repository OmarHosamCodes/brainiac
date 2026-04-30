/**
 * SSR session prefetch.
 *
 * Runs once per server-rendered request: forwards the inbound `cookie` header
 * to Better Auth's `/api/auth/get-session` and seeds the result into a
 * `useState` payload. The client reads that payload during hydration so the
 * first paint is already authenticated, and the auth middleware can resolve
 * `whenSessionReady` immediately without an extra round-trip.
 *
 * Failures are swallowed: SSR session prefetch is a perf optimisation, not a
 * correctness boundary. The client's Better Auth subscription is still the
 * authoritative source of truth.
 */
export default defineNuxtPlugin({
  name: "auth-session-ssr",
  enforce: "pre",
  async setup() {
    if (!import.meta.server) {
      return;
    }

    const initial = useState<unknown>("auth-session-initial", () => undefined);

    if (initial.value !== undefined) {
      return;
    }

    const headers = useRequestHeaders(["cookie"]);
    const cookie = headers.cookie;

    if (!cookie) {
      initial.value = null;
      return;
    }

    const config = useRuntimeConfig();
    const serverUrl = config.public.serverUrl;

    if (!serverUrl) {
      initial.value = null;
      return;
    }

    try {
      const session = await $fetch<unknown>("/api/auth/get-session", {
        baseURL: serverUrl,
        headers: { cookie },
        // Don't let a slow auth backend block SSR longer than necessary.
        timeout: 4_000,
        retry: 0,
      });

      initial.value = session ?? null;
    } catch {
      // Network error, timeout, or 401 - leave state undefined so the client
      // falls back to its own `getSession` call.
      initial.value = null;
    }
  },
});
