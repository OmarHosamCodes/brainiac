import { useMemo } from "react";
import { Link } from "react-router-dom";

import { AppShellPortal } from "@/components/app-shell-portal";
import {
  useAppShellStore,
  useHasPageCrumbContent,
  useHasSubtitleContent,
} from "@/stores/app-shell";
import { findActiveNavItem } from "@/lib/utils/app-navigation";
import {
  shellBreadcrumbCurrentClass,
  shellBreadcrumbMutedClass,
  shellBreadcrumbSeparatorClass,
  shellBreadcrumbTrailClass,
  shellContentInClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

export const APP_SHELL_PAGE_CRUMB_SLOT_ID = "app-shell-page-crumb";
export const APP_SHELL_SUBTITLE_SLOT_ID = "app-shell-subtitle";

type AppShellBreadcrumbsProps = {
  pathname: string;
};

export function AppShellBreadcrumbs({ pathname }: AppShellBreadcrumbsProps) {
  const pageSubtitle = useAppShellStore((s) => s.pageSubtitle);
  const hasPageCrumbContent = useHasPageCrumbContent();
  const hasSubtitleContent = useHasSubtitleContent();

  const activeNavigationItem = useMemo(() => findActiveNavItem(pathname), [pathname]);
  const pageLabel = activeNavigationItem?.label ?? "Workspace";
  const subtitleLabel = pageSubtitle?.trim() || null;
  const showSubtitle = hasSubtitleContent || Boolean(subtitleLabel);

  return (
    <nav
      key={`${pathname}-${subtitleLabel ?? ""}`}
      className={cn("flex min-w-0 flex-1 md:flex", shellContentInClass)}
      aria-label="Breadcrumb"
    >
      <ol className={cn(shellBreadcrumbTrailClass, "w-full min-w-0")}>
        <li className="flex min-w-0 items-center gap-2">
          {hasPageCrumbContent ? (
            <div id={APP_SHELL_PAGE_CRUMB_SLOT_ID} className="min-w-0" />
          ) : activeNavigationItem ? (
            <Link
              to={activeNavigationItem.to}
              className={cn(
                "truncate whitespace-nowrap transition-colors hover:text-highlighted",
                showSubtitle ? shellBreadcrumbMutedClass : shellBreadcrumbCurrentClass,
              )}
            >
              {pageLabel}
            </Link>
          ) : (
            <span
              className={cn(
                "truncate whitespace-nowrap",
                showSubtitle ? shellBreadcrumbMutedClass : shellBreadcrumbCurrentClass,
              )}
            >
              {pageLabel}
            </span>
          )}
        </li>

        {showSubtitle ? (
          <li className="flex min-w-0 flex-1 items-center gap-2">
            <span className={shellBreadcrumbSeparatorClass} aria-hidden="true">
              /
            </span>
            {hasSubtitleContent ? (
              <div id={APP_SHELL_SUBTITLE_SLOT_ID} className="min-w-0 flex-1" />
            ) : (
              <span className={cn(shellBreadcrumbCurrentClass, "truncate whitespace-nowrap")}>
                {subtitleLabel}
              </span>
            )}
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

export function AppShellTopbarPageCrumb({ children }: { children: React.ReactNode }) {
  return <AppShellPortal targetId={APP_SHELL_PAGE_CRUMB_SLOT_ID}>{children}</AppShellPortal>;
}

export function AppShellTopbarSubtitle({ children }: { children: React.ReactNode }) {
  return <AppShellPortal targetId={APP_SHELL_SUBTITLE_SLOT_ID}>{children}</AppShellPortal>;
}
