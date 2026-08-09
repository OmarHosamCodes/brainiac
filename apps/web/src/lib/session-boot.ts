import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { resolveSsrApiOrigin } from "@/lib/ssr-api-origin";

export type BootSessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export type BootSession = {
  user: BootSessionUser;
} | null;

type SessionApiPayload = {
  user?: BootSessionUser | null;
  session?: { user?: BootSessionUser | null } | null;
};

export const fetchBootSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<BootSession> => {
    const cookie = getRequestHeader("cookie") ?? "";
    const origin = resolveSsrApiOrigin();

    try {
      const response = await fetch(`${origin}/api/auth/get-session`, {
        headers: cookie ? { cookie } : {},
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as SessionApiPayload | null;
      const user = payload?.user ?? payload?.session?.user ?? null;
      if (!user?.id) return null;
      return { user };
    } catch {
      return null;
    }
  },
);
