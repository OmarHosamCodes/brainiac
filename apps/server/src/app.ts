import { createContext } from "@brainiac/api/context";
import { auth } from "@brainiac/auth";
import { env } from "@brainiac/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { handleAppRouterRequest } from "./lib/handlers";

export function createApp() {
  const app = new Hono();

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

export default app;
