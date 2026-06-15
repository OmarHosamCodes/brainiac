import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Frontend environment validation for Vite.
 *
 * Access in app code via `getServerUrl()` in `@/lib/env`.
 */
export const env = createEnv({
  clientPrefix: "VITE_PUBLIC_",
  client: {
    VITE_PUBLIC_SERVER_URL: z
      .url("VITE_PUBLIC_SERVER_URL must be a valid URL pointing to the backend")
      .optional(),
  },
  runtimeEnv: {
    VITE_PUBLIC_SERVER_URL:
      process.env.VITE_PUBLIC_SERVER_URL ?? process.env.NUXT_PUBLIC_SERVER_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: true,
});
