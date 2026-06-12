import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/vue";
import { watch } from "vue";

const SESSION_REQUEST_TIMEOUT_MS = 6_000;

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const authClient = createAuthClient({
    baseURL: config.public.serverUrl,
    plugins: [polarClient()],
    fetchOptions: {
      // Cap any single auth request so a flaky network surfaces as an error
      // instead of an indefinite middleware/UI hang.
      timeout: SESSION_REQUEST_TIMEOUT_MS,
    },
  });

  // Single-flight promise that resolves the first time the client session has
  // been determined. Route middleware awaits this once instead of re-firing
  // `getSession()` on every navigation.
  let resolveReady: (() => void) | undefined;
  const sessionReady = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  if (import.meta.server) {
    resolveReady?.();
  } else {
    const session = authClient.useSession();
    const stop = watch(
      () => session.value?.isPending,
      (isPending) => {
        if (isPending === false) {
          resolveReady?.();
          stop();
        }
      },
      { immediate: true },
    );

    // Hard ceiling: never let middleware wait forever if Better Auth's
    // internal subscription stalls.
    setTimeout(() => resolveReady?.(), SESSION_REQUEST_TIMEOUT_MS);
  }

  return {
    provide: {
      authClient,
      whenSessionReady: () => sessionReady,
    },
  };
});
