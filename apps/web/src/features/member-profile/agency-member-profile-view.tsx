import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { shellConfirmInClass, shellStaggerItemClass } from "@/features/app-shell/app-shell-ui";
import { RangePresetChooser } from "@/features/shared/command-bar/range-preset-chooser";
import { MemberProfileActivityRails } from "@/features/member-profile/member-profile-activity-rails";
import { MemberProfileDatePicker } from "@/features/shared/date/member-profile-date-picker";
import {
  MemberProfileLeaveRangePicker,
  MemberProfileOffDayRangePanel,
} from "@/features/shared/date/member-profile-leave-range-picker";
import type { AgencyMemberProfileViewModel } from "@/features/member-profile/hooks/use-agency-member-profile";
import { MemberProfileAlertsPanel } from "@/features/member-profile/member-profile-alerts-view";
import { MemberProfileRosterSwitcher } from "@/features/member-profile/member-profile-roster-switcher";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyMetricClass,
  agencyWorkMetaClass,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Skeleton } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

/** Profile panels: shadcn surface tokens + theme radius (not hardcoded 2rem / Nuxt aliases). */
const profilePanelClass = "rounded-xl border border-border bg-card";

function safeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

type Props = {
  viewModel: AgencyMemberProfileViewModel;
};

function ProfileStatCard({
  label,
  valueLabel,
  secondary,
  ratio,
  tone,
}: {
  label: string;
  valueLabel: string;
  secondary: string;
  ratio: number;
  tone: "success" | "warning" | "foreground";
}) {
  const angle = Math.round(Math.min(1, Math.max(0, ratio)) * 360);
  const ringColor =
    tone === "success"
      ? "var(--success)"
      : tone === "warning"
        ? "var(--warning)"
        : "var(--foreground)";
  return (
    <div className={cn(profilePanelClass, "flex items-center gap-3 p-3.5")}>
      <div
        className="relative grid size-16 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${ringColor} 0 ${angle}deg, var(--muted) ${angle}deg 360deg)`,
        }}
        role="img"
        aria-label={`${label}: ${valueLabel}`}
      >
        <div className="absolute inset-2 rounded-full bg-card" />
        <span className="relative max-w-12 truncate px-0.5 text-center font-mono text-[11px] font-semibold tabular-nums text-foreground">
          {valueLabel}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{secondary}</p>
      </div>
    </div>
  );
}

function PersonalRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value?.trim() || "—"}</p>
      </div>
    </div>
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
      <div className="mx-auto grid max-w-7xl gap-4 p-6 lg:grid-cols-[240px_minmax(0,1fr)_minmax(17.5rem,20rem)]">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-[28rem] w-full" />
        <Skeleton className="h-80 w-full" />
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
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
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
              <span className="text-xs text-muted-foreground">to</span>
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
          <MemberProfileRosterSwitcher memberNav={viewModel.memberNav} />
        </div>

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)_minmax(17.5rem,20rem)] lg:items-start">
          <aside
            className={cn("space-y-4", shellStaggerItemClass)}
            style={{ "--stagger-i": 1 } as CSSProperties}
          >
            <section className={cn(profilePanelClass, "p-4")}>
              <div className="flex items-start justify-between gap-2">
                <AgencyMemberAvatar
                  name={profile.userName}
                  userId={viewModel.subjectUserId}
                  avatarUrl={profile.userAvatarUrl}
                  size="md"
                  className="size-16 shrink-0 rounded-xl transition-transform duration-200 ease-out hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
                  alt={profile.userName}
                />
                {(profile.canEditHr || profile.canManageLeave) && (
                  <div className="-mr-1.5 -mt-1.5 flex shrink-0 items-center">
                    {profile.canEditHr ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className={agencyFocusRingClass}
                            onClick={() => viewModel.setHrDialogOpen(true)}
                            aria-label="Edit profile"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Edit profile</TooltipContent>
                      </Tooltip>
                    ) : null}
                    {profile.canManageLeave ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className={agencyFocusRingClass}
                            onClick={() => viewModel.openAddOffDayDialog()}
                            aria-label="Add off day"
                          >
                            <CalendarOff className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Add off day</TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                )}
              </div>
              <h1 className="mt-3 text-wrap text-base font-semibold leading-snug text-balance text-foreground">
                {profile.userName}
              </h1>
              <dl className="mt-4 space-y-2.5 border-t border-border pt-3">
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">Department</dt>
                  <dd className="text-right text-foreground">{profile.hr.departmentName ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">Employment</dt>
                  <dd className="text-right text-foreground">
                    {profile.hr.employmentTypeLabel ?? "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">Work model</dt>
                  <dd className="text-right text-foreground">{profile.hr.workModelLabel ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">Joined</dt>
                  <dd className={agencyMetricClass}>{profile.joinedAtLabel}</dd>
                </div>
              </dl>
              {(safeHttpUrl(profile.hr.linkedinUrl) ||
                safeHttpUrl(profile.hr.xUrl) ||
                safeHttpUrl(profile.hr.instagramUrl)) && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3 text-xs">
                  {safeHttpUrl(profile.hr.linkedinUrl) ? (
                    <a
                      href={safeHttpUrl(profile.hr.linkedinUrl)!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground underline-offset-2 hover:underline"
                    >
                      LinkedIn
                    </a>
                  ) : null}
                  {safeHttpUrl(profile.hr.xUrl) ? (
                    <a
                      href={safeHttpUrl(profile.hr.xUrl)!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground underline-offset-2 hover:underline"
                    >
                      X
                    </a>
                  ) : null}
                  {safeHttpUrl(profile.hr.instagramUrl) ? (
                    <a
                      href={safeHttpUrl(profile.hr.instagramUrl)!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Instagram
                    </a>
                  ) : null}
                </div>
              )}
            </section>

            <section className={cn(profilePanelClass, "p-4")}>
              <h2 className={agencyWorkTitleClass}>Personal info</h2>
              <div className="mt-1 divide-y divide-border">
                <PersonalRow
                  icon={<UserRound className="size-4" />}
                  label="Gender"
                  value={profile.hr.gender}
                />
                <PersonalRow
                  icon={<UserRound className="size-4" />}
                  label="Date of birth"
                  value={profile.hr.dateOfBirthLabel}
                />
                <PersonalRow
                  icon={<Mail className="size-4" />}
                  label="Email"
                  value={profile.email}
                />
                <PersonalRow
                  icon={<Phone className="size-4" />}
                  label="Phone"
                  value={profile.hr.phone}
                />
                <PersonalRow
                  icon={<MapPin className="size-4" />}
                  label="Address"
                  value={profile.hr.address}
                />
              </div>
            </section>
          </aside>

          <main
            className={cn("min-w-0 space-y-5", shellStaggerItemClass)}
            style={{ "--stagger-i": 2 } as CSSProperties}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {profile.leaveGauges.map((gauge) => (
                <ProfileStatCard
                  key={gauge.key}
                  label={gauge.label}
                  valueLabel={gauge.valueLabel}
                  secondary={gauge.secondary}
                  ratio={gauge.ratio}
                  tone={gauge.tone}
                />
              ))}
            </div>

            <section className={cn(profilePanelClass, "p-4 sm:p-5")}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className={agencyWorkTitleClass}>Hours logged</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Week containing period end</p>
                </div>
                <p
                  key={profile.weekHoursTotalLabel}
                  className={cn(agencyMetricClass, "text-lg", shellConfirmInClass)}
                >
                  {profile.weekHoursTotalLabel}
                </p>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                {profile.weekHours.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center rounded-lg px-0.5 py-1 transition-colors hover:bg-muted/50",
                      agencyFocusRingClass,
                    )}
                    onClick={() => viewModel.focusDay(day.date)}
                  >
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      {day.hoursLabel}
                    </span>
                    <span
                      className="mt-1.5 flex h-16 w-6 items-end overflow-hidden rounded-t-md rounded-b-sm bg-muted"
                      aria-hidden
                    >
                      <span
                        className="w-full rounded-t-[5px] rounded-b-sm bg-foreground transition-[height] duration-200 ease-out motion-reduce:transition-none"
                        style={{ height: `${day.heightPct}%` }}
                      />
                    </span>
                    <span className="mt-1.5 text-[11px] text-muted-foreground">
                      {day.weekdayLabel}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Period total · {profile.periodHoursLabel}
              </p>
            </section>

            {profile.timeline.length === 0 ? (
              <section className={cn(profilePanelClass, "p-4 sm:p-5")}>
                <h2 className={agencyWorkTitleClass}>Activity & reviews</h2>
                <div className={cn(agencyEmptyPanelClass, "mt-4")}>
                  No activity in this period yet. Log time in Tracker to populate this timeline.
                </div>
              </section>
            ) : (
              <MemberProfileActivityRails
                teamId={viewModel.teamId}
                days={profile.timeline}
                totalEventsLabel={`${profile.timeline.reduce((sum, day) => sum + day.items.length, 0)} events`}
                highlightDate={viewModel.highlightedActivityDate}
              />
            )}
          </main>

          <aside
            className={cn("space-y-4", shellStaggerItemClass)}
            style={{ "--stagger-i": 3 } as CSSProperties}
          >
            <section className={cn(profilePanelClass, "p-4")}>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn("shrink-0", agencyFocusRingClass)}
                  onClick={profile.calendar.onPrevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <h2 className={cn(agencyWorkTitleClass, "min-w-0 flex-1 text-center")}>
                  {profile.calendar.label}
                </h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn("shrink-0", agencyFocusRingClass)}
                  onClick={profile.calendar.onNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
                {profile.calendar.weekdayLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {profile.calendar.days.map((day) => {
                  const statusClass = !day.inMonth
                    ? "text-foreground/30"
                    : day.status === "present"
                      ? "bg-success text-success-foreground"
                      : day.status === "leave"
                        ? "bg-warning text-warning-foreground"
                        : "hover:bg-muted";
                  const statusSuffix =
                    day.status === "leave"
                      ? ", off day"
                      : day.status === "present"
                        ? ", present"
                        : "";
                  const dayButton = (
                    <button
                      type="button"
                      disabled={!day.inMonth}
                      className={cn(
                        "aspect-square w-full rounded-md text-xs tabular-nums transition-colors",
                        agencyFocusRingClass,
                        statusClass,
                      )}
                      onClick={
                        day.inMonth && !profile.canManageLeave
                          ? () => viewModel.focusDay(day.date)
                          : undefined
                      }
                      aria-label={`${day.date}${statusSuffix}`}
                    >
                      {day.dayOfMonth}
                    </button>
                  );

                  if (!day.inMonth || !profile.canManageLeave) {
                    return <div key={day.date}>{dayButton}</div>;
                  }

                  return (
                    <DropdownMenu key={day.date}>
                      <DropdownMenuTrigger asChild>{dayButton}</DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem
                          onSelect={() => viewModel.openOffDayRangeSelect(day.date)}
                        >
                          Select
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => viewModel.openAddOffDay(day.date)}>
                          Add off day
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
                {profile.calendar.legend.map((item) => (
                  <span key={item.status} className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        "size-2.5 rounded-[3px]",
                        item.status === "present" && "bg-success",
                        item.status === "leave" && "bg-warning",
                        item.status === "empty" && "bg-muted ring-1 ring-border",
                      )}
                    />
                    {item.label} {item.count}
                  </span>
                ))}
              </div>
            </section>

            <MemberProfileAlertsPanel alerts={viewModel.alerts} />

            <section
              className={cn(profilePanelClass, "p-4")}
              aria-labelledby="member-profile-ai-overview"
            >
              <h2 id="member-profile-ai-overview" className={agencyWorkTitleClass}>
                AI overview
              </h2>
              <p className={cn(agencyWorkMetaClass, "mt-2 text-pretty")}>
                Period insights on hours, attendance, and waste will land here.
              </p>
            </section>
          </aside>
        </div>
      </div>

      <Dialog
        open={viewModel.offDayRangeSelect !== null}
        onOpenChange={(open) => {
          if (!open) viewModel.closeOffDayRangeSelect();
        }}
      >
        <DialogContent className="w-auto gap-0 overflow-hidden p-0 sm:max-w-fit">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle>Select off days</DialogTitle>
            <DialogDescription>
              Range starts on the day you clicked. Choose the end day, then confirm.
            </DialogDescription>
          </DialogHeader>
          {viewModel.offDayRangeSelect ? (
            <MemberProfileOffDayRangePanel
              key={`${viewModel.offDayRangeSelect.startDate}:${viewModel.offDayRangeSelect.endDate}`}
              startDate={viewModel.offDayRangeSelect.startDate}
              endDate={viewModel.offDayRangeSelect.endDate}
              lockStart
              onCancel={() => viewModel.closeOffDayRangeSelect()}
              onConfirm={(next) => viewModel.confirmOffDayRangeSelect(next)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={viewModel.leaveDialogOpen} onOpenChange={viewModel.setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add off day</DialogTitle>
            <DialogDescription>
              Connected off-day bands appear on the calendar for this range.
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
                  <SelectValue placeholder="Off day type" />
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
              {viewModel.leavePending ? "Saving…" : "Save off day"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModel.hrDialogOpen} onOpenChange={viewModel.setHrDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Employment details and contact info.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label className={agencyFormLabelClass}>Status</Label>
              <Select
                value={viewModel.hrDraft.status}
                onValueChange={(value) =>
                  viewModel.setHrDraft({ status: value as "active" | "inactive" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={agencyFormFieldClass}>
              <Label className={agencyFormLabelClass}>Department</Label>
              <Select
                value={viewModel.hrDraft.departmentId || "none"}
                onValueChange={(value) =>
                  viewModel.setHrDraft({ departmentId: value === "none" ? "" : value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {profile.departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={agencyFormFieldClass}>
                <Label className={agencyFormLabelClass}>Employment type</Label>
                <Select
                  value={viewModel.hrDraft.employmentType || "none"}
                  onValueChange={(value) =>
                    viewModel.setHrDraft({
                      employmentType:
                        value === "none"
                          ? ""
                          : (value as NonNullable<typeof viewModel.hrDraft.employmentType>),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={agencyFormFieldClass}>
                <Label className={agencyFormLabelClass}>Work model</Label>
                <Select
                  value={viewModel.hrDraft.workModel || "none"}
                  onValueChange={(value) =>
                    viewModel.setHrDraft({
                      workModel:
                        value === "none"
                          ? ""
                          : (value as NonNullable<typeof viewModel.hrDraft.workModel>),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={agencyFormFieldClass}>
                <Label className={agencyFormLabelClass}>Gender</Label>
                <Select
                  value={viewModel.hrDraft.gender || "none"}
                  onValueChange={(value) =>
                    viewModel.setHrDraft({ gender: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className={agencyFormFieldClass}>
                <Label className={agencyFormLabelClass}>Date of birth</Label>
                <MemberProfileDatePicker
                  id="hr-dob"
                  value={viewModel.hrDraft.dateOfBirth}
                  onChange={(value) => viewModel.setHrDraft({ dateOfBirth: value })}
                  aria-label="Date of birth"
                />
              </div>
            </div>
            <div className={agencyFormFieldClass}>
              <Label className={agencyFormLabelClass}>Phone</Label>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+1 555 000 0000"
                value={viewModel.hrDraft.phone}
                onChange={(e) => viewModel.setHrDraft({ phone: e.target.value })}
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label className={agencyFormLabelClass}>Address</Label>
              <Textarea
                rows={2}
                value={viewModel.hrDraft.address}
                onChange={(e) => viewModel.setHrDraft({ address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => viewModel.setHrDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={viewModel.hrPending}
              onClick={() => void viewModel.submitHr()}
            >
              {viewModel.hrPending ? "Saving…" : "Save profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
