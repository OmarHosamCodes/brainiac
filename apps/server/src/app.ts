import { createContext } from "@brainiac/api/context";
import { auth } from "@brainiac/auth";
import { env } from "@brainiac/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { handleAppRouterRequest } from "./lib/handlers";

function getRpcDebugResponse(error: unknown, path: string) {
  const message =
    error instanceof Error && error.message ? error.message : "Unhandled server error";
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
  const app = new Hono();

  app.onError((error, context) => {
    console.error(error);

    if (env.NODE_ENV === "development" && context.req.path.startsWith("/rpc/")) {
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

  app.on(["GET", "POST"], "/api/auth/*", (context) => auth.handler(context.req.raw));

  app.get("/billing/success", (context) => {
    const url = new URL("/billing/success", env.CORS_ORIGIN);
    url.search = new URL(context.req.url).search;
    return context.redirect(url.toString(), 302);
  });

  app.use("/*", async (context, next) => {
    const requestContext = await createContext({ context });
    const response = await handleAppRouterRequest(context.req.raw, requestContext);

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

export default {
  port: 7000,
  fetch: app.fetch,
};
