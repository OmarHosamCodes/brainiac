import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { shellFocusRingClass } from "@/features/app-shell/app-shell-ui";
import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import {
  agencySectionTitleClass,
  agencyWorkMetaClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import type { AgencyResourcingWorkloadViewModel } from "@/features/resourcing/hooks/use-agency-resourcing-workload";
import { shortDisplayName } from "@/features/resourcing/resourcing-team-presence";
import type { ResourcingPeriodGrain } from "@/features/resourcing/resourcing-workload-heat";
import { cn } from "@/lib/utils";
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

const GRAINS: Array<{ id: ResourcingPeriodGrain; label: string }> = [
  { id: "week", label: "Wk" },
  { id: "month", label: "Mo" },
  { id: "quarter", label: "Qtr" },
  { id: "year", label: "Yr" },
];

const LEAVE_TYPES = [
  { id: "pto" as const, label: "Paid time off" },
  { id: "other" as const, label: "Personal leave" },
  { id: "sick" as const, label: "Sick leave" },
  { id: "team_holiday" as const, label: "Team holiday" },
];

type AgencyResourcingWorkloadViewProps = {
  viewModel: AgencyResourcingWorkloadViewModel;
};

/** Compact leave range for agenda rows — handles same-day, same-month, and cross-month. */
export function formatAgendaRange(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const startLabel = start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (startDate === endDate) return startLabel;
  if (startDate.slice(0, 7) === endDate.slice(0, 7)) {
    return `${startLabel}–${end.getUTCDate()}`;
  }
  const endLabel = end.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}

function LegendSwatch({ tone }: { tone: "working" | "out" }) {
  return (
    <i
      className={cn("size-2 shrink-0 rounded-sm", tone === "working" ? "bg-success" : "bg-warning")}
      aria-hidden
    />
  );
}

export function AgencyResourcingWorkloadView({ viewModel }: AgencyResourcingWorkloadViewProps) {
  const {
    grain,
    periodTitle,
    focusMonthKey,
    focusMonthLabel,
    activityRows,
    calendarDays,
    weekdayLabels,
    filmstripDays,
    filmstripRangeLabel,
    selectedDate,
    selectedOut,
    selectedWorkingCount,
    coveragePct,
    briefingDayNumber,
    briefingWeekday,
    briefingHeadline,
    briefingSentence,
    selectedDayLabel,
    selectedDaySummary,
    agenda,
    selectedPersonId,
    selectedPerson,
    selectedPersonOutDays,
    selectedPersonMonthDays,
    memberCount,
    isPending,
    isError,
    errorMessage,
    leaveRequestOpen,
    leaveRequestPending,
    leaveRequestError,
    leaveRequestDraft,
    setGrain,
    goPrevPeriod,
    goNextPeriod,
    selectDate,
    isWeekendDate,
    selectPerson,
    openLeaveRequest,
    closeLeaveRequest,
    setLeaveRequestDraft,
    submitLeaveRequest,
    exportCsv,
    refetch,
  } = viewModel;

  const workingAngle = coveragePct * 3.6;

  return (
    <div className="flex w-full flex-col gap-4 pb-2">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(agencySectionTitleClass, "text-balance")}>Working overview</h1>
          <p className={cn(agencyWorkMetaClass, "mt-1 max-w-2xl text-pretty")}>
            Daily coverage, monthly presence, upcoming leave, and individual availability in one
            workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="border-default bg-muted/40 flex items-center gap-0.5 rounded-full border p-0.5"
            role="group"
            aria-label="Planning period"
          >
            {GRAINS.map((item) => {
              const active = item.id === grain;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setGrain(item.id)}
                  className={cn(
                    "min-h-9 min-w-9 rounded-full px-2.5 text-xs font-semibold transition-colors duration-150 ease-out",
                    shellFocusRingClass,
                    active
                      ? "bg-card text-highlighted shadow-sm"
                      : "text-muted hover:text-highlighted",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="border-default bg-card flex items-center gap-0.5 rounded-full border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Previous period"
              onClick={goPrevPeriod}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-highlighted min-w-[7.5rem] px-1 text-center text-sm font-semibold tabular-nums">
              {periodTitle}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              aria-label="Next period"
              onClick={goNextPeriod}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
            Export
          </Button>
          <Button type="button" size="sm" onClick={openLeaveRequest}>
            Request time off
          </Button>
        </div>
      </header>

      {isError ? (
        <div
          className="border-destructive/40 bg-destructive/5 text-foreground flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3"
          role="alert"
        >
          <AlertTriangle className="text-destructive size-4 shrink-0" />
          <p className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">Resourcing data is offline.</span> {errorMessage}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : null}

      {isPending ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Skeleton className="h-[28rem] w-full rounded-2xl" />
            <Skeleton className="h-[28rem] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <section
            className="border-default bg-card grid shrink-0 gap-4 rounded-2xl border px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex items-start gap-4 sm:items-center">
              <div className="border-default bg-muted/50 grid size-14 shrink-0 place-items-center rounded-xl border">
                <strong className="text-highlighted font-mono text-xl font-medium leading-none tabular-nums">
                  {briefingDayNumber}
                </strong>
                <span className="text-muted mt-1 text-[11px] font-semibold tracking-wide">
                  {briefingWeekday}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-highlighted text-lg font-semibold tracking-tight text-balance sm:text-xl">
                  {briefingHeadline}
                </h2>
                <p className={cn(agencyWorkMetaClass, "mt-1 text-pretty")}>{briefingSentence}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  selectedOut.length > 0
                    ? "bg-warning/15 text-warning"
                    : "bg-success/15 text-success",
                )}
              >
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                {selectedOut.length} out
              </span>
              <span className="bg-muted text-muted-foreground rounded-full px-3 py-1.5 font-mono text-xs font-medium tabular-nums">
                {coveragePct}% coverage
              </span>
            </div>
          </section>

          <div className="grid shrink-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-4">
              <section className="border-default bg-card overflow-hidden rounded-2xl border">
                <header className="border-default flex flex-wrap items-start gap-3 border-b px-4 py-3.5">
                  <div className="min-w-0">
                    <h2 className={agencyWorkTitleClass}>{focusMonthLabel} presence</h2>
                    <p className={agencyWorkMetaClass}>Select a day to update the workspace</p>
                  </div>
                  <div className={cn(agencyWorkMetaClass, "ms-auto flex items-center gap-4")}>
                    <span className="inline-flex items-center gap-1.5">
                      <LegendSwatch tone="working" />
                      Working
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <LegendSwatch tone="out" />
                      Out
                    </span>
                  </div>
                </header>
                <div
                  className="bg-muted/40 text-muted grid grid-cols-7 border-b border-border text-[11px] font-semibold"
                  aria-hidden
                >
                  {weekdayLabels.map((label) => (
                    <span key={label} className="px-2 py-2">
                      {label}
                    </span>
                  ))}
                </div>
                <div className="grid min-w-[40rem] grid-cols-7 sm:min-w-0">
                  {calendarDays.map((cell, index) => {
                    if (!cell.date || cell.dayOfMonth == null) {
                      return (
                        <div
                          key={`pad-${index}`}
                          className="bg-muted/30 min-h-[5.5rem] border-e border-b border-border p-2.5 [&:nth-child(7n)]:border-e-0"
                        />
                      );
                    }
                    const weekend = isWeekendDate(cell.date);
                    const selected = cell.date === selectedDate;
                    const workingPreview = cell.working.slice(0, 3);
                    const exception =
                      cell.out.length > 0
                        ? `${cell.out.map((person) => shortDisplayName(person.userName)).join(", ")} out`
                        : "Full team";
                    return (
                      <button
                        key={cell.date}
                        type="button"
                        disabled={weekend}
                        aria-pressed={selected}
                        aria-label={`${focusMonthLabel} ${cell.dayOfMonth}: ${cell.working.length} working, ${cell.out.length} out`}
                        onClick={() => selectDate(cell.date!)}
                        className={cn(
                          "relative min-h-[5.5rem] border-e border-b border-border p-2.5 text-start transition-colors duration-150 ease-out",
                          shellFocusRingClass,
                          "[&:nth-child(7n)]:border-e-0",
                          weekend
                            ? "bg-muted/35 text-muted cursor-default"
                            : "bg-card hover:bg-muted/40",
                          selected && !weekend && "z-[1] ring-primary ring-2 ring-inset",
                        )}
                      >
                        <span className="flex items-center justify-between font-mono text-xs font-medium tabular-nums">
                          <span>{cell.dayOfMonth}</span>
                          {!weekend ? (
                            <span className="text-muted">
                              {cell.working.length}/{memberCount || "–"}
                            </span>
                          ) : null}
                        </span>
                        {weekend ? (
                          <span className="text-muted mt-2 block text-xs">Weekend</span>
                        ) : (
                          <>
                            <span className="mt-2.5 flex ps-1">
                              {workingPreview.map((person) => (
                                <AgencyMemberAvatar
                                  key={person.userId}
                                  name={person.userName}
                                  userId={person.userId}
                                  className="border-card -ms-1 size-6 border-2 first:ms-0"
                                />
                              ))}
                            </span>
                            <span
                              className={cn(
                                "mt-2 block truncate text-xs",
                                cell.out.length > 0 ? "text-warning" : "text-muted",
                              )}
                            >
                              {exception}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="border-default bg-card overflow-hidden rounded-2xl border">
                <header className="border-default flex flex-wrap items-start gap-3 border-b px-4 py-3.5">
                  <div className="min-w-0">
                    <h2 className={agencyWorkTitleClass}>Daily capacity strip</h2>
                    <p className={agencyWorkMetaClass}>Two working weeks at a glance</p>
                  </div>
                  {filmstripRangeLabel ? (
                    <span className="text-muted ms-auto font-mono text-xs tabular-nums">
                      {filmstripRangeLabel}
                    </span>
                  ) : null}
                </header>
                {filmstripDays.length === 0 ? (
                  <p className={cn(agencyWorkMetaClass, "px-4 py-6")}>
                    Select a weekday to see nearby capacity.
                  </p>
                ) : (
                  <div className="bg-border grid auto-cols-[minmax(5.5rem,1fr)] grid-flow-col gap-px overflow-x-auto sm:grid-flow-row sm:grid-cols-10">
                    {filmstripDays.map((day) => {
                      const selected = day.date === selectedDate;
                      const heightPct =
                        day.memberCount > 0
                          ? Math.round((day.workingCount / day.memberCount) * 100)
                          : 0;
                      return (
                        <button
                          key={day.date}
                          type="button"
                          aria-pressed={selected}
                          aria-label={`${day.weekdayShort} ${day.dayOfMonth}: ${day.workingCount} working`}
                          onClick={() => selectDate(day.date)}
                          className={cn(
                            "bg-card flex min-h-36 flex-col items-center px-2 py-3 transition-colors duration-150 ease-out",
                            shellFocusRingClass,
                            selected
                              ? "bg-muted/50 shadow-[inset_0_-2px_0_0_var(--color-primary)]"
                              : "hover:bg-muted/30",
                          )}
                        >
                          <span className="text-muted text-[11px] font-semibold tracking-wide">
                            {day.weekdayShort}
                          </span>
                          <strong className="text-highlighted mt-0.5 font-mono text-xs font-medium tabular-nums">
                            {day.dayOfMonth}
                          </strong>
                          <span
                            className="bg-muted mt-3 flex h-16 w-6 items-end overflow-hidden rounded-t-md rounded-b-sm"
                            aria-hidden
                          >
                            <span
                              className="bg-foreground w-full rounded-t-[5px] rounded-b-sm transition-[height] duration-200 ease-out motion-reduce:transition-none"
                              style={{ height: `${heightPct}%` }}
                            />
                          </span>
                          <small className="text-muted mt-2 text-xs">
                            {day.workingCount} working
                          </small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <aside
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"
              aria-label="Selected day and upcoming absence details"
            >
              <section className="border-default bg-card rounded-2xl border p-4">
                <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[7.25rem_minmax(0,1fr)]">
                  <div
                    className="relative grid size-[6.5rem] place-items-center rounded-full sm:size-[7.25rem]"
                    style={{
                      background: `conic-gradient(var(--color-success) 0 ${workingAngle}deg, var(--color-warning) ${workingAngle}deg 360deg)`,
                    }}
                    role="img"
                    aria-label={`${selectedWorkingCount} of ${memberCount} people working`}
                  >
                    <div className="bg-card absolute inset-4 rounded-full sm:inset-[17px]" />
                    <div className="relative text-center">
                      <strong className="text-highlighted block font-mono text-2xl font-medium leading-none tabular-nums">
                        {selectedWorkingCount}
                      </strong>
                      <span className="text-muted text-xs">of {memberCount}</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h2 className={agencyWorkTitleClass}>{selectedDayLabel}</h2>
                    <p className={cn(agencyWorkMetaClass, "mt-1")}>{selectedDaySummary}</p>
                  </div>
                </div>
                <div className="border-default mt-4 border-t">
                  {selectedOut.length === 0 ? (
                    <div className="bg-muted/50 mt-3.5 rounded-xl px-3.5 py-3 text-xs text-muted">
                      <strong className="text-foreground">No one is out.</strong>
                      <br />
                      Full-team coverage for this day.
                    </div>
                  ) : (
                    selectedOut.map((person) => (
                      <div
                        key={person.userId}
                        className="border-default flex items-center gap-2.5 border-b py-2.5 last:border-b-0"
                      >
                        <AgencyMemberAvatar
                          name={person.userName}
                          userId={person.userId}
                          className="size-7"
                        />
                        <span className="min-w-0">
                          <strong className="text-highlighted block truncate text-xs font-semibold">
                            {person.userName}
                          </strong>
                          <small className="text-muted text-xs">
                            {person.leaveReason ?? person.leaveType}
                          </small>
                        </span>
                        <span className="bg-warning/15 text-warning ms-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold">
                          <span className="size-1.5 rounded-full bg-current" aria-hidden />
                          Out
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="border-default bg-card overflow-hidden rounded-2xl border">
                <header className="border-default border-b px-4 py-3.5">
                  <h2 className={agencyWorkTitleClass}>Upcoming absence agenda</h2>
                  <p className={agencyWorkMetaClass}>Next exceptions needing coverage</p>
                </header>
                <div className="px-4 py-1">
                  {agenda.length === 0 ? (
                    <p className={cn(agencyWorkMetaClass, "py-4")}>
                      No upcoming leave in this window.
                    </p>
                  ) : (
                    agenda.map((item) => (
                      <div
                        key={item.id}
                        className="border-default grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b py-3 last:border-b-0"
                      >
                        <span className="min-w-0">
                          <strong className="text-highlighted block truncate text-xs font-semibold">
                            {item.userName}
                          </strong>
                          <small className="text-muted block text-xs">
                            {item.type}
                            <span className="text-muted/80">
                              {" "}
                              · {formatAgendaRange(item.startDate, item.endDate)}
                            </span>
                          </small>
                        </span>
                        <span className="text-muted shrink-0 font-mono text-xs font-medium tabular-nums">
                          {item.daySpan} {item.daySpan === 1 ? "day" : "days"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>

          <section className="border-default bg-card shrink-0 overflow-hidden rounded-2xl border">
            <header className="border-default border-b px-4 py-3.5">
              <h2 className={agencyWorkTitleClass}>Person availability</h2>
              <p className={agencyWorkMetaClass}>
                Select a teammate to inspect their month without leaving the team view
              </p>
            </header>
            <div
              className="bg-muted/40 border-default flex gap-2 overflow-x-auto border-b px-4 py-3"
              aria-label="Select team member"
            >
              {activityRows.map((row) => {
                const active = row.userId === selectedPersonId;
                const hasLeave = row.heatMap.days.some(
                  (day) => day.date.startsWith(focusMonthKey) && day.off,
                );
                return (
                  <button
                    key={row.userId}
                    type="button"
                    aria-pressed={active}
                    aria-label={`View ${row.userName}`}
                    title={row.userName}
                    onClick={() => selectPerson(row.userId)}
                    className={cn(
                      "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-0.5 transition-shadow duration-150 ease-out",
                      shellFocusRingClass,
                      active && "ring-primary ring-2",
                    )}
                  >
                    <AgencyMemberAvatar
                      name={row.userName}
                      userId={row.userId}
                      size="md"
                      className={cn(hasLeave && "ring-warning/50 ring-1")}
                    />
                  </button>
                );
              })}
            </div>
            {selectedPerson ? (
              <div className="grid items-start gap-5 p-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-center">
                <div className="flex items-center gap-2.5">
                  <AgencyMemberAvatar
                    name={selectedPerson.userName}
                    userId={selectedPerson.userId}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h3 className="text-highlighted truncate text-sm font-semibold">
                      {selectedPerson.userName}
                    </h3>
                    <p className={agencyWorkMetaClass}>
                      {selectedPersonOutDays} {selectedPersonOutDays === 1 ? "day" : "days"} out
                      this month
                    </p>
                  </div>
                </div>
                <div
                  className="grid grid-cols-7 gap-1.5 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))]"
                  aria-label={`${selectedPerson.userName} ${focusMonthLabel} availability`}
                >
                  {selectedPersonMonthDays.map((day) => (
                    <span
                      key={day.date}
                      className={cn(
                        "border-default text-muted grid aspect-square min-h-7 place-items-center rounded-md border font-mono text-[11px] font-medium tabular-nums",
                        day.off && "border-warning/50 bg-warning/15 text-foreground",
                      )}
                      aria-label={`${day.date}: ${day.off ? day.off.type : "working"}`}
                      title={day.off ? (day.off.reason ?? day.off.type) : "Working"}
                    >
                      {Number(day.date.slice(8, 10))}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className={cn(agencyWorkMetaClass, "p-4")}>No teammates in this period.</p>
            )}
          </section>
        </>
      )}

      <Dialog
        open={leaveRequestOpen}
        onOpenChange={(open) => {
          if (open) openLeaveRequest();
          else closeLeaveRequest();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogDescription className="text-muted text-xs font-semibold tracking-wide uppercase">
              Resourcing request
            </DialogDescription>
            <DialogTitle>Request time off</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitLeaveRequest();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="resourcing-leave-member">Team member</Label>
              <select
                id="resourcing-leave-member"
                className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                value={leaveRequestDraft.userId}
                onChange={(event) => setLeaveRequestDraft({ userId: event.target.value })}
                required
              >
                {activityRows.map((row) => (
                  <option key={row.userId} value={row.userId}>
                    {row.userName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="resourcing-leave-start">Start date</Label>
                <Input
                  id="resourcing-leave-start"
                  type="date"
                  value={leaveRequestDraft.startDate}
                  onChange={(event) => setLeaveRequestDraft({ startDate: event.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="resourcing-leave-end">End date</Label>
                <Input
                  id="resourcing-leave-end"
                  type="date"
                  value={leaveRequestDraft.endDate}
                  onChange={(event) => setLeaveRequestDraft({ endDate: event.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resourcing-leave-type">Leave type</Label>
              <select
                id="resourcing-leave-type"
                className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                value={leaveRequestDraft.type}
                onChange={(event) =>
                  setLeaveRequestDraft({
                    type: event.target.value as (typeof LEAVE_TYPES)[number]["id"] | "",
                  })
                }
                required
              >
                <option value="">Select a type</option>
                {LEAVE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="resourcing-leave-note">
                Note <span className="text-muted font-normal">optional</span>
              </Label>
              <Textarea
                id="resourcing-leave-note"
                value={leaveRequestDraft.reason}
                onChange={(event) => setLeaveRequestDraft({ reason: event.target.value })}
                placeholder="Coverage or handoff details"
              />
            </div>
            {leaveRequestError ? (
              <p className="text-destructive text-sm" role="alert">
                {leaveRequestError}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeLeaveRequest}>
                Cancel
              </Button>
              <Button type="submit" disabled={leaveRequestPending}>
                {leaveRequestPending ? "Submitting…" : "Submit request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
