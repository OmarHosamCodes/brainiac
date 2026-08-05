import { DEFAULT_WORK_SCHEDULE } from "@orch/api/routers/agency-ops/resourcing/work-schedule";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { RangePreset } from "@/features/dashboard/agency-dashboard-command-bar";
import {
  useMemberProfileAlerts,
  type MemberProfileAlertsViewModel,
} from "@/features/member-profile/hooks/use-member-profile-alerts";
import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
import type { AlertPeriodTarget } from "@/features/member-profile/member-profile-alert-period";
import {
  resolveMemberProfileHeatLayout,
  type MemberProfileHeatLayout,
} from "@/features/member-profile/member-profile-heat-layout";
import {
  resolveAgencyRangeFromPreset,
  startOfWeekUtc,
  toDateInputValue,
} from "@/features/shared/use-agency-time-range-filters";
import {
  getCurrentTenurePeriodRange,
  getCurrentTenureQuarterMonths,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
  type TenureQuarterMonth,
} from "@/features/resourcing/tenure-utils";
import { useCurrentAgencyTeam } from "@/features/time-tracking/stores/agency-timer";
import { useTeamStore } from "@/features/team/team-store";
import { authClient } from "@/lib/auth-client";
import { getServerUrl } from "@/lib/env";
import { orpc } from "@/lib/orpc";
import { getUserAvatarPublicUrl } from "@/lib/user-avatar-url";
import { formatDuration } from "@/lib/utils/format-duration";

type LeaveType = "pto" | "sick" | "team_holiday" | "other";
type EmploymentType = "full_time" | "part_time" | "contractor" | "intern";
type WorkModel = "onsite" | "hybrid" | "remote";

export type AgencyMemberProfileViewModel = {
  teamId: string;
  subjectUserId: string;
  loading: boolean;
  error: string | null;
  period: {
    rangePreset: RangePreset;
    onRangePresetChange: (preset: RangePreset) => void;
    customFromDate: string;
    onCustomFromChange: (value: string) => void;
    customToDate: string;
    onCustomToChange: (value: string) => void;
    tenureAvailable: boolean;
    tenurePeriodLabel: string | null;
    tenureQuarterLabel: string | null;
    tenureQuarterMonths: TenureQuarterMonth[];
    tenureMonthIndexes: number[];
    onTenureMonthIndexesChange: (monthIndexes: number[]) => void;
    label: string;
  };
  profile: {
    userName: string;
    userAvatarUrl: string | null;
    email: string;
    role: string;
    roleLabel: string;
    joinedAtLabel: string;
    isSelf: boolean;
    canAddReview: boolean;
    canManageLeave: boolean;
    canEditHr: boolean;
    periodHoursLabel: string;
    weekHoursTotalLabel: string;
    heatLayout: MemberProfileHeatLayout;
    heatMap: {
      startDate: string;
      endDate: string;
      days: Array<{
        date: string;
        totalSeconds: number;
        intensity: number;
        off: {
          leaveId: string;
          type: LeaveType;
          reason: string | null;
          rangeStart: string;
          rangeEnd: string;
        } | null;
        offBand: "single" | "start" | "middle" | "end" | null;
        hoursLabel: string;
        dayOfMonthLabel: string;
      }>;
    };
    leaveSummary: string;
    hr: {
      status: "active" | "inactive";
      statusLabel: string;
      departmentId: string | null;
      departmentName: string | null;
      employmentType: EmploymentType | null;
      employmentTypeLabel: string | null;
      workModel: WorkModel | null;
      workModelLabel: string | null;
      gender: string | null;
      dateOfBirthLabel: string | null;
      phone: string | null;
      address: string | null;
      linkedinUrl: string | null;
      xUrl: string | null;
      instagramUrl: string | null;
      offAllowanceDays: number;
      leaveAllowancePeriod: "year" | "quarter" | "month";
    };
    departments: Array<{ id: string; name: string }>;
    leaveGauges: Array<{
      key: "leaves" | "period" | "present" | "waste";
      label: string;
      valueLabel: string;
      secondary: string;
      ratio: number;
      tone: "success" | "warning" | "foreground";
    }>;
    weekHours: Array<{
      date: string;
      weekdayLabel: string;
      totalSeconds: number;
      hoursLabel: string;
      heightPct: number;
    }>;
    calendar: {
      label: string;
      weekdayLabels: string[];
      days: Array<{
        date: string;
        dayOfMonth: number;
        inMonth: boolean;
        status: "present" | "leave" | "empty";
      }>;
      legend: Array<{ status: "present" | "leave" | "empty"; label: string; count: number }>;
      onPrevMonth: () => void;
      onNextMonth: () => void;
    };
    timeline: Array<{
      date: string;
      title: string;
      subtitle: string;
      countLabel: string;
      open: boolean;
      items: Array<
        | {
            kind: "review";
            id: string;
            body: string;
            authorName: string;
            authorAvatarUrl: string | null;
            timeLabel: string;
          }
        | {
            kind: "activity";
            id: string;
            eventType: "time_logged" | "waste_marked" | "leave";
            kindLabel: string;
            title: string;
            body: string | null;
            meta: string | null;
            timeLabel: string;
            durationLabel: string | null;
            durationSeconds: number | null;
            projectId: string | null;
            projectName: string | null;
            taskId: string | null;
            taskTitle: string | null;
            clientId: string | null;
            clientName: string | null;
            description: string | null;
            isWaste: boolean;
            taskIsWaste: boolean | null;
            startedAt: string | null;
            endedAt: string | null;
            teamId: string | null;
            userId: string | null;
            userName: string | null;
            source: "timer" | "manual" | null;
            isBillable: boolean | null;
          }
      >;
    }>;
  } | null;
  leaveDialogOpen: boolean;
  reviewDialogOpen: boolean;
  hrDialogOpen: boolean;
  offDayRangeSelect: { startDate: string; endDate: string } | null;
  leavePending: boolean;
  reviewPending: boolean;
  hrPending: boolean;
  leaveDraft: {
    startDate: string;
    endDate: string;
    type: LeaveType;
    reason: string;
    teamWide: boolean;
  };
  reviewDraft: { reviewDate: string; body: string };
  hrDraft: {
    status: "active" | "inactive";
    departmentId: string;
    employmentType: EmploymentType | "";
    workModel: WorkModel | "";
    gender: string;
    dateOfBirth: string;
    phone: string;
    address: string;
  };
  alerts: MemberProfileAlertsViewModel;
  setLeaveDialogOpen: (open: boolean) => void;
  setReviewDialogOpen: (open: boolean) => void;
  setHrDialogOpen: (open: boolean) => void;
  openOffDayRangeSelect: (startDate: string) => void;
  closeOffDayRangeSelect: () => void;
  confirmOffDayRangeSelect: (next: { startDate: string; endDate: string }) => void;
  openAddOffDay: (date: string) => void;
  openAddOffDayDialog: () => void;
  setLeaveDraft: (patch: Partial<AgencyMemberProfileViewModel["leaveDraft"]>) => void;
  setReviewDraft: (patch: Partial<AgencyMemberProfileViewModel["reviewDraft"]>) => void;
  setHrDraft: (patch: Partial<AgencyMemberProfileViewModel["hrDraft"]>) => void;
  toggleDay: (date: string) => void;
  focusDay: (date: string) => void;
  /** Activity day briefly shimmer-highlighted after an alert period jump. */
  highlightedActivityDate: string | null;
  retry: () => void;
  submitLeave: () => Promise<void>;
  submitReview: () => Promise<void>;
  submitHr: () => Promise<void>;
};

function todayKey(utcOffsetMinutes: number) {
  const localMs = Date.now() - utcOffsetMinutes * 60_000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftMonthKey(monthKey: string, delta: -1 | 1): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const date = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1 + delta, 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatDayParts(dateKey: string, today: string): { title: string; subtitle: string } {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  const weekday = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (dateKey === today) return { title: "Today", subtitle: weekday };
  const yesterday = new Date(`${today}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  if (dateKey === yKey) return { title: "Yesterday", subtitle: weekday };
  return {
    title: weekday,
    subtitle: date.toLocaleDateString(undefined, { year: "numeric", timeZone: "UTC" }),
  };
}

function activityKindLabel(eventType: "time_logged" | "waste_marked" | "leave") {
  switch (eventType) {
    case "time_logged":
      return "Activity";
    case "waste_marked":
      return "Waste";
    case "leave":
      return "Off day";
    default: {
      const _exhaustive: never = eventType;
      return _exhaustive;
    }
  }
}

function shortHours(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Editor";
    case "viewer":
      return "Viewer";
    default:
      return role;
  }
}

function employmentTypeLabel(value: EmploymentType | null) {
  switch (value) {
    case "full_time":
      return "Full-time";
    case "part_time":
      return "Part-time";
    case "contractor":
      return "Contractor";
    case "intern":
      return "Intern";
    case null:
      return null;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function workModelLabel(value: WorkModel | null) {
  switch (value) {
    case "onsite":
      return "Onsite";
    case "hybrid":
      return "Hybrid";
    case "remote":
      return "Remote";
    case null:
      return null;
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function normalizeGenderDraft(value: string | null | undefined): string {
  const key = value?.trim().toLowerCase() ?? "";
  if (key === "male" || key === "female") return key;
  return "";
}

function genderDisplayLabel(value: string | null): string | null {
  switch (normalizeGenderDraft(value)) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    default:
      return value?.trim() || null;
  }
}

function emptyHrDraft(): AgencyMemberProfileViewModel["hrDraft"] {
  return {
    status: "active",
    departmentId: "",
    employmentType: "",
    workModel: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    address: "",
  };
}

function rangePresetDisplayLabel(
  preset: RangePreset,
  tenurePeriodLabel: string | null,
  customFrom: string,
  customTo: string,
): string {
  switch (preset) {
    case "tenure":
      return tenurePeriodLabel?.trim() || "Tenure";
    case "today":
      return "Today";
    case "week":
      return "This week";
    case "month":
      return "This month";
    case "last30":
      return "Last 30 days";
    case "custom":
      return customFrom && customTo ? `${customFrom} → ${customTo}` : "Custom";
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export function useAgencyMemberProfile(subjectUserId: string): AgencyMemberProfileViewModel {
  const session = authClient.useSession();
  const { currentAgencyTeamId } = useCurrentAgencyTeam();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const teamId = currentAgencyTeamId || selectedTeamId || "";
  const utcOffsetMinutes = new Date().getTimezoneOffset();
  const today = todayKey(utcOffsetMinutes);
  const queryClient = useQueryClient();
  const store = useAgencyMemberProfileStore();
  const now = useMemo(() => new Date(), []);

  const tenurePolicyQuery = useQuery({
    ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const tenurePolicy = tenurePolicyQuery.data?.policy ?? null;
  const defaultRangePreset = useMemo(
    () => resolveDefaultDashboardRangePreset(tenurePolicy),
    [tenurePolicy],
  );
  const defaultTenureMonthIndexes = useMemo(
    () => resolveDefaultTenureMonthIndexes(tenurePolicy, now),
    [now, tenurePolicy],
  );
  const tenureQuarterMonths = useMemo(
    () => getCurrentTenureQuarterMonths(tenurePolicy, now) ?? [],
    [now, tenurePolicy],
  );

  const [rangePreset, setRangePreset] = useState<RangePreset | null>(null);
  const effectiveRangePreset = rangePreset ?? defaultRangePreset;
  const weekStartsOn = tenurePolicy?.weekStartsOn ?? DEFAULT_WORK_SCHEDULE.weekStartsOn;
  const [customFromDate, setCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc(weekStartsOn)),
  );
  const [customToDate, setCustomToDate] = useState(toDateInputValue(now));
  const [tenureMonthIndexes, setTenureMonthIndexes] = useState<number[] | null>(null);
  const effectiveTenureMonthIndexes = tenureMonthIndexes ?? defaultTenureMonthIndexes;

  const tenurePeriodLabel = useMemo(
    () =>
      getCurrentTenurePeriodRange(tenurePolicy, now, effectiveTenureMonthIndexes)?.simpleLabel ??
      null,
    [effectiveTenureMonthIndexes, now, tenurePolicy],
  );
  const tenureQuarterLabel = useMemo(
    () => getCurrentTenurePeriodRange(tenurePolicy, now)?.simpleLabel ?? null,
    [now, tenurePolicy],
  );

  const range = useMemo(
    () =>
      resolveAgencyRangeFromPreset(
        effectiveRangePreset,
        customFromDate,
        customToDate,
        tenurePolicy,
        now,
        effectiveTenureMonthIndexes,
        weekStartsOn,
      ),
    [
      customFromDate,
      customToDate,
      effectiveRangePreset,
      effectiveTenureMonthIndexes,
      now,
      tenurePolicy,
      weekStartsOn,
    ],
  );

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ [today]: true });
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [hrDialogOpen, setHrDialogOpen] = useState(false);
  const [offDayRangeSelect, setOffDayRangeSelect] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [leaveDraft, setLeaveDraftState] = useState({
    startDate: today,
    endDate: today,
    type: "pto" as LeaveType,
    reason: "",
    teamWide: false,
  });
  const [reviewDraft, setReviewDraftState] = useState({
    reviewDate: today,
    body: "",
  });
  const [hrDraft, setHrDraftState] = useState(emptyHrDraft);
  const [calendarMonthOverride, setCalendarMonthOverride] = useState<string | null>(null);
  const pendingFocusDateRef = useRef<string | null>(null);
  const [highlightedActivityDate, setHighlightedActivityDate] = useState<string | null>(null);

  const defaultCalendarMonth = range.to.slice(0, 7);
  const calendarMonth = calendarMonthOverride ?? defaultCalendarMonth;

  useEffect(() => {
    setCalendarMonthOverride(null);
  }, [range.from, range.to]);

  const profileQueryInput = useMemo(
    () => ({
      teamId,
      userId: subjectUserId,
      utcOffsetMinutes,
      from: range.from,
      to: range.to,
      calendarMonth,
    }),
    [calendarMonth, range.from, range.to, subjectUserId, teamId, utcOffsetMinutes],
  );

  const profileQuery = useQuery({
    ...orpc.agencyOps.memberProfile.get.queryOptions({
      input: profileQueryInput,
    }),
    enabled: Boolean(teamId && subjectUserId && session.data?.user),
    placeholderData: keepPreviousData,
  });

  const departmentsQuery = useQuery({
    ...orpc.agencyOps.departments.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId && session.data?.user),
  });

  const rangeStartKey = range.from.slice(0, 10);
  const rangeEndKey = range.to.slice(0, 10);

  function scrollToActivityDay(date: string) {
    setExpandedDays((prev) => ({ ...prev, [date]: true }));
    const el = document.getElementById(`member-profile-day-${date}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function shimmerActivityDay(date: string) {
    scrollToActivityDay(date);
    // Drop then re-set so a repeat jump restarts the CSS animation.
    setHighlightedActivityDate(null);
    requestAnimationFrame(() => setHighlightedActivityDate(date));
  }

  function openAlertPeriod(target: AlertPeriodTarget) {
    const focusDate = target.kind === "day" ? target.dateKey : target.focusDate;
    const alreadyOnTargetPeriod =
      effectiveRangePreset === "custom" &&
      target.from === rangeStartKey &&
      target.to === rangeEndKey;
    const dayMounted = Boolean(document.getElementById(`member-profile-day-${focusDate}`));

    // Snap the profile period to the alert window so the day's entries load even when
    // the current preset omits that date from the timeline.
    if (alreadyOnTargetPeriod && dayMounted) {
      shimmerActivityDay(focusDate);
      return;
    }

    setRangePreset("custom");
    setCustomFromDate(target.from);
    setCustomToDate(target.to);
    setCalendarMonthOverride(focusDate.slice(0, 7));
    pendingFocusDateRef.current = focusDate;
  }

  const alerts = useMemberProfileAlerts({
    teamId,
    subjectUserId,
    utcOffsetMinutes,
    onOpenPeriod: openAlertPeriod,
  });

  useEffect(() => {
    const date = pendingFocusDateRef.current;
    if (!date || profileQuery.isFetching || profileQuery.isPending) return;
    const timeline = profileQuery.data?.timeline ?? [];
    const focusDate = timeline.some((day) => day.date === date)
      ? date
      : (timeline[0]?.date ?? null);
    if (!focusDate) return;
    pendingFocusDateRef.current = null;
    // Defer one frame so the activity rails mount after period data swaps.
    requestAnimationFrame(() => shimmerActivityDay(focusDate));
  }, [profileQuery.data, profileQuery.isFetching, profileQuery.isPending, range.from, range.to]);

  useEffect(() => {
    if (!highlightedActivityDate) return;
    const clearHandle = window.setTimeout(() => {
      setHighlightedActivityDate(null);
    }, 2400);
    return () => window.clearTimeout(clearHandle);
  }, [highlightedActivityDate]);

  const invalidate = useMutation({
    mutationFn: async () => undefined,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.memberProfile.get.key(),
      });
      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.departments.list.key({ input: { teamId } }),
      });
      alerts.refetch();
    },
  });

  const serverUrl = getServerUrl();
  const periodLabel = rangePresetDisplayLabel(
    effectiveRangePreset,
    tenurePeriodLabel,
    customFromDate,
    customToDate,
  );

  const profile = useMemo(() => {
    const data = profileQuery.data;
    if (!data) return null;

    const avatarUrl =
      data.userAvatar && serverUrl
        ? getUserAvatarPublicUrl({
            baseUrl: serverUrl,
            userId: data.userId,
            storageKey: data.userAvatar,
          })
        : null;

    const joined = new Date(data.joinedAt);
    const joinedAtLabel = Number.isNaN(joined.getTime())
      ? "—"
      : joined.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

    const leaveSummary =
      data.leave.length === 0
        ? "No off days in this period"
        : `${data.leave.length} off-day range${data.leave.length === 1 ? "" : "s"}`;

    const heatLayout = resolveMemberProfileHeatLayout(
      effectiveRangePreset,
      effectiveTenureMonthIndexes,
      data.heatMap.startDate,
      data.heatMap.endDate,
    );

    const maxWeekSeconds = Math.max(1, ...data.weekHours.map((day) => day.totalSeconds));
    const weekHoursTotalSeconds = data.weekHours.reduce((sum, day) => sum + day.totalSeconds, 0);

    const calendarLegendCounts = { present: 0, leave: 0, empty: 0 };
    let daysInMonth = 0;
    for (const day of data.calendarMonth.days) {
      if (!day.inMonth) continue;
      daysInMonth += 1;
      calendarLegendCounts[day.status] += 1;
    }

    const leaveAll = data.leaveBalances.all;
    const leaveGauges = [
      {
        key: "leaves" as const,
        label: "Off days",
        valueLabel: `${leaveAll.usedDays}/${leaveAll.allowanceDays}`,
        secondary: data.leaveBalances.period.label,
        ratio:
          leaveAll.allowanceDays <= 0
            ? 0
            : Math.min(1, leaveAll.usedDays / Math.max(leaveAll.allowanceDays, 1)),
        tone: "success" as const,
      },
      {
        key: "period" as const,
        label: "Period hours",
        valueLabel: shortHours(data.periodTotalSeconds),
        secondary: periodLabel,
        ratio: 0,
        tone: "foreground" as const,
      },
      {
        key: "present" as const,
        label: "Present",
        valueLabel: `${calendarLegendCounts.present}/${daysInMonth}`,
        secondary: data.calendarMonth.label,
        ratio: daysInMonth <= 0 ? 0 : calendarLegendCounts.present / daysInMonth,
        tone: "success" as const,
      },
      {
        key: "waste" as const,
        label: "Waste",
        valueLabel: shortHours(data.periodWasteSeconds),
        secondary: "this period",
        ratio:
          data.periodTotalSeconds <= 0
            ? 0
            : Math.min(1, data.periodWasteSeconds / data.periodTotalSeconds),
        tone: "warning" as const,
      },
    ];

    const dob = data.hrProfile.dateOfBirth
      ? new Date(`${data.hrProfile.dateOfBirth}T12:00:00.000Z`)
      : null;

    return {
      userName: data.userName,
      userAvatarUrl: avatarUrl,
      email: data.email,
      role: data.role,
      roleLabel: roleLabel(data.role),
      joinedAtLabel,
      isSelf: data.isSelf,
      canAddReview: data.canAddReview,
      canManageLeave: data.canManageLeave,
      canEditHr: data.canEditHr,
      periodHoursLabel: shortHours(data.periodTotalSeconds),
      weekHoursTotalLabel: shortHours(weekHoursTotalSeconds),
      heatLayout,
      heatMap: {
        startDate: data.heatMap.startDate,
        endDate: data.heatMap.endDate,
        days: data.heatMap.days.map((day, index, all) => {
          let offBand: "single" | "start" | "middle" | "end" | null = null;
          if (day.off) {
            const hasPrev = Boolean(all[index - 1]?.off);
            const hasNext = Boolean(all[index + 1]?.off);
            if (!hasPrev && !hasNext) offBand = "single";
            else if (!hasPrev && hasNext) offBand = "start";
            else if (hasPrev && hasNext) offBand = "middle";
            else offBand = "end";
          }
          return {
            ...day,
            hoursLabel: shortHours(day.totalSeconds),
            dayOfMonthLabel: String(Number(day.date.slice(8, 10))),
            offBand,
          };
        }),
      },
      leaveSummary,
      hr: {
        status: data.hrProfile.status,
        statusLabel: data.hrProfile.status === "active" ? "Active" : "Inactive",
        departmentId: data.hrProfile.departmentId,
        departmentName: data.hrProfile.departmentName,
        employmentType: data.hrProfile.employmentType,
        employmentTypeLabel: employmentTypeLabel(data.hrProfile.employmentType),
        workModel: data.hrProfile.workModel,
        workModelLabel: workModelLabel(data.hrProfile.workModel),
        gender: genderDisplayLabel(data.hrProfile.gender),
        dateOfBirthLabel:
          dob && !Number.isNaN(dob.getTime())
            ? dob.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })
            : null,
        phone: data.hrProfile.phone,
        address: data.hrProfile.address,
        linkedinUrl: data.hrProfile.linkedinUrl,
        xUrl: data.hrProfile.xUrl,
        instagramUrl: data.hrProfile.instagramUrl,
        offAllowanceDays: data.hrProfile.offAllowanceDays,
        leaveAllowancePeriod: data.hrProfile.leaveAllowancePeriod,
      },
      departments: (departmentsQuery.data?.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
      })),
      leaveGauges,
      weekHours: data.weekHours.map((day) => ({
        date: day.date,
        weekdayLabel: day.weekdayLabel,
        totalSeconds: day.totalSeconds,
        hoursLabel: shortHours(day.totalSeconds),
        heightPct: Math.round((day.totalSeconds / maxWeekSeconds) * 100),
      })),
      calendar: {
        label: data.calendarMonth.label,
        weekdayLabels: data.calendarMonth.weekdayLabels,
        days: data.calendarMonth.days,
        legend: [
          { status: "present" as const, label: "Present", count: calendarLegendCounts.present },
          { status: "leave" as const, label: "Off days", count: calendarLegendCounts.leave },
          { status: "empty" as const, label: "No time", count: calendarLegendCounts.empty },
        ],
        onPrevMonth: () => setCalendarMonthOverride(shiftMonthKey(calendarMonth, -1)),
        onNextMonth: () => setCalendarMonthOverride(shiftMonthKey(calendarMonth, 1)),
      },
      timeline: data.timeline.map((day, index) => {
        const defaultOpen =
          day.date === today ||
          (expandedDays[day.date] === undefined &&
            !data.timeline.some((entry) => entry.date === today) &&
            index === 0);
        const parts = formatDayParts(day.date, today);
        const countLabel = `${day.items.length} event${day.items.length === 1 ? "" : "s"}`;

        return {
          date: day.date,
          title: parts.title,
          subtitle: parts.subtitle,
          countLabel,
          open: expandedDays[day.date] ?? defaultOpen,
          items: day.items.map((item) => {
            if (item.kind === "review") {
              const authorAvatarUrl =
                item.authorAvatar && serverUrl
                  ? getUserAvatarPublicUrl({
                      baseUrl: serverUrl,
                      userId: item.authorUserId,
                      storageKey: item.authorAvatar,
                    })
                  : null;
              return {
                kind: "review" as const,
                id: item.id,
                body: item.body,
                authorName: item.authorName,
                authorAvatarUrl,
                timeLabel: new Date(item.createdAt).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              };
            }
            return {
              kind: "activity" as const,
              id: item.id,
              eventType: item.eventType,
              kindLabel: activityKindLabel(item.eventType),
              title: item.title,
              body: item.body,
              meta: item.meta,
              timeLabel: new Date(item.startedAt ?? item.createdAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              }),
              durationLabel:
                item.durationSeconds == null ? null : formatDuration(item.durationSeconds, "clock"),
              durationSeconds: item.durationSeconds,
              projectId: item.projectId,
              projectName: item.projectName,
              taskId: item.taskId,
              taskTitle: item.taskTitle,
              clientId: item.clientId,
              clientName: item.clientName,
              description: item.description,
              isWaste: item.isWaste,
              taskIsWaste: item.taskIsWaste,
              startedAt: item.startedAt,
              endedAt: item.endedAt,
              teamId: item.teamId,
              userId: item.userId,
              userName: item.userName,
              source: item.source,
              isBillable: item.isBillable,
            };
          }),
        };
      }),
    };
  }, [
    calendarMonth,
    departmentsQuery.data?.items,
    effectiveRangePreset,
    effectiveTenureMonthIndexes,
    expandedDays,
    periodLabel,
    profileQuery.data,
    serverUrl,
    today,
  ]);

  // Keep leave/review drafts inside the selected period when the range changes.
  const clampedDefaultDate =
    today < rangeStartKey ? rangeStartKey : today > rangeEndKey ? rangeEndKey : today;

  return {
    teamId,
    subjectUserId,
    loading: profileQuery.isPending || tenurePolicyQuery.isPending,
    error: profileQuery.error
      ? profileQuery.error instanceof Error
        ? profileQuery.error.message
        : "Couldn't load profile"
      : store.error,
    period: {
      rangePreset: effectiveRangePreset,
      onRangePresetChange: setRangePreset,
      customFromDate,
      onCustomFromChange: setCustomFromDate,
      customToDate,
      onCustomToChange: setCustomToDate,
      tenureAvailable: Boolean(tenurePolicy?.enabled),
      tenurePeriodLabel,
      tenureQuarterLabel,
      tenureQuarterMonths,
      tenureMonthIndexes: effectiveTenureMonthIndexes,
      onTenureMonthIndexesChange: setTenureMonthIndexes,
      label: periodLabel,
    },
    profile,
    leaveDialogOpen,
    reviewDialogOpen,
    hrDialogOpen,
    offDayRangeSelect,
    leavePending: store.leavePending,
    reviewPending: store.reviewPending,
    hrPending: store.hrPending,
    leaveDraft,
    reviewDraft,
    hrDraft,
    alerts,
    setLeaveDialogOpen(open) {
      setLeaveDialogOpen(open);
    },
    setReviewDialogOpen(open) {
      if (open) {
        setReviewDraftState((prev) => ({ ...prev, reviewDate: clampedDefaultDate }));
      }
      setReviewDialogOpen(open);
    },
    setHrDialogOpen(open) {
      if (open && profile) {
        setHrDraftState({
          status: profile.hr.status,
          departmentId: profile.hr.departmentId ?? "",
          employmentType: profile.hr.employmentType ?? "",
          workModel: profile.hr.workModel ?? "",
          gender: normalizeGenderDraft(profile.hr.gender),
          dateOfBirth: profileQuery.data?.hrProfile.dateOfBirth ?? "",
          phone: profile.hr.phone ?? "",
          address: profile.hr.address ?? "",
        });
      }
      setHrDialogOpen(open);
    },
    openOffDayRangeSelect(startDate) {
      setOffDayRangeSelect({ startDate, endDate: startDate });
    },
    closeOffDayRangeSelect() {
      setOffDayRangeSelect(null);
    },
    confirmOffDayRangeSelect(next) {
      setOffDayRangeSelect(null);
      setLeaveDraftState((prev) => ({
        ...prev,
        startDate: next.startDate,
        endDate: next.endDate,
      }));
      setLeaveDialogOpen(true);
    },
    openAddOffDay(date) {
      setLeaveDraftState((prev) => ({
        ...prev,
        startDate: date,
        endDate: date,
      }));
      setLeaveDialogOpen(true);
    },
    openAddOffDayDialog() {
      setLeaveDraftState((prev) => ({
        ...prev,
        startDate: clampedDefaultDate,
        endDate: clampedDefaultDate,
      }));
      setLeaveDialogOpen(true);
    },
    setLeaveDraft(patch) {
      setLeaveDraftState((prev) => ({ ...prev, ...patch }));
    },
    setReviewDraft(patch) {
      setReviewDraftState((prev) => ({ ...prev, ...patch }));
    },
    setHrDraft(patch) {
      setHrDraftState((prev) => ({ ...prev, ...patch }));
    },
    toggleDay(date) {
      setExpandedDays((prev) => ({ ...prev, [date]: !(prev[date] ?? date === today) }));
    },
    focusDay(date) {
      scrollToActivityDay(date);
    },
    highlightedActivityDate,
    retry() {
      void profileQuery.refetch();
      alerts.refetch();
    },
    async submitLeave() {
      if (!teamId || !profile) return;
      try {
        await store.createLeave({
          teamId,
          userId: leaveDraft.teamWide || leaveDraft.type === "team_holiday" ? null : subjectUserId,
          startDate: leaveDraft.startDate,
          endDate: leaveDraft.endDate,
          type: leaveDraft.teamWide ? "team_holiday" : leaveDraft.type,
          reason: leaveDraft.reason.trim() || null,
        });
        toast.success("Off day saved");
        setLeaveDialogOpen(false);
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't save off day");
      }
    },
    async submitReview() {
      if (!teamId || !profile) return;
      try {
        await store.createReview({
          teamId,
          subjectUserId,
          reviewDate: reviewDraft.reviewDate,
          body: reviewDraft.body,
        });
        toast.success("Review saved");
        setReviewDialogOpen(false);
        setReviewDraftState({ reviewDate: clampedDefaultDate, body: "" });
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't save review");
      }
    },
    async submitHr() {
      if (!teamId || !profile) return;
      try {
        // Omit code/social/allowances so existing DB values stay intact.
        await store.upsertHrProfile({
          teamId,
          userId: subjectUserId,
          status: hrDraft.status,
          departmentId: hrDraft.departmentId || null,
          employmentType: hrDraft.employmentType || null,
          workModel: hrDraft.workModel || null,
          gender: normalizeGenderDraft(hrDraft.gender) || null,
          dateOfBirth: hrDraft.dateOfBirth || null,
          phone: hrDraft.phone.trim() || null,
          address: hrDraft.address.trim() || null,
        });
        toast.success("Profile saved");
        setHrDialogOpen(false);
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't save profile");
      }
    },
  };
}
