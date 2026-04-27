import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server environment validation
 *
 * This validates that all required environment variables are set and valid
 * when the server starts. If validation fails, the application will not start.
 *
 * See .env.example and apps/server/.env.example for details on each variable.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required for database connection"),
    BETTER_AUTH_SECRET: z
      .string()
      .min(
        32,
        "BETTER_AUTH_SECRET must be at least 32 characters (generate with: openssl rand -hex 16)",
      ),
    BETTER_AUTH_URL: z.url(
      "BETTER_AUTH_URL must be a valid URL (e.g., http://localhost:7000)",
    ),
    CORS_ORIGIN: z.url(
      "CORS_ORIGIN must be a valid URL (e.g., http://localhost:7001)",
    ),
    OPENROUTER_API_KEY: z
      .string()
      .min(
        1,
        "OPENROUTER_API_KEY is required. Get one from https://openrouter.ai/keys",
      ),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    POLAR_ACCESS_TOKEN: z
      .string()
      .min(1, "POLAR_ACCESS_TOKEN is required for payment features"),
    POLAR_WEBHOOK_SECRET: z
      .string()
      .min(1, "POLAR_WEBHOOK_SECRET is required for payment features"),
    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_PRODUCT_PRO: z
      .string()
      .min(1, "POLAR_PRODUCT_PRO is required for Pro tier billing"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: true,
});
