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
const apiOrigin = (
  process.env.VITE_PUBLIC_SERVER_URL ??
  (process.env.RAILWAY_SERVICE_SERVER_URL
    ? "https://" + process.env.RAILWAY_SERVICE_SERVER_URL
    : "http://localhost:7000")
).replace(/\/$/, "");

const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

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

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function proxyAuthRequest(request, response) {
  const requestUrl = new URL(request.url, "http://localhost");
  const targetUrl = apiOrigin + requestUrl.pathname + requestUrl.search;
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (!value || hopByHopHeaders.has(key)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        headers.append(key, entry);
      }
      continue;
    }

    headers.set(key, value);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await readRequestBody(request);

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = {};
  upstream.headers.forEach((value, key) => {
    if (hopByHopHeaders.has(key)) {
      return;
    }
    responseHeaders[key] = value;
  });

  response.writeHead(upstream.status, responseHeaders);
  const payload = Buffer.from(await upstream.arrayBuffer());
  response.end(payload);
}

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
  if (!request.url) {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname.startsWith("/api/auth")) {
    try {
      await proxyAuthRequest(request, response);
    } catch (error) {
      console.error("Auth proxy error:", error);
      response.writeHead(502);
      response.end("Bad Gateway");
    }
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
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
  console.log("Proxying /api/auth to " + apiOrigin);
});
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${serverSource}\n`);
