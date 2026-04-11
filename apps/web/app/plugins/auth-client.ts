import { polarClient } from "@polar-sh/better-auth";
import { createAuthClient } from "better-auth/vue";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  const authClient = createAuthClient({
    baseURL: config.public.serverUrl,
    plugins: [polarClient()],
  });

  return {
    provide: {
      authClient: authClient,
    },
  };
});
