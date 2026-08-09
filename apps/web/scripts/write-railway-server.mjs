import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const sourcePath = resolve(__dirname, "railway-ssr-server.mjs");
const outputPath = resolve(webRoot, ".output/server/index.mjs");

await mkdir(dirname(outputPath), { recursive: true });
await copyFile(sourcePath, outputPath);
console.log(`Wrote ${outputPath}`);
