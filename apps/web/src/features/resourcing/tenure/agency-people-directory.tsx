import { SlidersHorizontal } from "lucide-react";

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
  internDurationMonths: number | null;
  memberCount: number;
  attentionCount: number;
  cards: readonly PeopleDirectoryCard[];
  canEditPolicy: boolean;
  onReviewDefaults: () => void;
  onSelectMember: (userId: string) => void;
};

function badgeClass(badge: NonNullable<PeopleConfigBadge>): string {
  if (badge === "Override") return "bg-sidebar-primary/10 text-sidebar-primary";
  if (badge === "Incomplete") return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
  return "bg-elevated text-muted";
}

export function AgencyPeopleDirectory({
  policyEnabled,
  policyEffectiveLabel,
  quarterlyMinHours,
  internDurationMonths,
  memberCount,
  attentionCount,
  cards,
  canEditPolicy,
  onReviewDefaults,
  onSelectMember,
}: AgencyPeopleDirectoryProps) {
  return (
    <section className="space-y-6" data-testid="people-directory">
      <header className="space-y-1">
        <h1 className={cn(agencySectionTitleClass, "text-balance")}>People</h1>
        <p className={cn(agencyWorkMetaClass, "max-w-prose text-pretty")}>
          Configure team defaults and each member’s employment, leave, rates, tenure, and access.
        </p>
      </header>

      <article
        className={cn(
          agencyPanelClass,
          "group/defaults relative grid gap-5 overflow-hidden p-5",
          "sm:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] sm:gap-6 sm:p-6",
          "motion-safe:transition-[border-color,background-color] motion-safe:duration-200 motion-safe:ease-out",
          canEditPolicy && "hover:border-border hover:bg-elevated/40",
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sidebar-primary/30 to-transparent opacity-80"
          aria-hidden
        />
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
          {canEditPolicy ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out group-hover/defaults:border-highlighted/30"
              onClick={onReviewDefaults}
            >
              <SlidersHorizontal className="size-3.5 opacity-70" aria-hidden />
              Review team defaults
            </Button>
          ) : null}
        </div>
        <dl
          className="border-border grid grid-cols-2 gap-3 border-t pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6"
          aria-label="Current team defaults"
        >
          <div className="bg-elevated/50 rounded-2xl px-3 py-2.5">
            <dt className="text-muted text-xs font-medium">Quarter minimum</dt>
            <dd className="text-highlighted mt-1 font-mono text-xl font-medium leading-none tabular-nums tracking-tight">
              {quarterlyMinHours != null ? (
                <>
                  {quarterlyMinHours}
                  <span className="text-muted ms-0.5 text-sm font-medium">h</span>
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="bg-elevated/50 rounded-2xl px-3 py-2.5">
            <dt className="text-muted text-xs font-medium">Intern duration</dt>
            <dd className="text-highlighted mt-1 font-mono text-xl font-medium leading-none tabular-nums tracking-tight">
              {internDurationMonths != null ? (
                <>
                  {internDurationMonths}
                  <span className="text-muted ms-0.5 text-sm font-medium">mo</span>
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="bg-elevated/50 rounded-2xl px-3 py-2.5">
            <dt className="text-muted text-xs font-medium">Tracking</dt>
            <dd className="mt-1.5 flex items-center gap-2">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  policyEnabled ? "bg-success" : "bg-muted-foreground/50",
                )}
                aria-hidden
              />
              <span
                className={cn(
                  "font-mono text-sm font-semibold",
                  policyEnabled ? "text-success" : "text-muted",
                )}
              >
                {policyEnabled ? "On" : "Off"}
              </span>
            </dd>
          </div>
          <div className="bg-elevated/50 rounded-2xl px-3 py-2.5">
            <dt className="text-muted text-xs font-medium">Needs attention</dt>
            <dd
              className={cn(
                "mt-1 font-mono text-xl font-medium leading-none tabular-nums tracking-tight",
                attentionCount > 0 ? "text-amber-800 dark:text-amber-200" : "text-highlighted",
              )}
            >
              {attentionCount}
            </dd>
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
              <button
                key={card.userId}
                type="button"
                onClick={() => onSelectMember(card.userId)}
                className={cn(
                  agencyPanelClass,
                  agencyFocusRingClass,
                  "flex min-h-11 flex-col items-stretch gap-3 p-4 text-start",
                  "transition-colors duration-150 ease-out",
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
                <div className="mt-auto space-y-1.5">
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
