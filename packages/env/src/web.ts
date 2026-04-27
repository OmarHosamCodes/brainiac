import { createEnv } from "@t3-oss/env-nuxt";
import { z } from "zod";

/**
 * Frontend environment validation - validates at build time
 *
 * When you import this in nuxt.config.ts, Nuxt validates these variables exist.
 * For runtime access in components/plugins, use useRuntimeConfig() instead:
 *
 *   const config = useRuntimeConfig()
 *   config.public.serverUrl (NUXT_PUBLIC_SERVER_URL maps to serverUrl)
 *
 * See apps/web/.env.example for details.
 */
export const env = createEnv({
  client: {
    NUXT_PUBLIC_SERVER_URL: z.url(
      "NUXT_PUBLIC_SERVER_URL must be a valid URL pointing to the backend (e.g., http://localhost:7000)",
    ),
  },
  emptyStringAsUndefined: true,
  skipValidation: true,
});
