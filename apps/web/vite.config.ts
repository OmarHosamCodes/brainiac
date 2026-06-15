import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

import "@brainiac/env/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 7001,
    strictPort: true,
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
});
