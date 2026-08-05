import { ArrowRight, Bell, Loader2, X } from "lucide-react";

import type { FeaturedRailNotificationViewModel } from "@/features/notifications/hooks/use-featured-rail-notification";
import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";

type FeaturedRailNotificationViewProps = {
  view: FeaturedRailNotificationViewModel;
};

export function FeaturedRailNotificationView({ view }: FeaturedRailNotificationViewProps) {
  if (!view.teamId) return null;

  if (view.listPending) {
    return view.expanded ? (
      <div className="mx-1 rounded-xl border border-sidebar-border bg-sidebar p-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="mt-3 h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-full" />
        <Skeleton className="mt-3 h-8 w-full rounded-full" />
      </div>
    ) : (
      <Skeleton className="mx-auto size-8 rounded-full" />
    );
  }

  if (view.count === 0 || !view.featured) return null;

  if (!view.expanded) {
    return (
      <button
        type="button"
        className={cn(
          "app-shell__rail-link text-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          shellFocusRingClass,
        )}
        aria-label={`${view.count} notification${view.count === 1 ? "" : "s"} needing action`}
        title={`${view.count} needing action`}
        onClick={view.onOpenInbox}
      >
        <span className="relative shrink-0" aria-hidden>
          <Bell className="size-4" />
          <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold leading-3.5 text-primary-foreground">
            {view.badgeLabel}
          </span>
        </span>
        <span className="rail-label sr-only">Notifications</span>
      </button>
    );
  }

  return (
    <section
      aria-label="Needs action"
      className={cn(
        "mx-1 rounded-xl border border-sidebar-border bg-sidebar p-3 text-sidebar-foreground",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200",
      )}
    >
      <div className="flex items-start gap-2">
        <AgencyMemberAvatar
          name={view.actorName}
          avatarUrl={view.actorAvatar}
          size="sm"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              Needs action
              {view.relativeTime ? (
                <span className="text-muted-foreground/80"> · {view.relativeTime}</span>
              ) : null}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "disabled:pointer-events-none disabled:opacity-50",
            shellFocusRingClass,
          )}
          aria-label="Dismiss notification"
          disabled={view.actionPending}
          onClick={view.onDismiss}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      <h2 className="mt-2.5 text-balance text-sm font-semibold leading-snug tracking-tight text-sidebar-foreground">
        {view.title}
      </h2>
      <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{view.body}</p>

      <div className="mt-3 flex flex-col gap-1.5">
        <Button
          type="button"
          size="sm"
          className="h-8 w-full rounded-full bg-sidebar-foreground text-xs font-semibold text-sidebar hover:bg-sidebar-foreground/90"
          disabled={view.actionPending}
          onClick={view.onPrimaryCta}
        >
          {view.actionPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <>
              {view.ctaLabel}
              <ArrowRight className="size-3.5" aria-hidden />
            </>
          )}
        </Button>
        {view.moreLabel ? (
          <button
            type="button"
            className={cn(
              "w-full py-1 text-center text-[11px] font-medium text-muted-foreground transition-colors",
              "hover:text-sidebar-foreground",
              shellFocusRingClass,
            )}
            onClick={view.onOpenInbox}
          >
            {view.moreLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
