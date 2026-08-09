import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const port = Number(process.env.PORT || 7001);
const host = process.env.HOST || "0.0.0.0";
const clientDir = resolve(process.cwd(), "dist/client");
const serverEntry = resolve(process.cwd(), "dist/server/server.js");
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
  [".mjs", "text/javascript; charset=utf-8"],
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
    pathname === "/rpc" ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/billing/")
  );
}

function shouldProxyWebSocket(pathname) {
  return pathname === "/rpc/ws";
}

function proxyWebSocketUpgrade(request, socket, head) {
  const requestUrl = new URL(request.url, "http://localhost");
  if (!shouldProxyWebSocket(requestUrl.pathname)) {
    socket.destroy();
    return;
  }

  const target = new URL(apiOrigin);
  const requestFn = target.protocol === "https:" ? httpsRequest : httpRequest;
  const proxyRequest = requestFn({
    hostname: target.hostname,
    port: target.port || (target.protocol === "https:" ? 443 : 80),
    path: requestUrl.pathname + requestUrl.search,
    method: request.method,
    headers: {
      ...request.headers,
      host: target.host,
    },
  });

  proxyRequest.on("upgrade", (response, upstream, upstreamHead) => {
    const headerLines = [];
    for (let index = 0; index < response.rawHeaders.length; index += 2) {
      headerLines.push(response.rawHeaders[index] + ": " + response.rawHeaders[index + 1]);
    }

    socket.write(
      "HTTP/1.1 " +
        response.statusCode +
        " " +
        response.statusMessage +
        "\r\n" +
        headerLines.join("\r\n") +
        "\r\n\r\n",
    );

    if (head?.length) {
      upstream.write(head);
    }
    if (upstreamHead?.length) {
      upstream.write(upstreamHead);
    }

    upstream.pipe(socket);
    socket.pipe(upstream);

    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
  });

  proxyRequest.on("response", (response) => {
    const headerLines = [];
    for (let index = 0; index < response.rawHeaders.length; index += 2) {
      headerLines.push(response.rawHeaders[index] + ": " + response.rawHeaders[index + 1]);
    }

    socket.write(
      "HTTP/1.1 " +
        response.statusCode +
        " " +
        response.statusMessage +
        "\r\n" +
        headerLines.join("\r\n") +
        "\r\n\r\n",
    );
    response.pipe(socket);
  });

  proxyRequest.on("error", (error) => {
    console.error("WebSocket proxy error:", error);
    socket.destroy();
  });

  proxyRequest.end();
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
    headers.set("x-forwarded-proto", request.headers["x-forwarded-proto"]?.toString() || "https");
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

  const payload = Buffer.from(await upstream.arrayBuffer());
  const responseHeaders = [];
  upstream.headers.forEach((value, key) => {
    const headerName = key.toLowerCase();
    if (headerName === "set-cookie" || headerName === "content-length") {
      return;
    }
    responseHeaders.push([key, value]);
  });

  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.push(["Set-Cookie", cookie]);
  }

  responseHeaders.push(["Content-Length", String(payload.byteLength)]);

  response.writeHead(upstream.status, responseHeaders);
  response.end(payload);
}

async function resolveClientAsset(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const normalizedPath = normalize(pathname).replace(/^([/\\\\])+/, "");
  if (!normalizedPath || !normalizedPath.includes(".")) {
    return null;
  }

  const requestedPath = resolve(clientDir, normalizedPath);
  if (!requestedPath.startsWith(clientDir)) {
    return null;
  }

  try {
    const requestedStat = await stat(requestedPath);
    if (requestedStat.isFile()) {
      return requestedPath;
    }
  } catch {
    return null;
  }

  return null;
}

function cacheControlForAsset(assetPath) {
  const relative = assetPath
    .slice(clientDir.length)
    .replace(/^[/\\\\]+/, "")
    .split(/[/\\\\]/)
    .join("/");
  if (relative.startsWith("assets/")) {
    return "public, max-age=31536000, immutable";
  }
  return "no-cache";
}

async function writeStartResponse(request, response, startHandler) {
  const requestUrl = new URL(request.url, "http://" + (request.headers.host || "localhost"));
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (!value || hopByHopHeaders.has(key.toLowerCase())) continue;
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
      continue;
    }
    headers.set(key, value);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await readRequestBody(request);

  const webRequest = new Request(requestUrl, {
    method: request.method,
    headers,
    body,
    duplex: body ? "half" : undefined,
  });

  const webResponse = await startHandler.fetch(webRequest);
  const payload = Buffer.from(await webResponse.arrayBuffer());
  const responseHeaders = [];
  webResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-length") return;
    responseHeaders.push([key, value]);
  });
  responseHeaders.push(["Content-Length", String(payload.byteLength)]);
  response.writeHead(webResponse.status, responseHeaders);
  response.end(payload);
}

const startModule = await import(pathToFileURL(serverEntry).href);
const startHandler = startModule.default;

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

  const assetPath = await resolveClientAsset(request.url);
  if (assetPath && (request.method === "GET" || request.method === "HEAD")) {
    const extension = extname(assetPath);
    response.setHeader("Content-Type", contentTypes.get(extension) || "application/octet-stream");
    response.setHeader("Cache-Control", cacheControlForAsset(assetPath));
    createReadStream(assetPath)
      .on("error", () => {
        response.writeHead(404);
        response.end("Not Found");
      })
      .pipe(response);
    return;
  }

  try {
    await writeStartResponse(request, response, startHandler);
  } catch (error) {
    console.error("Start handler error:", error);
    response.writeHead(500);
    response.end("Internal Server Error");
  }
});

server.on("upgrade", (request, socket, head) => {
  proxyWebSocketUpgrade(request, socket, head);
});

server.listen(port, host, () => {
  console.log("Web server listening on http://" + host + ":" + port);
  console.log("TanStack Start SSR + proxying API routes to " + apiOrigin);
});
