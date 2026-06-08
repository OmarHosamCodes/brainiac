import { createServerFn } from "@tanstack/react-start";

import { serverUrl } from "@/lib/server-url";

const SESSION_REQUEST_TIMEOUT_MS = 6_000;

type SerializableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | SerializableValue[]
  | { [key: string]: SerializableValue };

export type AuthSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
} & Record<string, SerializableValue>;

export type AuthSessionData = {
  user: AuthSessionUser;
  session: Record<string, SerializableValue>;
} | null;

export const requireAuth = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthSessionData> => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const cookie = request?.headers.get("cookie");
  if (!cookie || !serverUrl) {
    return null;
  }

  try {
    const response = await fetch(`${serverUrl}/api/auth/get-session`, {
      headers: { cookie },
      credentials: "include",
      signal: AbortSignal.timeout(SESSION_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthSessionData;
  } catch {
    return null;
  }
},
);
