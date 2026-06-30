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
  process.env.INTERNAL_API_URL ??
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

function shouldProxy(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/rpc/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/billing/")
  );
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function proxyApiRequest(request, response) {
  const requestUrl = new URL(request.url, "http://localhost");
  const targetUrl = apiOrigin + requestUrl.pathname + requestUrl.search;
  const headers = new Headers();
  const forwardHost = request.headers.host;

  for (const [key, value] of Object.entries(request.headers)) {
    const headerName = key.toLowerCase();
    if (!value || hopByHopHeaders.has(headerName)) {
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

  if (forwardHost) {
    headers.set("host", forwardHost);
    headers.set("x-forwarded-host", forwardHost);
    headers.set(
      "x-forwarded-proto",
      request.headers["x-forwarded-proto"]?.toString() || "https",
    );
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

  const responseHeaders = [];
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      return;
    }
    responseHeaders.push([key, value]);
  });

  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.push(["Set-Cookie", cookie]);
  }

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
  if (shouldProxy(pathname)) {
    try {
      await proxyApiRequest(request, response);
    } catch (error) {
      console.error("API proxy error:", error);
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
  console.log("Proxying API routes to " + apiOrigin);
});
`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${serverSource}\n`);
