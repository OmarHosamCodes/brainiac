import { CalendarOff, ChevronRight, Clock3, MessageSquareText } from "lucide-react";
import type { CSSProperties } from "react";

import { shellConfirmInClass, shellStaggerItemClass } from "@/features/app-shell/app-shell-ui";
import { RangePresetChooser } from "@/features/dashboard/agency-dashboard-command-bar";
import { MemberProfileDatePicker } from "@/features/member-profile/member-profile-date-picker";
import {
  HEAT_INTENSITY,
  MemberProfileHeatMap,
} from "@/features/member-profile/member-profile-heat-map";
import { MemberProfileLeaveRangePicker } from "@/features/member-profile/member-profile-leave-range-picker";
import type { AgencyMemberProfileViewModel } from "@/features/member-profile/hooks/use-agency-member-profile";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { AgencyCollapse } from "@/features/shared/agency-collapse";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyMetricClass,
  agencyPanelClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { agencyCommandBarShellClass } from "@/features/shared/command-bar/agency-command-bar-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Skeleton } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";
import { TooltipProvider } from "@/ui/tooltip";

type Props = {
  viewModel: AgencyMemberProfileViewModel;
};

/** Semantic accents for timeline events — Restrained product colorize. */
function activityEventChrome(eventType: "time_logged" | "waste_marked" | "leave") {
  switch (eventType) {
    case "time_logged":
      return {
        row: "rounded-lg hover:bg-info/5",
        mark: "border-info/35 bg-info/15 text-info",
        kind: "text-info",
        duration: "text-info",
      };
    case "waste_marked":
      return {
        row: "rounded-lg bg-warning/5 hover:bg-warning/10",
        mark: "border-warning/40 bg-warning/15 text-warning",
        kind: "text-warning",
        duration: "text-warning",
      };
    case "leave":
      return {
        row: "rounded-lg bg-warning/5 hover:bg-warning/10",
        mark: "border-warning/40 bg-warning/20 text-warning",
        kind: "text-warning",
        duration: "text-warning",
      };
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

function TimelineActivityRow({
  item,
  itemIndex,
}: {
  item: Extract<
    NonNullable<AgencyMemberProfileViewModel["profile"]>["timeline"][number]["items"][number],
    { kind: "activity" }
  >;
  itemIndex: number;
}) {
  const chrome = activityEventChrome(item.eventType);
  return (
    <li
      className={cn(
        "grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 px-3 py-2.5 transition-colors duration-150 ease-out",
        chrome.row,
        shellStaggerItemClass,
      )}
      style={{ "--stagger-i": Math.min(itemIndex, 6) } as CSSProperties}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full border transition-transform duration-150 ease-out",
          chrome.mark,
        )}
        aria-hidden
      >
        {item.eventType === "leave" ? (
          <CalendarOff className="size-3.5" />
        ) : (
          <Clock3 className="size-3.5" />
        )}
      </span>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className={cn("text-[11px] font-semibold tracking-wide uppercase", chrome.kind)}>
            {item.kindLabel}
          </span>
          <span className="font-mono text-[11px] text-foreground/70">{item.timeLabel}</span>
          {item.durationLabel ? (
            <span
              className={cn(
                "ms-auto font-mono text-[11px] font-semibold tabular-nums",
                chrome.duration,
              )}
            >
              {item.durationLabel}
            </span>
          ) : null}
        </div>
        <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
        {item.body ? (
          <p className="mt-1 max-w-[65ch] text-sm text-foreground/70">{item.body}</p>
        ) : null}
        {item.meta ? <p className="mt-1 text-[11px] text-foreground/70">{item.meta}</p> : null}
      </div>
    </li>
  );
}

export function AgencyMemberProfileView({ viewModel }: Props) {
  const { profile, period } = viewModel;

  if (!viewModel.teamId) {
    return (
      <div className={cn(agencyEmptyPanelClass, "m-6")}>
        Select a team to open a member profile.
      </div>
    );
  }

  if (viewModel.loading && !profile) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-3">
          <Skeleton className="size-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (viewModel.error && !profile) {
    return (
      <div className={cn(agencyErrorPanelClass, "m-6 flex flex-wrap items-center gap-3")}>
        <span>{viewModel.error}</span>
        <Button type="button" variant="outline" size="sm" onClick={viewModel.retry}>
          Retry
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={cn(agencyEmptyPanelClass, "m-6")}>No profile data for this member yet.</div>
    );
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div
          className={cn(agencyCommandBarShellClass, shellStaggerItemClass, "w-full")}
          style={{ "--stagger-i": 0 } as CSSProperties}
        >
          <RangePresetChooser
            value={period.rangePreset}
            onChange={period.onRangePresetChange}
            tenureAvailable={period.tenureAvailable}
            tenurePeriodLabel={period.tenurePeriodLabel}
            tenureQuarterLabel={period.tenureQuarterLabel}
            tenureQuarterMonths={period.tenureQuarterMonths}
            tenureMonthIndexes={period.tenureMonthIndexes}
            onTenureMonthIndexesChange={period.onTenureMonthIndexesChange}
          />
          {period.rangePreset === "custom" ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[11.5rem]">
                <MemberProfileDatePicker
                  id="profile-period-from"
                  aria-label="From date"
                  value={period.customFromDate}
                  onChange={period.onCustomFromChange}
                />
              </div>
              <span className="text-xs text-foreground/70">to</span>
              <div className="w-[11.5rem]">
                <MemberProfileDatePicker
                  id="profile-period-to"
                  aria-label="To date"
                  value={period.customToDate}
                  onChange={period.onCustomToChange}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
          <aside
            className={cn("md:sticky md:top-4", shellStaggerItemClass)}
            style={{ "--stagger-i": 1 } as CSSProperties}
          >
            <AgencyMemberAvatar
              name={profile.userName}
              userId={viewModel.subjectUserId}
              avatarUrl={profile.userAvatarUrl}
              size="md"
              className="size-24 rounded-full transition-transform duration-200 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
              alt={profile.userName}
            />
            <h1 className="mt-4 text-wrap text-xl font-semibold text-balance text-highlighted">
              {profile.userName}
            </h1>

            <dl className="mt-5 space-y-3 border-t border-border pt-4">
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-foreground/70">Joined</dt>
                <dd className={agencyMetricClass}>{profile.joinedAtLabel}</dd>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-foreground/70">Period hours</dt>
                <dd
                  key={profile.periodHoursLabel}
                  className={cn(agencyMetricClass, shellConfirmInClass)}
                >
                  {profile.periodHoursLabel}
                </dd>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-foreground/70">Leave</dt>
                <dd className="text-right text-sm text-foreground">{profile.leaveSummary}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-2">
              {profile.canManageLeave ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "min-h-10 justify-start gap-2 transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
                    agencyFocusRingClass,
                  )}
                  onClick={() => viewModel.setLeaveDialogOpen(true)}
                >
                  <CalendarOff className="size-4 shrink-0" aria-hidden />
                  Add leave
                </Button>
              ) : null}
              {profile.canAddReview ? (
                <Button
                  type="button"
                  className={cn(
                    "min-h-10 justify-start gap-2 transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
                    agencyFocusRingClass,
                  )}
                  onClick={() => viewModel.setReviewDialogOpen(true)}
                >
                  <MessageSquareText className="size-4 shrink-0" aria-hidden />
                  Add review
                </Button>
              ) : null}
            </div>
          </aside>

          <main
            className={cn("min-w-0 space-y-8", shellStaggerItemClass)}
            style={{ "--stagger-i": 2 } as CSSProperties}
          >
            <section className={cn(agencyPanelClass, "p-4 sm:p-5")}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className={agencyWorkTitleClass}>Contribution</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/70">
                  <span className="inline-flex items-center gap-1.5">
                    Less
                    {[0, 1, 2, 3, 4].map((level) => (
                      <span
                        key={level}
                        className={cn("size-2.5 rounded-[3px]", HEAT_INTENSITY[level])}
                      />
                    ))}
                    More
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[3px] bg-warning/45 ring-1 ring-warning" />
                    Off days
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "mt-4 pb-1",
                  profile.heatLayout === "compact" ? "overflow-x-auto" : "overflow-hidden",
                )}
              >
                <MemberProfileHeatMap
                  heatMap={profile.heatMap}
                  layout={profile.heatLayout}
                  onFocusDay={viewModel.focusDay}
                />
              </div>
            </section>

            <section className={cn(agencyPanelClass, "p-4 sm:p-5")}>
              <h2 className={agencyWorkTitleClass}>Activity & reviews</h2>

              {profile.timeline.length === 0 ? (
                <div className={cn(agencyEmptyPanelClass, "mt-4")}>
                  No activity in this period yet. Log time in Tracker to populate the heat map.
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {profile.timeline.map((day, dayIndex) => (
                    <section
                      key={day.date}
                      id={`member-profile-day-${day.date}`}
                      className={cn(
                        "overflow-hidden rounded-xl border border-border bg-background transition-[border-color,box-shadow] duration-200 ease-out [content-visibility:auto] [contain-intrinsic-size:auto_3.5rem]",
                        day.open && "border-border shadow-sm",
                        shellStaggerItemClass,
                      )}
                      style={
                        {
                          "--stagger-i": Math.min(dayIndex, 8),
                        } as CSSProperties
                      }
                    >
                      <button
                        type="button"
                        className={cn(
                          "grid w-full grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:bg-muted/60",
                          agencyFocusRingClass,
                          "motion-reduce:transition-none",
                        )}
                        onClick={() => viewModel.toggleDay(day.date)}
                        aria-expanded={day.open}
                      >
                        <ChevronRight
                          className={cn(
                            "size-4 text-foreground/70 transition-transform duration-200 ease-out motion-reduce:transition-none",
                            day.open ? "rotate-90" : "",
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold tracking-tight text-highlighted">
                            {day.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-foreground/70">
                            {day.subtitle}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] text-foreground/70">
                          {day.countLabel}
                        </span>
                      </button>

                      <AgencyCollapse open={day.open}>
                        <ul className="space-y-0 border-t border-border py-1">
                          {day.items.map((item, itemIndex) =>
                            item.kind === "review" ? (
                              <li
                                key={item.id}
                                className={cn(
                                  "grid grid-cols-[28px_minmax(0,1fr)] gap-2.5 rounded-lg px-3 py-2.5 hover:bg-primary/5",
                                  shellStaggerItemClass,
                                )}
                                style={{ "--stagger-i": Math.min(itemIndex, 6) } as CSSProperties}
                              >
                                <span
                                  className="flex size-7 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-primary transition-transform duration-150 ease-out"
                                  aria-hidden
                                >
                                  <MessageSquareText className="size-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <div className="mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                                    <span className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                                      Review note
                                    </span>
                                    <span className="font-mono text-[11px] text-foreground/70">
                                      {item.timeLabel}
                                    </span>
                                  </div>
                                  <p className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2.5 text-pretty text-sm whitespace-pre-wrap text-foreground">
                                    {item.body}
                                  </p>
                                  <p className="mt-1 text-[11px] text-foreground/70">
                                    {item.authorName}
                                  </p>
                                </div>
                              </li>
                            ) : (
                              <TimelineActivityRow
                                key={item.id}
                                item={item}
                                itemIndex={itemIndex}
                              />
                            ),
                          )}
                        </ul>
                      </AgencyCollapse>
                    </section>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      <Dialog open={viewModel.leaveDialogOpen} onOpenChange={viewModel.setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add leave</DialogTitle>
            <DialogDescription>
              Connected off-day bands appear on the heat map for this range.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label htmlFor="leave-range" className={agencyFormLabelClass}>
                Dates
              </Label>
              <MemberProfileLeaveRangePicker
                startDate={viewModel.leaveDraft.startDate}
                endDate={viewModel.leaveDraft.endDate}
                onRangeChange={(next) => viewModel.setLeaveDraft(next)}
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor="leave-type" className={agencyFormLabelClass}>
                Type
              </Label>
              <Select
                value={viewModel.leaveDraft.type}
                onValueChange={(value) =>
                  viewModel.setLeaveDraft({
                    type: value as typeof viewModel.leaveDraft.type,
                    teamWide: value === "team_holiday",
                  })
                }
              >
                <SelectTrigger id="leave-type" className="w-full">
                  <SelectValue placeholder="Leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pto">PTO</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  {profile.canAddReview ? (
                    <SelectItem value="team_holiday">Team holiday</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </div>
            {profile.canAddReview ? (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={
                    viewModel.leaveDraft.teamWide || viewModel.leaveDraft.type === "team_holiday"
                  }
                  onCheckedChange={(checked) =>
                    viewModel.setLeaveDraft({
                      teamWide: checked === true,
                      type: checked === true ? "team_holiday" : "pto",
                    })
                  }
                />
                Team-wide (all members)
              </label>
            ) : null}
            <div className={agencyFormFieldClass}>
              <Label htmlFor="leave-reason" className={agencyFormLabelClass}>
                Reason
              </Label>
              <Input
                id="leave-reason"
                value={viewModel.leaveDraft.reason}
                onChange={(e) => viewModel.setLeaveDraft({ reason: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => viewModel.setLeaveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={viewModel.leavePending}
              className="transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100"
              onClick={() => void viewModel.submitLeave()}
            >
              {viewModel.leavePending ? "Saving…" : "Save leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModel.reviewDialogOpen} onOpenChange={viewModel.setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add review</DialogTitle>
            <DialogDescription>
              Manager note for a day on this member&apos;s timeline.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label htmlFor="review-date" className={agencyFormLabelClass}>
                Date
              </Label>
              <MemberProfileDatePicker
                id="review-date"
                value={viewModel.reviewDraft.reviewDate}
                onChange={(value) => viewModel.setReviewDraft({ reviewDate: value })}
                aria-label="Review date"
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor="review-body" className={agencyFormLabelClass}>
                Note
              </Label>
              <Textarea
                id="review-body"
                rows={5}
                value={viewModel.reviewDraft.body}
                onChange={(e) => viewModel.setReviewDraft({ body: e.target.value })}
                placeholder="What stood out today?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => viewModel.setReviewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={viewModel.reviewPending || !viewModel.reviewDraft.body.trim()}
              className="transition-transform duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100"
              onClick={() => void viewModel.submitReview()}
            >
              {viewModel.reviewPending ? "Saving…" : "Save review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
