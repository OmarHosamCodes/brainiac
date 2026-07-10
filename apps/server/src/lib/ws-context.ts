import { auth } from "@orch/auth";

import type { Context } from "@orch/api/context";

export async function createWebSocketContext(request: Request): Promise<Context> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return { session };
}
