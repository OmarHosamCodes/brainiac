import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const outputPath = resolve(webRoot, ".output/server/index.mjs");

const serverSource = String.raw`import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const port = Number(process.env.PORT || 7001);
const host = process.env.HOST || "0.0.0.0";
const distDir = resolve(process.cwd(), "dist");
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

async function resolveAsset(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const normalizedPath = normalize(pathname).replace(/^([/\\])+/, "");
  const requestedPath = resolve(distDir, normalizedPath || "index.html");

  if (!requestedPath.startsWith(distDir)) {
    return null;
  }

  try {
    const requestedStat = await stat(requestedPath);
    if (requestedStat.isFile()) {
      return requestedPath;
    }
  } catch {
    // Fall back to the SPA entrypoint below.
  }

  return join(distDir, "index.html");
}

const server = createServer(async (request, response) => {
  if (!request.url || request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    response.writeHead(405);
    response.end("Method Not Allowed");
    return;
  }

  const assetPath = await resolveAsset(request.url);
  if (!assetPath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const extension = extname(assetPath);
  response.setHeader("Content-Type", contentTypes.get(extension) || "application/octet-stream");
  createReadStream(assetPath)
    .on("error", () => {
      response.writeHead(404);
      response.end("Not Found");
    })
    .pipe(response);
});

server.listen(port, host, () => {
  console.log("Web server listening on http://" + host + ":" + port);
});
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${serverSource}\n`);
