import type { ReactNode } from "react";

type AppShellPageProps = {
  children: ReactNode;
  /** @deprecated Dock portal slots were removed with the global floating agent. */
  slots?: Array<"dock">;
};

export function AppShellPage({ children }: AppShellPageProps) {
  return children;
}
