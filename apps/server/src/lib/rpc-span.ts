import { getActiveSpan } from "@sentry/hono/bun";

const RPC_PREFIX = "/rpc/";

export function rpcProcedureFromRequest(request: Request): string | undefined {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith(RPC_PREFIX)) {
    return undefined;
  }

  const rest = pathname.slice(RPC_PREFIX.length).replace(/\/+$/, "");
  if (!rest || rest === "ws") {
    return undefined;
  }

  return rest.split("/").filter(Boolean).join(".");
}

export function nameActiveRpcSpan(request: Request): void {
  const procedure = rpcProcedureFromRequest(request);
  if (!procedure) {
    return;
  }

  getActiveSpan()?.updateName(`${request.method} /rpc/${procedure}`);
}
