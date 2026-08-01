import { CalendarOff, ChevronDown, MessageSquareText } from "lucide-react";

import { RangePresetChooser } from "@/features/dashboard/agency-dashboard-command-bar";
import type { AgencyMemberProfileViewModel } from "@/features/member-profile/hooks/use-agency-member-profile";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyMutedSectionHeaderClass,
  agencyPanelClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { agencyCommandBarShellClass } from "@/features/shared/command-bar/agency-command-bar-ui";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

type Props = {
  viewModel: AgencyMemberProfileViewModel;
};

type HeatDay = NonNullable<AgencyMemberProfileViewModel["profile"]>["heatMap"]["days"][number];

const HEAT_INTENSITY: Record<number, string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/45",
  3: "bg-primary/70",
  4: "bg-primary",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function leaveTypeLabel(type: string) {
  if (type === "pto") return "PTO";
  if (type === "sick") return "Sick";
  if (type === "team_holiday") return "Team holiday";
  if (type === "other") return "Other";
  return type;
}

function offBandRadius(band: HeatDay["offBand"]) {
  switch (band) {
    case "start":
      return "rounded-t-[3px] rounded-b-none";
    case "middle":
      return "rounded-none";
    case "end":
      return "rounded-b-[3px] rounded-t-none";
    case "single":
      return "rounded-[3px]";
    case null:
      return "rounded-[3px]";
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

function monthLabelsForWeeks(weeks: HeatDay[][]) {
  const labels: Array<{ weekIndex: number; label: string }> = [];
  let lastMonth = "";
  weeks.forEach((week, weekIndex) => {
    const firstReal = week.find((day) => !day.date.startsWith("pad-"));
    if (!firstReal) return;
    const month = firstReal.date.slice(0, 7);
    if (month === lastMonth) return;
    lastMonth = month;
    const date = new Date(`${firstReal.date}T00:00:00Z`);
    labels.push({
      weekIndex,
      label: date.toLocaleString(undefined, { month: "short", timeZone: "UTC" }),
    });
  });
  return labels;
}

function HeatCell({
  day,
  sizeClass,
  showDayNumber,
  onFocus,
}: {
  day: HeatDay;
  sizeClass: string;
  showDayNumber: boolean;
  onFocus: () => void;
}) {
  const title = day.off
    ? `${day.date}: ${day.hoursLabel || "0m"} · off (${leaveTypeLabel(day.off.type)}${
        day.off.reason ? ` · ${day.off.reason}` : ""
      })`
    : `${day.date}: ${day.hoursLabel}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            sizeClass,
            agencyFocusRingClass,
            HEAT_INTENSITY[day.intensity] ?? HEAT_INTENSITY[0],
            showDayNumber && "text-[10px] font-medium leading-none text-highlighted",
            day.off
              ? cn(
                  "ring-1 ring-warning",
                  day.intensity === 0 && "bg-warning/45",
                  offBandRadius(day.offBand),
                )
              : "rounded-[3px]",
          )}
          aria-label={title}
          onClick={onFocus}
        >
          {showDayNumber ? day.dayOfMonthLabel : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{title}</TooltipContent>
    </Tooltip>
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

  const weeks: HeatDay[][] = [];
  {
    const padded: HeatDay[] = [...profile.heatMap.days];
    const first = new Date(`${padded[0]?.date ?? profile.heatMap.startDate}T00:00:00Z`);
    const pad = (first.getUTCDay() + 6) % 7;
    for (let i = 0; i < pad; i++) {
      padded.unshift({
        date: `pad-${i}`,
        totalSeconds: 0,
        intensity: 0,
        off: null,
        offBand: null,
        hoursLabel: "",
        dayOfMonthLabel: "",
      });
    }
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }
  }
  const monthLabels = monthLabelsForWeeks(weeks);

  const isCompact = profile.heatLayout === "compact";

  return (
    <TooltipProvider delayDuration={120}>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div className={cn(agencyCommandBarShellClass, "w-full")}>
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
              <Input
                type="date"
                aria-label="From date"
                className="h-9 w-auto"
                value={period.customFromDate}
                onChange={(e) => period.onCustomFromChange(e.target.value)}
              />
              <span className="text-xs text-muted">to</span>
              <Input
                type="date"
                aria-label="To date"
                className="h-9 w-auto"
                value={period.customToDate}
                onChange={(e) => period.onCustomToChange(e.target.value)}
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">
          <aside className="md:sticky md:top-4">
            <AgencyMemberAvatar
              name={profile.userName}
              userId={viewModel.subjectUserId}
              avatarUrl={profile.userAvatarUrl}
              size="md"
              className="size-24 rounded-full"
              alt={profile.userName}
            />
            <h1 className="mt-4 text-wrap text-xl font-semibold text-balance text-highlighted">
              {profile.userName}
            </h1>
            <Badge variant="secondary" className="mt-2 capitalize">
              {profile.role}
            </Badge>
            {profile.isSelf ? <p className="mt-2 text-xs text-muted">This is you</p> : null}

            <dl className="mt-5 space-y-3 border-t border-border pt-4">
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-muted">Joined</dt>
                <dd className={agencyMetricClass}>{profile.joinedAtLabel}</dd>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-muted">Period hours</dt>
                <dd className={agencyMetricClass}>{profile.periodHoursLabel}</dd>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-muted">Leave</dt>
                <dd className="text-right text-sm text-foreground">{profile.leaveSummary}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-col gap-2">
              {profile.canManageLeave ? (
                <Button
                  type="button"
                  variant="outline"
                  className={cn("min-h-10 justify-start gap-2", agencyFocusRingClass)}
                  onClick={() => viewModel.setLeaveDialogOpen(true)}
                >
                  <CalendarOff className="size-4 shrink-0" aria-hidden />
                  Add leave
                </Button>
              ) : null}
              {profile.canAddReview ? (
                <Button
                  type="button"
                  className={cn("min-h-10 justify-start gap-2", agencyFocusRingClass)}
                  onClick={() => viewModel.setReviewDialogOpen(true)}
                >
                  <MessageSquareText className="size-4 shrink-0" aria-hidden />
                  Add review
                </Button>
              ) : null}
            </div>
          </aside>

          <main className="min-w-0 space-y-8">
            <section className={cn(agencyPanelClass, "p-4 sm:p-5")}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className={agencyWorkTitleClass}>Contribution</h2>
                  <p className="mt-1 text-sm text-muted">
                    {period.label} · {profile.heatMap.startDate} to {profile.heatMap.endDate}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
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

              <div className="mt-4 overflow-x-auto pb-1">
                {isCompact ? (
                  <div
                    className="inline-grid min-w-max grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1"
                    role="img"
                    aria-label="Calendar heat map of tracked hours and off days"
                  >
                    <span className="size-8" aria-hidden />
                    {WEEKDAY_LABELS.map((label) => (
                      <span
                        key={label}
                        className="flex size-8 items-center justify-center text-[10px] text-muted"
                      >
                        {label.slice(0, 1)}
                      </span>
                    ))}
                    {weeks.map((week, weekIndex) => (
                      <div key={weekIndex} className="contents">
                        <span className="flex size-8 items-center text-[10px] text-muted">
                          {weekIndex === 0
                            ? monthLabels[0]?.label
                            : monthLabels.find((entry) => entry.weekIndex === weekIndex)?.label ||
                              ""}
                        </span>
                        {week.map((day, dayIndex) =>
                          day.date.startsWith("pad-") ? (
                            <span key={`pad-${weekIndex}-${dayIndex}`} className="size-8" />
                          ) : (
                            <HeatCell
                              key={day.date}
                              day={day}
                              sizeClass="size-8"
                              showDayNumber
                              onFocus={() => viewModel.focusDay(day.date)}
                            />
                          ),
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="inline-flex min-w-max gap-1">
                    <div className="flex w-7 shrink-0 flex-col gap-1 pt-5">
                      {WEEKDAY_LABELS.map((label, index) => (
                        <span
                          key={label}
                          className={cn(
                            "flex h-3 items-center text-[10px] leading-none text-muted",
                            index % 2 === 1 ? "opacity-0" : "",
                          )}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <div>
                      <div className="relative mb-1 h-4">
                        {monthLabels.map((entry) => (
                          <span
                            key={`${entry.label}-${entry.weekIndex}`}
                            className="absolute top-0 text-[10px] text-muted"
                            style={{ left: `${entry.weekIndex * 16}px` }}
                          >
                            {entry.label}
                          </span>
                        ))}
                      </div>
                      <div
                        className="flex gap-1"
                        role="img"
                        aria-label="Heat map strip of tracked hours and off days"
                      >
                        {weeks.map((week, weekIndex) => (
                          <div key={weekIndex} className="flex flex-col gap-1">
                            {week.map((day) =>
                              day.date.startsWith("pad-") ? (
                                <span key={day.date} className="size-3" />
                              ) : (
                                <HeatCell
                                  key={day.date}
                                  day={day}
                                  sizeClass="size-3"
                                  showDayNumber={false}
                                  onFocus={() => viewModel.focusDay(day.date)}
                                />
                              ),
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className={agencyWorkTitleClass}>Activity</h2>
              <p className="mt-1 text-sm text-muted">
                Reviews and tracked work in {period.label}, newest first.
              </p>

              {profile.timeline.length === 0 ? (
                <div className={cn(agencyEmptyPanelClass, "mt-4")}>
                  No activity yet for this period. Track time in Tracker to fill the heat map.
                </div>
              ) : (
                <ol className="mt-4 space-y-0 overflow-hidden rounded-xl border border-border">
                  {profile.timeline.map((day) => (
                    <li
                      key={day.date}
                      id={`member-profile-day-${day.date}`}
                      className="border-b border-border last:border-b-0"
                    >
                      <button
                        type="button"
                        className={cn(
                          agencyMutedSectionHeaderClass,
                          "w-full text-left transition-colors hover:bg-muted/75",
                          agencyFocusRingClass,
                          "motion-reduce:transition-none",
                        )}
                        onClick={() => viewModel.toggleDay(day.date)}
                        aria-expanded={day.open}
                      >
                        <span className="text-sm font-semibold text-highlighted">{day.label}</span>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted transition-transform duration-200 motion-reduce:transition-none",
                            day.open ? "rotate-180" : "",
                          )}
                          aria-hidden
                        />
                      </button>
                      {day.open ? (
                        <ul className="space-y-2 bg-background px-4 py-3 sm:px-5">
                          {day.items.map((item) =>
                            item.kind === "review" ? (
                              <li
                                key={item.id}
                                className="rounded-xl border border-border bg-card p-3"
                              >
                                <div className="flex items-start gap-2">
                                  <AgencyMemberAvatar
                                    name={item.authorName}
                                    avatarUrl={item.authorAvatarUrl}
                                    size="sm"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="secondary">Review</Badge>
                                      <span className="text-xs text-muted">
                                        {item.authorName} · {item.timeLabel}
                                      </span>
                                    </div>
                                    <p className="mt-2 whitespace-pre-wrap text-pretty text-sm text-foreground">
                                      {item.body}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ) : (
                              <li
                                key={item.id}
                                className="flex flex-wrap items-baseline justify-between gap-2 py-1 text-sm"
                              >
                                <div className="min-w-0">
                                  <span className={agencyLabelClass}>{item.timeLabel}</span>
                                  <p className="text-foreground">{item.summary}</p>
                                  {item.projectName ? (
                                    <p className="text-xs text-muted">{item.projectName}</p>
                                  ) : null}
                                  {item.isWaste ? (
                                    <Badge variant="outline" className="mt-1">
                                      Waste
                                    </Badge>
                                  ) : null}
                                </div>
                                <span className={cn(agencyMetricClass, "text-xs")}>
                                  {item.durationLabel}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </main>
        </div>
      </div>

      <Dialog open={viewModel.leaveDialogOpen} onOpenChange={viewModel.setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add leave</DialogTitle>
            <DialogDescription>
              Connected off-day bands appear on the heat map for this range.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label htmlFor="leave-start" className={agencyFormLabelClass}>
                Start
              </Label>
              <Input
                id="leave-start"
                type="date"
                value={viewModel.leaveDraft.startDate}
                onChange={(e) => viewModel.setLeaveDraft({ startDate: e.target.value })}
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor="leave-end" className={agencyFormLabelClass}>
                End
              </Label>
              <Input
                id="leave-end"
                type="date"
                value={viewModel.leaveDraft.endDate}
                onChange={(e) => viewModel.setLeaveDraft({ endDate: e.target.value })}
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
              <Input
                id="review-date"
                type="date"
                value={viewModel.reviewDraft.reviewDate}
                onChange={(e) => viewModel.setReviewDraft({ reviewDate: e.target.value })}
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
