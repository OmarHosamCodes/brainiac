import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";

import "@orch/env/vite";

import { marketingPrerenderShell } from "./vite-marketing-prerender";

function resolveAppBuildId(): string {
  return (
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.SOURCE_COMMIT ||
    process.env.VITE_APP_BUILD_ID ||
    `build-${Date.now()}`
  );
}

function appVersionPlugin(buildId: string): Plugin {
  return {
    name: "orch-app-version",
    async writeBundle(outputOptions) {
      const outDir = outputOptions.dir;
      if (!outDir) return;
      await mkdir(outDir, { recursive: true });
      await writeFile(
        path.join(outDir, "version.json"),
        `${JSON.stringify({ buildId }, null, 2)}\n`,
      );
    },
  };
}

function hasSentryUploadCredentials(env: Record<string, string>): boolean {
  return Boolean(
    (process.env.SENTRY_AUTH_TOKEN || env.SENTRY_AUTH_TOKEN) &&
    (process.env.SENTRY_ORG || env.SENTRY_ORG) &&
    (process.env.SENTRY_PROJECT || env.SENTRY_PROJECT),
  );
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const serverUrl =
    process.env.VITE_PUBLIC_SERVER_URL ??
    process.env.NUXT_PUBLIC_SERVER_URL ??
    env.VITE_PUBLIC_SERVER_URL ??
    env.NUXT_PUBLIC_SERVER_URL;
  const sentryDsn = process.env.VITE_PUBLIC_SENTRY_DSN ?? env.VITE_PUBLIC_SENTRY_DSN ?? "";
  const appBuildId = resolveAppBuildId();
  const shouldUploadSourceMaps = hasSentryUploadCredentials(env);

  return {
    define: {
      __BRAINIAC_SERVER_URL__: JSON.stringify(serverUrl ?? ""),
      __APP_BUILD_ID__: JSON.stringify(appBuildId),
      __SENTRY_DSN__: JSON.stringify(sentryDsn),
    },
    plugins: [
      react(),
      tailwindcss(),
      marketingPrerenderShell(),
      appVersionPlugin(appBuildId),
      ...(shouldUploadSourceMaps
        ? [
            sentryVitePlugin({
              org: process.env.SENTRY_ORG || env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT || env.SENTRY_PROJECT,
              authToken: process.env.SENTRY_AUTH_TOKEN || env.SENTRY_AUTH_TOKEN,
              release: {
                name: appBuildId,
              },
              sourcemaps: {
                filesToDeleteAfterUpload: ["./dist/**/*.map"],
              },
            }),
          ]
        : []),
    ],
    build: {
      sourcemap: shouldUploadSourceMaps ? "hidden" : false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("@xyflow/react")) return "xyflow";
            if (id.includes("motion/react") || id.includes("framer-motion")) return "motion";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("react-dom") || id.includes("react-router")) return "react-vendor";
            if (id.includes("lucide-react")) return "lucide";
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 7001,
      strictPort: true,
      proxy: {
        "/api/auth": {
          target: "http://localhost:7000",
          changeOrigin: true,
        },
        "/rpc": {
          target: "http://localhost:7000",
          changeOrigin: true,
          ws: true,
        },
        "/uploads": {
          target: "http://localhost:7000",
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 7001,
      strictPort: true,
    },
    optimizeDeps: {
      include: [
        "better-auth/react",
        "@orpc/client",
        "@orpc/client/fetch",
        "@orpc/tanstack-query",
        "@tanstack/react-query",
        "zod",
      ],
    },
  };
});
