import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";

import "@brainiac/env/vite";

import { marketingPrerenderShell } from "./vite-marketing-prerender";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const serverUrl =
    process.env.VITE_PUBLIC_SERVER_URL ??
    process.env.NUXT_PUBLIC_SERVER_URL ??
    env.VITE_PUBLIC_SERVER_URL ??
    env.NUXT_PUBLIC_SERVER_URL;

  return {
    define: {
      __BRAINIAC_SERVER_URL__: JSON.stringify(serverUrl ?? ""),
    },
    plugins: [react(), tailwindcss(), marketingPrerenderShell()],
    build: {
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
