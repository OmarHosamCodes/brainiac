import { CalendarOff, ChevronDown, MessageSquareText } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
  agencySectionTitleClass,
} from "@/features/shared/agency-ui";
import type { AgencyMemberProfileViewModel } from "@/features/member-profile/hooks/use-agency-member-profile";
import { cn } from "@/lib/utils";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
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
import { Skeleton } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

type Props = {
  viewModel: AgencyMemberProfileViewModel;
};

const HEAT_INTENSITY: Record<number, string> = {
  0: "bg-muted",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/65",
  4: "bg-primary",
};

function leaveTypeLabel(type: string) {
  if (type === "pto") return "PTO";
  if (type === "sick") return "Sick";
  if (type === "team_holiday") return "Team holiday";
  if (type === "other") return "Other";
  return type;
}

export function AgencyMemberProfileView({ viewModel }: Props) {
  const { profile } = viewModel;

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
    return <div className={cn(agencyErrorPanelClass, "m-6")}>{viewModel.error}</div>;
  }

  if (!profile) {
    return (
      <div className={cn(agencyEmptyPanelClass, "m-6")}>No profile data for this member yet.</div>
    );
  }

  const weeks: Array<typeof profile.heatMap.days> = [];
  {
    const padded = [...profile.heatMap.days];
    const first = new Date(`${padded[0]?.date ?? profile.heatMap.startDate}T00:00:00Z`);
    const pad = (first.getUTCDay() + 6) % 7;
    for (let i = 0; i < pad; i++) {
      padded.unshift({
        date: `pad-${i}`,
        totalSeconds: 0,
        intensity: 0,
        off: null,
        hoursLabel: "",
      });
    }
    for (let i = 0; i < padded.length; i += 7) {
      weeks.push(padded.slice(i, i + 7));
    }
  }

  return (
    <TooltipProvider delayDuration={120}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
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
            <h1 className="mt-4 text-wrap text-xl font-semibold text-highlighted">
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
                <dt className="text-muted">This month</dt>
                <dd className={agencyMetricClass}>{profile.monthHoursLabel}</dd>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <dt className="text-muted">Past year</dt>
                <dd className={agencyMetricClass}>{profile.yearHoursLabel}</dd>
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
                  className={agencyFocusRingClass}
                  onClick={() => viewModel.setLeaveDialogOpen(true)}
                >
                  <CalendarOff className="size-4" aria-hidden />
                  Add leave
                </Button>
              ) : null}
              {profile.canAddReview ? (
                <Button
                  type="button"
                  className={agencyFocusRingClass}
                  onClick={() => viewModel.setReviewDialogOpen(true)}
                >
                  <MessageSquareText className="size-4" aria-hidden />
                  Add review
                </Button>
              ) : null}
            </div>
          </aside>

          <main className="min-w-0 space-y-8">
            <section className={cn(agencyPanelClass, "p-4 sm:p-5")}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className={agencySectionTitleClass}>Contribution</h2>
                  <p className="mt-1 text-sm text-muted">
                    {profile.heatMap.startDate} → {profile.heatMap.endDate}
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
                    <span className="size-2.5 rounded-[3px] bg-warning/80 ring-1 ring-warning" />
                    Off days
                  </span>
                </div>
              </div>

              <div
                className="mt-4 flex gap-1 overflow-x-auto pb-1"
                role="img"
                aria-label="Year heat map of tracked hours and off days"
              >
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day) => {
                      if (day.date.startsWith("pad-")) {
                        return <span key={day.date} className="size-2.5 sm:size-3" />;
                      }
                      const title = day.off
                        ? `${day.date}: off (${leaveTypeLabel(day.off.type)}${
                            day.off.reason ? ` · ${day.off.reason}` : ""
                          })`
                        : `${day.date}: ${day.hoursLabel}`;
                      return (
                        <Tooltip key={day.date}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "size-2.5 rounded-[3px] sm:size-3",
                                agencyFocusRingClass,
                                day.off
                                  ? "bg-warning/80 ring-1 ring-warning"
                                  : (HEAT_INTENSITY[day.intensity] ?? HEAT_INTENSITY[0]),
                              )}
                              aria-label={title}
                              onClick={() => viewModel.focusDay(day.date)}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">{title}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className={agencySectionTitleClass}>Activity</h2>
              <p className="mt-1 text-sm text-muted">
                Reviews and tracked work, starting from today.
              </p>

              {profile.timeline.length === 0 ? (
                <div className={cn(agencyEmptyPanelClass, "mt-4")}>
                  No activity yet for this period. Track time in Tracker to fill the heat map.
                </div>
              ) : (
                <ol className="mt-4 space-y-3">
                  {profile.timeline.map((day) => (
                    <li
                      key={day.date}
                      id={`member-profile-day-${day.date}`}
                      className="border-b border-border pb-3 last:border-b-0"
                    >
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left",
                          agencyFocusRingClass,
                        )}
                        onClick={() => viewModel.toggleDay(day.date)}
                        aria-expanded={day.open}
                      >
                        <span className="text-sm font-semibold text-highlighted">{day.label}</span>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted transition-transform",
                            day.open ? "rotate-180" : "",
                          )}
                          aria-hidden
                        />
                      </button>
                      {day.open ? (
                        <ul className="mt-2 space-y-2 pl-1">
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
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                                      {item.body}
                                    </p>
                                  </div>
                                </div>
                              </li>
                            ) : (
                              <li
                                key={item.id}
                                className="flex flex-wrap items-baseline justify-between gap-2 px-1 py-1.5 text-sm"
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
            <div className="grid gap-1.5">
              <Label htmlFor="leave-start">Start</Label>
              <Input
                id="leave-start"
                type="date"
                value={viewModel.leaveDraft.startDate}
                onChange={(e) => viewModel.setLeaveDraft({ startDate: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="leave-end">End</Label>
              <Input
                id="leave-end"
                type="date"
                value={viewModel.leaveDraft.endDate}
                onChange={(e) => viewModel.setLeaveDraft({ endDate: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="leave-type">Type</Label>
              <select
                id="leave-type"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                value={viewModel.leaveDraft.type}
                onChange={(e) =>
                  viewModel.setLeaveDraft({
                    type: e.target.value as typeof viewModel.leaveDraft.type,
                  })
                }
              >
                <option value="pto">PTO</option>
                <option value="sick">Sick</option>
                <option value="other">Other</option>
                {profile.canAddReview ? <option value="team_holiday">Team holiday</option> : null}
              </select>
            </div>
            {profile.canAddReview ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={
                    viewModel.leaveDraft.teamWide || viewModel.leaveDraft.type === "team_holiday"
                  }
                  onChange={(e) =>
                    viewModel.setLeaveDraft({
                      teamWide: e.target.checked,
                      type: e.target.checked ? "team_holiday" : "pto",
                    })
                  }
                />
                Team-wide (all members)
              </label>
            ) : null}
            <div className="grid gap-1.5">
              <Label htmlFor="leave-reason">Reason</Label>
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
            <div className="grid gap-1.5">
              <Label htmlFor="review-date">Date</Label>
              <Input
                id="review-date"
                type="date"
                value={viewModel.reviewDraft.reviewDate}
                onChange={(e) => viewModel.setReviewDraft({ reviewDate: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="review-body">Note</Label>
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
