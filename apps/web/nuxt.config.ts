/**
 * Nuxt Configuration
 *
 * Development ports:
 * - Frontend: 7001 (this file)
 * - Backend: 7000 (NUXT_PUBLIC_SERVER_URL in .env)
 *
 * These ports are managed by a Traefik TCP proxy for development.
 * The actual dev servers run on 3000 (backend) and 3001 (frontend)
 * and are proxied through Traefik on 7000/7001.
 *
 * If you want to run without the proxy, use:
 *   bun run dev:portless  (routes available at localhost:3000/3001)
 */

import "@brainiac/env/web";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "latest",
  devtools: { enabled: true },
  experimental: {
    payloadExtraction: "client",
  },
  modules: ["@pinia/nuxt", "@nuxt/ui"],
  css: ["~/assets/css/main.css"],
  devServer: {
    port: 7001, // Routed through Traefik proxy
  },
  debug: true,
  vite: {
    optimizeDeps: {
      include: [
        "@tanstack/vue-query-devtools",
        "better-auth/vue",
        "@orpc/client",
        "@orpc/client/fetch",
        "@orpc/tanstack-query",
        "@tanstack/vue-query",
        "zod",
      ],
    },
  },
  runtimeConfig: {
    public: {
      serverUrl: process.env.NUXT_PUBLIC_SERVER_URL,
    },
  },
});
