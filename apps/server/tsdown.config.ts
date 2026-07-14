import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  dts: false,
  sourcemap: true,
  noExternal: [/@orch\/.*/],
  deps: {
    neverBundle: ["sharp"],
  },
});
