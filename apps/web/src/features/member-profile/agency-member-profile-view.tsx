import {
  Calendar,
  CalendarOff,
  ChevronRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  UserRound,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { shellStaggerItemClass } from "@/features/app-shell/app-shell-ui";
import { RangePresetChooser } from "@/features/shared/command-bar/range-preset-chooser";
import { MemberProfileActivityRails } from "@/features/member-profile/member-profile-activity-rails";
import { MemberProfileDatePicker } from "@/features/shared/date/member-profile-date-picker";
import {
  MemberProfileLeaveRangePicker,
  MemberProfileOffDayRangePanel,
} from "@/features/shared/date/member-profile-leave-range-picker";
import type { AgencyMemberProfileViewModel } from "@/features/member-profile/hooks/use-agency-member-profile";
import { MemberProfileAlertsPanel } from "@/features/member-profile/member-profile-alerts-view";
import { MemberProfileGaugeDetailDialog } from "@/features/member-profile/member-profile-gauge-detail-dialog";
import { memberProfileGaugeLayoutId } from "@/features/member-profile/member-profile-gauge-morph";
import {
  gaugeToneToPlateTone,
  InstrumentPlate,
  statPlateShortLabel,
  StatPlateGlyph,
} from "@/features/member-profile/member-profile-instrument-plate";
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
  DropdownMenuSeparator,
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

function OrchAgentGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle
        cx="16"
        cy="16"
        r="12"
        fill="none"
        className="stroke-current opacity-30"
        strokeWidth="1.25"
      />
      <circle
        cx="16"
        cy="16"
        r="7"
        fill="none"
        className="stroke-current opacity-45"
        strokeWidth="1.25"
        strokeDasharray="2 3"
      />
      <circle cx="16" cy="16" r="3.25" className="fill-current" />
      <line
        x1="16"
        y1="3"
        x2="16"
        y2="6.5"
        className="stroke-current opacity-55"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="16"
        y1="25.5"
        x2="16"
        y2="29"
        className="stroke-current opacity-35"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AskOrchRailCard({
  memberName,
  periodLabel,
  onAsk,
}: {
  memberName: string;
  periodLabel: string;
  onAsk: () => void;
}) {
  const subject = memberName.trim() || "this member";

  return (
    <button
      type="button"
      onClick={onAsk}
      className={cn(
        profilePanelClass,
        "group flex w-full items-center gap-3 px-3 py-3 text-start",
        "transition-colors duration-150 ease-out hover:bg-muted/40",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
      )}
      aria-label={`Summarize ${subject}'s hours, attendance, and waste for ${periodLabel}`}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-lg text-chart-2"
        aria-hidden
      >
        <OrchAgentGlyph className="size-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">Summarize with Orch</span>
        <span className={cn(agencyWorkMetaClass, "mt-0.5 block truncate tabular-nums")}>
          {periodLabel}
          <span aria-hidden> · </span>
          hours · attendance · waste
        </span>
      </span>

      <ChevronRight
        className={cn(
          "size-4 shrink-0 text-muted-foreground/70",
          "transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground",
          "motion-reduce:transition-none motion-reduce:group-hover:translate-x-0",
        )}
        aria-hidden
      />
    </button>
  );
}

type Props = {
  viewModel: AgencyMemberProfileViewModel;
};

type LeaveGauge = NonNullable<AgencyMemberProfileViewModel["profile"]>["leaveGauges"][number];

type CalendarDayStatus = AgencyMemberProfileViewModel["profile"] extends null
  ? never
  : NonNullable<AgencyMemberProfileViewModel["profile"]>["calendar"]["days"][number]["status"];

function calendarDayStatusClass(status: CalendarDayStatus, inMonth: boolean): string {
  if (!inMonth) return "text-foreground/30";
  switch (status) {
    case "present":
      return "bg-success text-success-foreground";
    case "leave":
      return "bg-warning text-warning-foreground";
    case "holiday":
      return "border border-chart-1/35 bg-chart-1/18 text-foreground";
    case "weekend":
      return cn(
        "bg-muted/60 text-muted-foreground",
        "[background-image:repeating-linear-gradient(-45deg,transparent_0_2.5px,var(--border)_2.5px_3.5px)]",
      );
    case "empty":
      return "text-foreground hover:bg-muted";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function calendarDayStatusSuffix(status: CalendarDayStatus): string {
  switch (status) {
    case "leave":
      return ", off day";
    case "holiday":
      return ", team holiday";
    case "present":
      return ", present";
    case "weekend":
      return ", weekend";
    case "empty":
      return "";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function calendarLegendIndicatorClass(status: CalendarDayStatus): string {
  switch (status) {
    case "present":
      return "bg-success";
    case "leave":
      return "bg-warning";
    case "holiday":
      return "border border-chart-1/40 bg-chart-1/20";
    case "weekend":
      return cn(
        "bg-muted/70",
        "[background-image:repeating-linear-gradient(-45deg,transparent_0_1px,var(--border)_1px_2px)]",
      );
    case "empty":
      return "bg-transparent ring-1 ring-border";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function calendarLegendAriaLabel(status: CalendarDayStatus, count: number, label: string): string {
  const unit = count === 1 ? "day" : "days";
  switch (status) {
    case "present":
      return `${count} ${unit} logged`;
    case "leave":
      return `${count} off ${unit}`;
    case "holiday":
      return `${count} team holiday ${unit}`;
    case "weekend":
      return `${count} weekend ${unit}`;
    case "empty":
      return `${count} ${unit} with no hours logged`;
    default: {
      const _exhaustive: never = status;
      return `${count} ${label}`;
    }
  }
}

function ProfileStatPlate({
  gauge,
  isOpen,
  onOpen,
}: {
  gauge: LeaveGauge;
  isOpen: boolean;
  onOpen: () => void;
}) {
  const plateTone = gaugeToneToPlateTone(gauge.tone);
  const ariaLabel =
    gauge.key === "present"
      ? `Attendance streak: ${gauge.valueLabel} days. Best this month: ${gauge.bestInMonth ?? 0}. ${gauge.secondary}. Open details.`
      : `${gauge.label}: ${gauge.valueLabel}. ${gauge.secondary}. Open details.`;
  return (
    <InstrumentPlate
      tone={plateTone}
      metric={gauge.valueLabel}
      shortLabel={statPlateShortLabel(gauge.key)}
      ariaLabel={ariaLabel}
      glyph={
        <StatPlateGlyph
          plateKey={gauge.key}
          ratio={gauge.ratio}
          segments={gauge.key === "present" ? gauge.streakSegments : undefined}
          className="h-full w-full"
        />
      }
      onClick={onOpen}
      layoutId={isOpen ? undefined : memberProfileGaugeLayoutId(gauge.key)}
    />
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
  const display = value?.trim() || "—";
  const empty = display === "—";

  return (
    <div
      className="flex items-center gap-2.5 py-2"
      role="group"
      aria-label={`${label}: ${display}`}
    >
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <p
        className={cn(
          "min-w-0 truncate text-sm",
          empty ? "text-muted-foreground" : "text-foreground",
        )}
        title={empty ? undefined : display}
      >
        {display}
      </p>
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
            <MemberProfileLeaveRangePicker
              triggerId="profile-period-custom-range"
              startDate={period.customFromDate}
              endDate={period.customToDate}
              emptyLabel="Select period dates"
              ariaLabel="Custom period date range"
              triggerClassName="h-9 min-h-9 w-auto max-w-[22rem] py-1.5 text-xs font-semibold"
              onRangeChange={(next) => {
                period.onCustomFromChange(next.startDate);
                period.onCustomToChange(next.endDate);
              }}
            />
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
                            aria-label="Edit contact details"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Edit contact details</TooltipContent>
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
                  icon={<Calendar className="size-4" />}
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
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              {profile.leaveGauges.map((gauge) => (
                <ProfileStatPlate
                  key={gauge.key}
                  gauge={gauge}
                  isOpen={viewModel.openGaugeKey === gauge.key}
                  onOpen={() => viewModel.openGauge(gauge.key)}
                />
              ))}
            </div>

            <MemberProfileAlertsPanel alerts={viewModel.alerts} />

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
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
                {profile.calendar.weekdayLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {profile.calendar.days.map((day) => {
                  const statusClass = calendarDayStatusClass(day.status, day.inMonth);
                  const statusSuffix = calendarDayStatusSuffix(day.status);
                  const dayButton = (
                    <button
                      type="button"
                      disabled={!day.inMonth}
                      className={cn(
                        "member-profile-cal-day grid place-items-center rounded-md text-xs tabular-nums",
                        "aspect-square w-full",
                        agencyFocusRingClass,
                        statusClass,
                        day.inMonth &&
                          day.status === "holiday" &&
                          "member-profile-cal-day--holiday",
                        day.inMonth &&
                          day.status === "weekend" &&
                          "member-profile-cal-day--weekend",
                      )}
                      onClick={
                        day.inMonth && !profile.canManageLeave
                          ? () => viewModel.focusDay(day.date)
                          : undefined
                      }
                      aria-label={`${day.date}${statusSuffix}`}
                    >
                      <span className="leading-none">{day.dayOfMonth}</span>
                      {day.inMonth && day.status === "holiday" ? (
                        <span
                          className="member-profile-cal-party pointer-events-none absolute end-0.5 top-0.5 grid size-3.5 place-items-center rounded-[4px] bg-chart-1/30 text-[0.45rem] leading-none"
                          aria-hidden
                        >
                          🎉
                        </span>
                      ) : null}
                    </button>
                  );

                  if (!day.inMonth || !profile.canManageLeave) {
                    return <div key={day.date}>{dayButton}</div>;
                  }

                  return (
                    <DropdownMenu key={day.date}>
                      <DropdownMenuTrigger asChild>{dayButton}</DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuItem
                          onSelect={() => viewModel.openOffDayRangeSelect(day.date)}
                        >
                          Select
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => viewModel.openAddOffDay(day.date)}>
                          Add off day
                        </DropdownMenuItem>
                        {(day.status === "leave" || day.status === "holiday") && day.leaveId ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => {
                                const leaveId = day.leaveId;
                                if (!leaveId) return;
                                viewModel.openRemoveLeave(leaveId, day.date);
                              }}
                            >
                              Remove off day
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })}
              </div>
              {profile.calendar.legend.some((item) => item.count > 0) ? (
                <div
                  className={cn(
                    agencyWorkMetaClass,
                    "mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-3",
                  )}
                  role="list"
                  aria-label={`${profile.calendar.label} summary`}
                >
                  {profile.calendar.legend
                    .filter((item) => item.count > 0)
                    .map((item) => (
                      <span
                        key={item.status}
                        role="listitem"
                        className="inline-flex items-center gap-1.5"
                        aria-label={calendarLegendAriaLabel(item.status, item.count, item.label)}
                      >
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            calendarLegendIndicatorClass(item.status),
                          )}
                          aria-hidden
                        />
                        <span className="font-mono tabular-nums text-foreground">{item.count}</span>
                        <span>{item.label}</span>
                      </span>
                    ))}
                </div>
              ) : null}
            </section>

            <AskOrchRailCard
              memberName={profile.userName}
              periodLabel={period.label}
              onAsk={viewModel.askOrchAboutMember}
            />
          </aside>
        </div>
      </div>

      <MemberProfileGaugeDetailDialog
        detail={viewModel.gaugeDetail}
        onClose={viewModel.closeGauge}
        onPrimaryAction={viewModel.runGaugePrimaryAction}
      />

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

      <Dialog
        open={viewModel.leaveRemoveTarget !== null}
        onOpenChange={(open) => {
          if (!open) viewModel.closeRemoveLeave();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove off day</DialogTitle>
            <DialogDescription>
              {viewModel.leaveRemoveTarget ? (
                <>
                  Remove {viewModel.leaveRemoveTarget.typeLabel} for{" "}
                  {viewModel.leaveRemoveTarget.rangeLabel}? Multi-day entries are removed as a
                  whole.
                </>
              ) : (
                "Remove this off day?"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => viewModel.closeRemoveLeave()}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={viewModel.leavePending}
              onClick={() => void viewModel.confirmRemoveLeave()}
            >
              {viewModel.leavePending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewModel.hrDialogOpen} onOpenChange={viewModel.setHrDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact & employment</DialogTitle>
            <DialogDescription>
              Light edits for day-to-day contact. Configure rates, tenure, and schedule in{" "}
              <a
                href="/agency/management/people"
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                People
              </a>
              .
            </DialogDescription>
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
