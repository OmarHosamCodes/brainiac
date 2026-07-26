import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAppShellStore } from "@/features/app-shell/app-shell-store";
import {
  shellFocusRingClass,
  shellNavLinkActiveClass,
  shellNavLinkClass,
  shellRailIconClass,
  shellRailLinkActiveClass,
  shellRailLinkClass,
} from "@/features/app-shell/app-shell-ui";
import {
  AGENCY_SEGMENTS,
  agencySegmentFromSearch,
  agencySegmentHref,
  agencySegmentTabId,
} from "@/features/shared/agency-segments";
import { LucideIcon } from "@/lib/lucide-icon";
import { cn } from "@/lib/utils";
import { Popover, PopoverAnchor, PopoverContent } from "@/ui/popover";

const OPEN_DELAY_MS = 80;
const CLOSE_DELAY_MS = 140;

type AppShellAgencyNavProps = {
  /** Hover-popover topbar link, or stacked rows for the rail and mobile drawer. */
  variant?: "desktop" | "rail";
  /** Force expanded inline subnav (mobile sheet); ignores rail pin state. */
  expanded?: boolean;
  onNavigate?: () => void;
};

export function AppShellAgencyNav({
  variant = "desktop",
  expanded = false,
  onNavigate,
}: AppShellAgencyNavProps) {
  const location = useLocation();
  const menuId = useId();
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const railPinned = useAppShellStore((s) => s.railPinned);

  const active = location.pathname.startsWith("/agency");
  const currentSegment = active ? agencySegmentFromSearch(location.search) : null;
  const showInlineSubnav = variant === "rail" && (expanded || railPinned);
  const showFlyout = variant === "desktop" || (variant === "rail" && !showInlineSubnav);

  function clearTimers() {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleOpen() {
    clearTimers();
    openTimerRef.current = setTimeout(() => setOpen(true), OPEN_DELAY_MS);
  }

  function scheduleClose() {
    clearTimers();
    closeTimerRef.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  function openNow() {
    clearTimers();
    setOpen(true);
  }

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (!showFlyout && open) setOpen(false);
  }, [showFlyout, open]);

  function segmentLinks(opts: { asMenu: boolean; onPick?: () => void }) {
    return AGENCY_SEGMENTS.map((entry, index) => {
      const href = agencySegmentHref(entry.id);
      const selected = currentSegment === entry.id;
      return (
        <Link
          key={entry.id}
          id={agencySegmentTabId(entry.id)}
          role={opts.asMenu ? "menuitem" : undefined}
          to={href}
          title={`${entry.label} (g ${entry.shortcutKey})`}
          className={cn(
            opts.asMenu
              ? "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-muted outline-hidden transition-colors hover:bg-elevated hover:text-highlighted focus-visible:bg-elevated focus-visible:text-highlighted"
              : "app-shell__rail-sublink text-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            shellFocusRingClass,
            selected &&
              (opts.asMenu
                ? "bg-primary/10 text-primary"
                : "bg-sidebar-accent text-sidebar-accent-foreground"),
          )}
          aria-current={selected ? "page" : undefined}
          onClick={() => {
            setOpen(false);
            opts.onPick?.();
            onNavigate?.();
          }}
          onKeyDown={
            opts.asMenu
              ? (event) => {
                  const lastIndex = AGENCY_SEGMENTS.length - 1;
                  let nextIndex = index;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    nextIndex = index >= lastIndex ? 0 : index + 1;
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    nextIndex = index <= 0 ? lastIndex : index - 1;
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    nextIndex = 0;
                  } else if (event.key === "End") {
                    event.preventDefault();
                    nextIndex = lastIndex;
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    setOpen(false);
                    return;
                  } else {
                    return;
                  }
                  const next = AGENCY_SEGMENTS[nextIndex];
                  if (next) document.getElementById(agencySegmentTabId(next.id))?.focus();
                }
              : undefined
          }
        >
          <LucideIcon name={entry.icon} className="size-3.5 shrink-0" />
          {opts.asMenu ? (
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
          ) : (
            <span className="rail-label">{entry.label}</span>
          )}
        </Link>
      );
    });
  }

  if (variant === "rail" && showInlineSubnav) {
    return (
      <div className="app-shell__rail-group">
        <Link
          to="/agency"
          className={cn(shellRailLinkClass, active && shellRailLinkActiveClass)}
          title="Agency"
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
        >
          <LucideIcon name="i-lucide-briefcase" className={cn(shellRailIconClass, "rail-icon")} />
          <span className="rail-label">Agency</span>
        </Link>
        <div className="app-shell__rail-subnav" role="group" aria-label="Agency sections">
          {segmentLinks({ asMenu: false })}
        </div>
      </div>
    );
  }

  const triggerClass =
    variant === "rail"
      ? cn(shellRailLinkClass, active && shellRailLinkActiveClass)
      : cn(shellNavLinkClass, active && shellNavLinkActiveClass);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn("relative", variant === "rail" && "app-shell__rail-group")}
          onPointerEnter={scheduleOpen}
          onPointerLeave={scheduleClose}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          onFocusCapture={openNow}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              scheduleClose();
            }
          }}
        >
          <Link
            to="/agency"
            className={triggerClass}
            title="Agency"
            aria-current={active ? "page" : undefined}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={onNavigate}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || (variant === "rail" && event.key === "ArrowRight")) {
                event.preventDefault();
                openNow();
                requestAnimationFrame(() => {
                  document.getElementById(agencySegmentTabId("work"))?.focus();
                });
                return;
              }
              if (event.key === "Escape") {
                setOpen(false);
              }
            }}
          >
            {variant === "rail" ? (
              <>
                <LucideIcon
                  name="i-lucide-briefcase"
                  className={cn(shellRailIconClass, "rail-icon")}
                />
                <span className="rail-label">Agency</span>
              </>
            ) : (
              "Agency"
            )}
          </Link>
        </div>
      </PopoverAnchor>
      <PopoverContent
        id={menuId}
        role="menu"
        aria-label="Agency sections"
        align="start"
        side={variant === "rail" ? "right" : "bottom"}
        sideOffset={8}
        className="w-52 gap-0 p-1 motion-reduce:animate-none motion-reduce:data-open:zoom-in-100 motion-reduce:data-closed:zoom-out-100"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={openNow}
        onPointerLeave={scheduleClose}
        onEscapeKeyDown={() => setOpen(false)}
      >
        {segmentLinks({ asMenu: true })}
      </PopoverContent>
    </Popover>
  );
}
