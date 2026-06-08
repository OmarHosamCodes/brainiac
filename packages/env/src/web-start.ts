import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_PUBLIC_SERVER_URL: z.url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: true,
});
