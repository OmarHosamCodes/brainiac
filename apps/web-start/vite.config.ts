import "@brainiac/env/web-start";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const srcPath = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  server: {
    port: 7002,
  },
  resolve: {
    alias: {
      "@": srcPath,
      "~": srcPath,
    },
  },
  plugins: [tanstackStart(), tailwindcss(), react()],
});
