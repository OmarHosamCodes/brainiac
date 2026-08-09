/**
 * Server-only API origin for Start loaders / server functions.
 * Hits Hono directly (not the web proxy) to avoid recursive SSR fetches.
 */
export function resolveSsrApiOrigin(): string {
  // oxlint-disable-next-line node/no-process-env -- Start server runtime only
  const internal = process.env.INTERNAL_API_URL?.replace(/\/$/, "");
  if (internal) return internal;

  // oxlint-disable-next-line node/no-process-env -- Start server runtime only
  const publicUrl = process.env.VITE_PUBLIC_SERVER_URL?.replace(/\/$/, "");
  if (publicUrl) return publicUrl;

  return "http://127.0.0.1:7000";
}
