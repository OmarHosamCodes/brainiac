import { auth } from "@brainiac/auth";

import type { Context } from "@brainiac/api/context";

export async function createWebSocketContext(request: Request): Promise<Context> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  return { session };
}
