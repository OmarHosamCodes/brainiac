import { useEffect, type ReactNode } from "react";

import { authClient, markAuthSessionReady } from "@/lib/auth-client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = authClient.useSession();

  useEffect(() => {
    if (!session.isPending) {
      markAuthSessionReady();
    }
  }, [session.isPending]);

  return children;
}
