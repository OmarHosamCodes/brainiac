import * as Sentry from "@sentry/react";
import React from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";

declare const __APP_BUILD_ID__: string;
declare const __SENTRY_DSN__: string;

function resolveSentryDsn(): string | undefined {
  const dsn = typeof __SENTRY_DSN__ === "string" ? __SENTRY_DSN__ : "";
  return dsn.length > 0 ? dsn : undefined;
}

function resolveSentryRelease(): string | undefined {
  const release = typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "";
  return release.length > 0 ? release : undefined;
}

const sentryDsn = resolveSentryDsn();

export const isSentryEnabled = Boolean(sentryDsn);

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.PROD ? "production" : "development",
    release: resolveSentryRelease(),
    sendDefaultPii: false,
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/orch\.school-of-marketing\.com/,
      /^https:\/\/web-orch\.up\.railway\.app/,
      /^\//,
    ],
  });
}

export { Sentry };
