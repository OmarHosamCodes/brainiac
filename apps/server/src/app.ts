/**
 * Backend Application Setup (Hono + oRPC)
 * 
 * This file configures the main Hono server with:
 * - CORS for cross-origin requests from the frontend
 * - Authentication via Better Auth
 * - oRPC endpoint at /api/app (type-safe RPC layer)
 * - Error handling and logging
 * 
 * Entry point: apps/server/src/index.ts
 * Start with: bun run dev (runs on port 7000 via BETTER_AUTH_URL)
 */

import { createContext } from "@brainiac/api/context";
import { auth } from "@brainiac/auth";
import { env } from "@brainiac/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { handleAppRouterRequest } from "./lib/handlers";
import { logStartup } from "./lib/startup";

function getRpcDebugResponse(error: unknown, path: string) {
  /**
   * Format RPC errors with debugging info in development
   * This helps frontend developers understand what went wrong
   */
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unhandled server error";
  const cause =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : error instanceof Error && typeof error.cause === "string"
        ? error.cause
        : undefined;

  return Response.json(
    {
      defined: false,
      code: "INTERNAL_SERVER_ERROR",
      status: 500,
      message,
      data: {
        debug: JSON.stringify(
          {
            procedure: path,
            errorName: error instanceof Error ? error.name : typeof error,
            message,
            cause,
            stack: error instanceof Error ? error.stack : undefined,
          },
          null,
          2,
        ),
      },
    },
    { status: 500 },
  );
}

function createApp() {
  /**
   * Initialize the Hono application
   * 
   * Setup order:
   * 1. Error handler - catches all errors and logs them
   * 2. Logging - logs incoming requests
   * 3. CORS - enables cross-origin requests from frontend
   * 4. Auth routes - /api/auth/* endpoints from Better Auth
   * 5. Billing redirect - /billing/success for payment webhooks
   * 6. RPC handler - all /api/app/* requests go to oRPC router
   * 7. Health check - GET / returns "OK" for monitoring
   */
  const app = new Hono();

  app.onError((error, context) => {
    console.error(error);

    if (
      env.NODE_ENV === "development" &&
      context.req.path.startsWith("/rpc/")
    ) {
      return getRpcDebugResponse(error, context.req.path);
    }

    return context.text("Internal Server Error", 500);
  });

  app.use(logger());
  app.use(
    "/*",
    cors({
      origin: env.CORS_ORIGIN,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    }),
  );

  app.on(["GET", "POST"], "/api/auth/*", (context) =>
    auth.handler(context.req.raw),
  );

  app.get("/billing/success", (context) => {
    const url = new URL("/billing/success", env.CORS_ORIGIN);
    url.search = new URL(context.req.url).search;
    return context.redirect(url.toString(), 302);
  });

  app.use("/*", async (context, next) => {
    const requestContext = await createContext({ context });
    const response = await handleAppRouterRequest(
      context.req.raw,
      requestContext,
    );

    if (response) {
      return response;
    }

    await next();
  });

  app.get("/", (context) => {
    return context.text("OK");
  });

  return app;
}

const app = createApp();

// Log startup information in development
if (env.NODE_ENV === "development") {
  logStartup({
    port: 7000,
    baseUrl: env.BETTER_AUTH_URL,
    corsOrigin: env.CORS_ORIGIN,
  });
}

/**
 * Server export for Bun
 * 
 * Port 7000 is configured for development via Traefik TCP proxy.
 * The actual Bun dev server runs on port 3000 and is proxied through
 * Traefik to 7000 for consistent URLs.
 * 
 * To disable Traefik proxy and run on actual ports (3000/3001), use:
 *   bun run dev:portless
 */
export default {
  port: 7000,  // Proxied via Traefik (actual dev server is on 3000)
  fetch: app.fetch,
};
