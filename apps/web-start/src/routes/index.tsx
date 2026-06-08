import { createFileRoute, redirect } from "@tanstack/react-router";

import { getAuthSessionForRoute } from "@/lib/auth-guard";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const session = await getAuthSessionForRoute();
    throw redirect({ to: session ? "/dashboard" : "/login" });
  },
});
