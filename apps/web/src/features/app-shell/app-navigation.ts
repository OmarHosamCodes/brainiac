/** Single source of truth for authenticated app section navigation. */

export type AppShellMode = "spatial" | "execution";

export type AppNavItem = {
  label: string;
  to: string;
  icon: string;
  mode: AppShellMode;
  matches: (path: string) => boolean;
};

export const APP_NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: "i-lucide-layout-dashboard",
    mode: "spatial",
    matches: (path: string) => path.startsWith("/dashboard") || path.startsWith("/node/"),
  },
  {
    label: "Agency",
    to: "/agency",
    icon: "i-lucide-briefcase",
    mode: "execution",
    matches: (path: string) => path.startsWith("/agency"),
  },
] as const satisfies readonly AppNavItem[];

const SPATIAL_PREFIXES = ["/dashboard", "/node/"] as const;

export function resolveShellMode(path: string): AppShellMode {
  if (SPATIAL_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return "spatial";
  }
  return "execution";
}

export function findActiveNavItem(path: string): AppNavItem | undefined {
  return APP_NAV_ITEMS.find((item) => item.matches(path));
}
