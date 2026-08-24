import { ExternalLink, SlidersHorizontal } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyFocusRingClass,
  agencyPanelClass,
  agencySectionTitleClass,
  agencyWorkMetaClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

import type { PeopleConfigBadge } from "./people-config-completion";
import { PeopleConfigProgress } from "./people-config-progress";

export type PeopleDirectoryCard = {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  subtitle: string;
  detail: string;
  completionPercent: number;
  badge: PeopleConfigBadge;
};

type AgencyPeopleDirectoryProps = {
  policyEnabled: boolean;
  policyEffectiveLabel: string | null;
  quarterlyMinHours: number | null;
  monthlyMinHours: number | null;
  requiredDailyHours: number | null;
  offDayReduceHours: number | null;
  weekStartLabel: string | null;
  departmentCount: number;
  memberCount: number;
  attentionCount: number;
  cards: readonly PeopleDirectoryCard[];
  canReviewDefaults: boolean;
  onReviewDefaults: () => void;
  onSelectMember: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
  isLoadError?: boolean;
  loadErrorMessage?: string | null;
  onRetryLoad?: () => void;
  isStaleLoadError?: boolean;
};

function badgeClass(badge: NonNullable<PeopleConfigBadge>): string {
  if (badge === "Override") return "bg-elevated text-muted font-medium";
  if (badge === "Incomplete") return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
  return "bg-elevated text-muted";
}

export function AgencyPeopleDirectory({
  policyEnabled,
  policyEffectiveLabel,
  quarterlyMinHours,
  monthlyMinHours,
  requiredDailyHours,
  offDayReduceHours,
  weekStartLabel,
  departmentCount,
  memberCount,
  attentionCount,
  cards,
  canReviewDefaults,
  onReviewDefaults,
  onSelectMember,
  onOpenProfile,
  isLoadError = false,
  loadErrorMessage = null,
  onRetryLoad,
  isStaleLoadError = false,
}: AgencyPeopleDirectoryProps) {
  return (
    <section className="space-y-6" data-testid="people-directory">
      <header className="space-y-1">
        <h1 className={cn(agencySectionTitleClass, "text-balance")}>People</h1>
        <p className={cn(agencyWorkMetaClass, "max-w-prose text-pretty")}>
          Configure team defaults and each member’s employment, off days, rates, tenure, and access.
        </p>
      </header>

      {isStaleLoadError && loadErrorMessage ? (
        <div
          className="border-warning/40 bg-warning/5 text-foreground flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3"
          role="status"
        >
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Showing cached people data.</span> {loadErrorMessage}
          </p>
          {onRetryLoad ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetryLoad}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {isLoadError ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-foreground flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3"
          role="alert"
        >
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Couldn&apos;t load people.</span>{" "}
            {loadErrorMessage ?? "Try again."}
          </p>
          {onRetryLoad ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetryLoad}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <article
            className={cn(
              agencyPanelClass,
              "grid gap-4 p-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-start sm:gap-6 sm:p-6",
            )}
          >
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-elevated text-muted inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {policyEffectiveLabel
                    ? `Effective ${policyEffectiveLabel}`
                    : policyEnabled
                      ? "Tenure tracking on"
                      : "Tenure tracking off"}
                </span>
                {attentionCount > 0 ? (
                  <span className="bg-amber-500/10 text-amber-800 dark:text-amber-200 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    <span
                      className="size-1.5 rounded-full bg-current motion-safe:animate-pulse"
                      aria-hidden
                    />
                    {attentionCount} need attention
                  </span>
                ) : (
                  <span className="bg-success/15 text-success inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    <span className="size-1.5 rounded-full bg-current" aria-hidden />
                    Roster clear
                  </span>
                )}
              </div>
              <h2 className="text-highlighted text-lg font-semibold tracking-tight text-balance">
                Team defaults
              </h2>
              <p className={cn(agencyWorkMetaClass, "max-w-prose text-pretty")}>
                {policyEnabled
                  ? "New members inherit this baseline. Open it when exceptions need a source of truth."
                  : "Tenure tracking is off. Turn it on here when the team is ready for quarter minimums."}
              </p>
              {canReviewDefaults ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={onReviewDefaults}
                >
                  <SlidersHorizontal className="size-3.5 opacity-70" aria-hidden />
                  Review team defaults
                </Button>
              ) : null}
            </div>
            <dl
              className="border-border grid gap-2 border-t pt-4 text-sm sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"
              aria-label="Current team defaults"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt className="text-muted">Quarter minimum</dt>
                <dd className="text-highlighted font-mono tabular-nums">
                  {quarterlyMinHours != null ? `${quarterlyMinHours}h` : "—"}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt className="text-muted">Month minimum</dt>
                <dd className="text-highlighted font-mono tabular-nums">
                  {monthlyMinHours != null ? `${monthlyMinHours}h` : "—"}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt className="text-muted">Work schedule</dt>
                <dd className="text-highlighted font-mono tabular-nums text-end">
                  {requiredDailyHours != null || offDayReduceHours != null || weekStartLabel
                    ? [
                        requiredDailyHours != null ? `${requiredDailyHours}h/day` : null,
                        offDayReduceHours != null ? `${offDayReduceHours}h/off day` : null,
                        weekStartLabel ? `starts ${weekStartLabel}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "—"}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt className="text-muted">Tracking</dt>
                <dd
                  className={cn(
                    "font-mono text-sm font-semibold",
                    policyEnabled ? "text-success" : "text-muted",
                  )}
                >
                  {policyEnabled ? "On" : "Off"}
                </dd>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <dt className="text-muted">Departments</dt>
                <dd className="text-highlighted font-mono tabular-nums">{departmentCount}</dd>
              </div>
            </dl>
          </article>

          <div className="space-y-3">
            <header className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-highlighted">Directory</h2>
                <p className={agencyWorkMetaClass}>Open a member to finish their setup.</p>
              </div>
              <p className="text-muted font-mono text-xs tabular-nums">
                {memberCount} {memberCount === 1 ? "member" : "members"}
                {attentionCount > 0 ? ` · ${attentionCount} need attention` : null}
              </p>
            </header>

            {cards.length === 0 ? (
              <div className={cn(agencyPanelClass, "px-5 py-10 text-center")} role="status">
                <p className="text-sm font-medium text-highlighted">No members yet</p>
                <p className={cn(agencyWorkMetaClass, "mx-auto mt-1 max-w-sm text-pretty")}>
                  Invite teammates from team settings, then configure their People record here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((card) => (
                  <article
                    key={card.userId}
                    className={cn(
                      agencyPanelClass,
                      "flex min-h-11 flex-col items-stretch gap-3 p-4",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectMember(card.userId)}
                      className={cn(
                        agencyFocusRingClass,
                        "flex flex-col items-stretch gap-3 text-start",
                        "rounded-xl transition-colors duration-150 ease-out",
                        "hover:bg-elevated/70 active:bg-elevated",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <AgencyMemberAvatar
                          name={card.userName}
                          userId={card.userId}
                          avatarUrl={card.userAvatar}
                          size="md"
                          alt={card.userName}
                          className="size-11 rounded-2xl"
                        />
                        {card.badge ? (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                              badgeClass(card.badge),
                            )}
                          >
                            {card.badge}
                          </span>
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-highlighted">
                          {card.userName}
                        </h3>
                        <p className="text-muted truncate text-xs">{card.subtitle}</p>
                        <p className="text-muted mt-1 truncate text-xs">{card.detail}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-muted text-xs">
                          <span className="font-mono tabular-nums text-highlighted">
                            {card.completionPercent}%
                          </span>{" "}
                          configured
                        </p>
                        <PeopleConfigProgress
                          value={card.completionPercent}
                          label={`${card.userName} configuration progress`}
                        />
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted hover:text-highlighted h-8 gap-1.5 self-start px-2"
                      onClick={() => onOpenProfile(card.userId)}
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      Open profile
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
