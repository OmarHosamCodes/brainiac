import { redirect } from "@tanstack/react-router";

import { getSession } from "@/lib/auth-client";
import { type AuthSessionData, requireAuth } from "@/lib/auth-session";

export async function getAuthSessionForRoute(): Promise<AuthSessionData> {
  if (typeof window === "undefined") {
    return requireAuth();
  }

  try {
    const result = await getSession();
    return (result.data ?? null) as AuthSessionData;
  } catch {
    return null;
  }
}

export async function requireAuthenticatedRoute(): Promise<{ session: AuthSessionData }> {
  const session = await getAuthSessionForRoute();

  if (!session) {
    throw redirect({ to: "/login" });
  }

  return { session };
}
