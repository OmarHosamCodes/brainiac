import { createFileRoute, redirect } from "@tanstack/react-router";

import { LoginPage } from "@/features/auth/login-page";
import { AuthProvider } from "@/providers/auth-provider";
import { validateLooseSearch } from "@/lib/router-search";
import { fetchBootSession } from "@/lib/session-boot";

export const Route = createFileRoute("/login")({
  validateSearch: validateLooseSearch,
  loader: async ({ location }) => {
    const session = await fetchBootSession();
    if (session) {
      const params = new URLSearchParams(location.searchStr);
      const redirectTo = params.get("redirect");
      const safe =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/canvas";
      throw redirect({ href: safe });
    }
    return { session };
  },
  component: LoginRoute,
  head: () => ({
    meta: [{ title: "Sign in — Orch" }],
  }),
});

function LoginRoute() {
  return (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  );
}
