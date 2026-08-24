import { buildWeekHours } from "@orch/api/routers/agency-ops/member-profile/member-profile-hr";
import { DEFAULT_WORK_SCHEDULE } from "@orch/api/routers/agency-ops/resourcing/work-schedule";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/navigation";
import { toast } from "sonner";

import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";
import {
  useMemberProfileAlerts,
  type MemberProfileAlertsViewModel,
} from "@/features/member-profile/hooks/use-member-profile-alerts";
import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
import type { AlertPeriodTarget } from "@/features/member-profile/member-profile-alert-period";
import { resolveAlertPeriodTarget } from "@/features/member-profile/member-profile-alert-period";
import {
  buildGaugeDetail,
  computeMonthPaceVisual,
  type GaugeDetailModel,
} from "@/features/member-profile/member-profile-gauge-detail";
import {
  resolveMemberProfileHeatLayout,
  type MemberProfileHeatLayout,
} from "@/features/member-profile/member-profile-heat-layout";
import type { StatPlateKey } from "@/features/member-profile/member-profile-instrument-plate";
import type { StreakSegmentState } from "@/features/member-profile/member-profile-attendance-streak";
import { computeAttendanceStreak } from "@/features/member-profile/member-profile-attendance-streak";
import {
  resolveMemberProfileRosterNav,
  type MemberProfileRosterMember,
} from "@/features/member-profile/member-profile-roster-nav";
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
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";
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
  refreshing: boolean;
  error: string | null;
  memberNav: {
    members: MemberProfileRosterMember[];
    current: MemberProfileRosterMember | null;
    previous: MemberProfileRosterMember | null;
    next: MemberProfileRosterMember | null;
    indexLabel: string | null;
    canGoPrevious: boolean;
    canGoNext: boolean;
    loading: boolean;
    onGoPrevious: () => void;
    onGoNext: () => void;
    onSelectMember: (userId: string) => void;
  };
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
    weekStartsOn: number;
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
    weekHoursCaption: string;
    selectedHeatDate: string | null;
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
      streakSegments?: StreakSegmentState[];
      bestInMonth?: number;
      monthPresentDays?: number;
      monthWorkingDays?: number;
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
        status: "present" | "leave" | "holiday" | "weekend" | "empty";
        leaveId: string | null;
      }>;
      legend: Array<{
        status: "present" | "leave" | "holiday" | "weekend" | "empty";
        label: string;
        count: number;
      }>;
      onPrevMonth: () => void;
      onNextMonth: () => void;
      todayDate: string;
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
  leaveRemoveTarget: {
    leaveId: string;
    startDate: string;
    endDate: string;
    type: LeaveType;
    rangeLabel: string;
    typeLabel: string;
  } | null;
  leavePending: boolean;
  reviewPending: boolean;
  hrPending: boolean;
  hrInactiveConfirmOpen: boolean;
  setHrInactiveConfirmOpen: (open: boolean) => void;
  requestSubmitHr: () => void;
  confirmHrInactive: () => void;
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
  openRemoveLeave: (leaveId: string, clickedDate?: string) => void;
  closeRemoveLeave: () => void;
  confirmRemoveLeave: () => Promise<void>;
  setLeaveDraft: (patch: Partial<AgencyMemberProfileViewModel["leaveDraft"]>) => void;
  setReviewDraft: (patch: Partial<AgencyMemberProfileViewModel["reviewDraft"]>) => void;
  setHrDraft: (patch: Partial<AgencyMemberProfileViewModel["hrDraft"]>) => void;
  toggleDay: (date: string) => void;
  focusDay: (date: string) => void;
  /** Activity day briefly shimmer-highlighted after an alert period jump. */
  highlightedActivityDate: string | null;
  /** Open instrument plate detail (morph dialog). */
  openGaugeKey: StatPlateKey | null;
  gaugeDetail: GaugeDetailModel | null;
  openGauge: (key: StatPlateKey) => void;
  closeGauge: () => void;
  runGaugePrimaryAction: () => void;
  focusGaugeDay: (date: string) => void;
  /** Expand workspace agent with a member-scoped Ask prompt. */
  askOrchAboutMember: () => void;
  retry: () => void;
  submitLeave: () => Promise<void>;
  submitReview: () => Promise<void>;
  submitHr: () => Promise<void>;
};

function leaveTypeLabel(type: LeaveType): string {
  switch (type) {
    case "pto":
      return "PTO";
    case "sick":
      return "Sick";
    case "team_holiday":
      return "Team holiday";
    case "other":
      return "Other";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function leaveRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };
  if (startDate === endDate) return start.toLocaleDateString(undefined, opts);
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

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

function weekContainingCaption(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  return `Week of ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })}`;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentAgencyTeamId } = useCurrentAgencyTeam();
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const teamId = currentAgencyTeamId || selectedTeamId || "";
  const utcOffsetMinutes = new Date().getTimezoneOffset();
  const today = todayKey(utcOffsetMinutes);
  const queryClient = useQueryClient();
  const store = useAgencyMemberProfileStore();
  const now = useMemo(() => new Date(), []);
  const serverUrl = getServerUrl();

  useEffect(() => {
    if (searchParams.get("focus") !== "alerts") return;
    const node = document.getElementById("member-profile-alerts");
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [searchParams, subjectUserId]);

  const membersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId && session.data?.user),
  });

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
  const weekendDurationDays =
    tenurePolicy?.weekendDurationDays ?? DEFAULT_WORK_SCHEDULE.weekendDurationDays;
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
  const [leaveRemoveTarget, setLeaveRemoveTarget] = useState<{
    leaveId: string;
    startDate: string;
    endDate: string;
    type: LeaveType;
    rangeLabel: string;
    typeLabel: string;
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
  const [selectedHeatDate, setSelectedHeatDate] = useState<string | null>(null);
  const [openGaugeKey, setOpenGaugeKey] = useState<StatPlateKey | null>(null);
  const [hrInactiveConfirmOpen, setHrInactiveConfirmOpen] = useState(false);

  const defaultCalendarMonth = range.to.slice(0, 7);
  const calendarMonth = calendarMonthOverride ?? defaultCalendarMonth;

  useEffect(() => {
    setCalendarMonthOverride(null);
    setSelectedHeatDate(null);
  }, [range.from, range.to, subjectUserId]);

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
    placeholderData: (previousData) =>
      previousData?.userId === subjectUserId ? previousData : undefined,
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

  const fiscalCalendar = tenurePolicy
    ? {
        fiscalYearStartMonth: tenurePolicy.fiscalYearStartMonth,
        fiscalYearStartDay: tenurePolicy.fiscalYearStartDay,
      }
    : undefined;

  const alerts = useMemberProfileAlerts({
    teamId,
    subjectUserId,
    utcOffsetMinutes,
    fiscalCalendar,
    onOpenPeriod: openAlertPeriod,
  });

  const alertDeepLinkHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (searchParams.get("focus") !== "alerts") return;
    const alertId = searchParams.get("alertId");
    const day = searchParams.get("day");
    const periodKey = searchParams.get("period");
    const linkKey = `${alertId ?? ""}:${day ?? ""}:${periodKey ?? ""}`;
    if (alertDeepLinkHandledRef.current === linkKey) return;
    alertDeepLinkHandledRef.current = linkKey;

    if (alertId) {
      alerts.openDetail(alertId);
    }
    const target = resolveAlertPeriodTarget(
      {
        dateKey: day ?? undefined,
        periodKey: periodKey ?? undefined,
      },
      fiscalCalendar,
    );
    if (target) {
      openAlertPeriod(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- consume landing URL once per subject/params
  }, [searchParams, subjectUserId]);

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

  const periodLabel = rangePresetDisplayLabel(
    effectiveRangePreset,
    tenurePeriodLabel,
    customFromDate,
    customToDate,
  );

  const profile = useMemo(() => {
    const data = profileQuery.data;
    if (!data || data.userId !== subjectUserId) return null;

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

    const weekHoursSource = selectedHeatDate
      ? buildWeekHours(
          selectedHeatDate,
          new Map(data.heatMap.days.map((day) => [day.date, day.totalSeconds])),
          weekStartsOn,
        )
      : [];
    const maxWeekSeconds = Math.max(1, ...weekHoursSource.map((day) => day.totalSeconds));
    const weekHoursTotalSeconds = weekHoursSource.reduce((sum, day) => sum + day.totalSeconds, 0);

    const calendarLegendCounts = {
      present: 0,
      leave: 0,
      holiday: 0,
      weekend: 0,
      empty: 0,
    };
    for (const day of data.calendarMonth.days) {
      if (!day.inMonth) continue;
      calendarLegendCounts[day.status] += 1;
    }

    const leaveAll = data.leaveBalances.all;
    const streakAnchor =
      today < rangeStartKey ? rangeStartKey : today > rangeEndKey ? rangeEndKey : today;
    const attendanceStreak = computeAttendanceStreak({
      anchorDate: streakAnchor,
      schedule: { weekStartsOn, weekendDurationDays },
      heatDays: data.heatMap.days.map((day) => ({
        date: day.date,
        totalSeconds: day.totalSeconds,
        off: day.off,
      })),
      calendarDays: data.calendarMonth.days.map((day) => ({
        date: day.date,
        inMonth: day.inMonth,
        status: day.status,
      })),
    });
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
        ratio:
          data.periodTotalSeconds > 0 ? Math.min(1, data.periodTotalSeconds / (160 * 3600)) : 0.08,
        tone: "foreground" as const,
      },
      {
        key: "present" as const,
        label: "Attendance streak",
        valueLabel: String(attendanceStreak.currentStreak),
        secondary: data.calendarMonth.label,
        ratio: Math.min(1, attendanceStreak.currentStreak / 7),
        tone: attendanceStreak.currentStreak > 0 ? ("success" as const) : ("foreground" as const),
        streakSegments: attendanceStreak.segments,
        bestInMonth: attendanceStreak.bestInMonth,
        monthPresentDays: attendanceStreak.monthPresentDays,
        monthWorkingDays: attendanceStreak.monthWorkingDays,
      },
      {
        key: "waste" as const,
        label: "Waste",
        valueLabel: shortHours(data.periodWasteSeconds),
        secondary: "this period",
        ratio:
          data.periodWasteSeconds <= 0
            ? 0
            : Math.min(1, data.periodWasteSeconds / Math.max(data.periodTotalSeconds, 1)),
        tone:
          data.periodWasteSeconds <= 0 ? ("foreground" as const) : ("warning" as const),
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
      weekHoursCaption: selectedHeatDate ? weekContainingCaption(selectedHeatDate) : "",
      selectedHeatDate,
      heatLayout,
      heatMap: {
        startDate: data.heatMap.startDate,
        endDate: data.heatMap.endDate,
        days: data.heatMap.days.map((day, index, all) => {
          let offBand: "single" | "start" | "middle" | "end" | null = null;
          if (day.off) {
            const leaveId = day.off.leaveId;
            const hasPrev = all[index - 1]?.off?.leaveId === leaveId;
            const hasNext = all[index + 1]?.off?.leaveId === leaveId;
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
      weekHours: weekHoursSource.map((day) => ({
        date: day.date,
        weekdayLabel: day.weekdayLabel,
        totalSeconds: day.totalSeconds,
        hoursLabel: shortHours(day.totalSeconds),
        heightPct: Math.round((day.totalSeconds / maxWeekSeconds) * 100),
      })),
      calendar: {
        label: data.calendarMonth.label,
        weekdayLabels: data.calendarMonth.weekdayLabels,
        days: data.calendarMonth.days.map((day) => ({
          date: day.date,
          dayOfMonth: day.dayOfMonth,
          inMonth: day.inMonth,
          status: day.status,
          leaveId: day.leaveId,
        })),
        legend: [
          { status: "present" as const, label: "logged", count: calendarLegendCounts.present },
          { status: "leave" as const, label: "off", count: calendarLegendCounts.leave },
          { status: "holiday" as const, label: "holiday", count: calendarLegendCounts.holiday },
          { status: "weekend" as const, label: "weekend", count: calendarLegendCounts.weekend },
          { status: "empty" as const, label: "no hours", count: calendarLegendCounts.empty },
        ],
        onPrevMonth: () => setCalendarMonthOverride(shiftMonthKey(calendarMonth, -1)),
        onNextMonth: () => setCalendarMonthOverride(shiftMonthKey(calendarMonth, 1)),
        todayDate: today,
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
    selectedHeatDate,
    serverUrl,
    today,
    subjectUserId,
    weekStartsOn,
    weekendDurationDays,
    rangeStartKey,
    rangeEndKey,
  ]);

  const gaugeDetail = useMemo((): GaugeDetailModel | null => {
    if (!openGaugeKey || !profile || !profileQuery.data) return null;
    const data = profileQuery.data;
    const gauge = profile.leaveGauges.find((item) => item.key === openGaugeKey);
    if (!gauge) return null;

    const dayHours = data.timeline.map((day) => {
      let totalSeconds = 0;
      for (const item of day.items) {
        if (item.kind === "activity" && item.durationSeconds != null) {
          totalSeconds += item.durationSeconds;
        }
      }
      const date = new Date(`${day.date}T12:00:00.000Z`);
      const label = date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      return {
        date: day.date,
        label,
        hoursLabel: shortHours(totalSeconds),
        totalSeconds,
      };
    });

    const wasteDays: Array<{
      date: string;
      label: string;
      hoursLabel: string;
      totalSeconds: number;
      entryCount: number;
    }> = [];
    for (const day of data.timeline) {
      let wasteSeconds = 0;
      let entryCount = 0;
      for (const item of day.items) {
        if (item.kind === "activity" && item.isWaste && item.durationSeconds != null) {
          wasteSeconds += item.durationSeconds;
          entryCount += 1;
        }
      }
      if (wasteSeconds <= 0) continue;
      const date = new Date(`${day.date}T12:00:00.000Z`);
      wasteDays.push({
        date: day.date,
        label: date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        }),
        hoursLabel: shortHours(wasteSeconds),
        totalSeconds: wasteSeconds,
        entryCount,
      });
    }

    let paidSeconds = 0;
    let internalSeconds = 0;
    for (const day of data.timeline) {
      for (const item of day.items) {
        if (item.kind !== "activity" || item.isWaste || item.durationSeconds == null) continue;
        if (item.isBillable) paidSeconds += item.durationSeconds;
        else internalSeconds += item.durationSeconds;
      }
    }

    const todayMonthPrefix = today.slice(0, 7);
    const calendarMatchesToday =
      data.calendarMonth.year === Number(today.slice(0, 4)) &&
      data.calendarMonth.month === Number(today.slice(5, 7));
    const monthPaceSource = calendarMatchesToday
      ? data.calendarMonth.days
          .filter((day) => day.inMonth)
          .map((day) => ({ date: day.date, totalSeconds: day.totalSeconds }))
      : data.heatMap.days.filter((day) => day.date.startsWith(todayMonthPrefix));

    const monthPaceDayHours = monthPaceSource.map((day) => {
      const date = new Date(`${day.date}T12:00:00.000Z`);
      const label = date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      return {
        date: day.date,
        label,
        hoursLabel: shortHours(day.totalSeconds),
        totalSeconds: day.totalSeconds,
      };
    });

    const monthPaceVisual = computeMonthPaceVisual({
      dayHours: monthPaceDayHours,
      schedule: {
        weekStartsOn,
        weekendDurationDays,
        requiredDailyHours:
          tenurePolicy?.requiredDailyHours ?? DEFAULT_WORK_SCHEDULE.requiredDailyHours,
      },
      monthlyMinHours: tenurePolicy?.monthlyMinHours ?? 200,
      todayKey: today,
    });

    return buildGaugeDetail({
      canManageLeave: profile.canManageLeave,
      leavePeriodLabel: data.leaveBalances.period.label,
      usedDays: data.leaveBalances.all.usedDays,
      allowanceDays: data.leaveBalances.all.allowanceDays,
      leaveEntries: data.leave.map((entry) => ({
        id: entry.id,
        startDate: entry.startDate,
        endDate: entry.endDate,
        typeLabel: leaveTypeLabel(entry.type),
        rangeLabel: leaveRangeLabel(entry.startDate, entry.endDate),
      })),
      periodLabel,
      periodHoursLabel: shortHours(data.periodTotalSeconds),
      periodTotalSeconds: data.periodTotalSeconds,
      periodWasteSeconds: data.periodWasteSeconds,
      periodWasteLabel: shortHours(data.periodWasteSeconds),
      hoursBreakdown: { paidSeconds, internalSeconds },
      dayHours,
      monthPaceVisual,
      calendarLabel: profile.calendar.label,
      calendarDays: profile.calendar.days.map((day) => {
        const date = new Date(`${day.date}T12:00:00.000Z`);
        return {
          date: day.date,
          inMonth: day.inMonth,
          status: day.status,
          dayLabel: date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }),
        };
      }),
      wasteDays,
      gauge: {
        key: gauge.key,
        valueLabel: gauge.valueLabel,
        ratio: gauge.ratio,
        tone: gauge.tone,
      },
      attendanceStreak:
        gauge.key === "present"
          ? {
              currentStreak: Number(gauge.valueLabel),
              bestInMonth: gauge.bestInMonth ?? 0,
              monthPresentDays: gauge.monthPresentDays ?? 0,
              monthWorkingDays: gauge.monthWorkingDays ?? 0,
              segments: gauge.streakSegments ?? [],
            }
          : undefined,
    });
  }, [
    openGaugeKey,
    periodLabel,
    profile,
    profileQuery.data,
    rangeEndKey,
    rangeStartKey,
    tenurePolicy,
    today,
    weekStartsOn,
    weekendDurationDays,
  ]);

  // Keep leave/review drafts inside the selected period when the range changes.
  const clampedDefaultDate =
    today < rangeStartKey ? rangeStartKey : today > rangeEndKey ? rangeEndKey : today;

  const rosterMembers = useMemo<MemberProfileRosterMember[]>(
    () =>
      (membersQuery.data?.items ?? []).map((member) => ({
        userId: member.userId,
        userName: member.userName,
        userAvatarUrl: member.userAvatar ?? null,
      })),
    [membersQuery.data?.items],
  );

  const rosterNav = useMemo(
    () => resolveMemberProfileRosterNav(rosterMembers, subjectUserId),
    [rosterMembers, subjectUserId],
  );

  const memberNav = useMemo(() => {
    const goTo = (userId: string) => {
      if (!userId || userId === subjectUserId) return;
      navigate(`/agency/members/${encodeURIComponent(userId)}`);
    };
    return {
      members: rosterNav.members,
      current: rosterNav.current,
      previous: rosterNav.previous,
      next: rosterNav.next,
      indexLabel:
        rosterNav.index >= 0 && rosterNav.total > 0
          ? `${rosterNav.index + 1} of ${rosterNav.total}`
          : null,
      canGoPrevious: Boolean(rosterNav.previous),
      canGoNext: Boolean(rosterNav.next),
      loading: membersQuery.isPending,
      onGoPrevious() {
        if (rosterNav.previous) goTo(rosterNav.previous.userId);
      },
      onGoNext() {
        if (rosterNav.next) goTo(rosterNav.next.userId);
      },
      onSelectMember(userId: string) {
        goTo(userId);
      },
    };
  }, [
    membersQuery.isPending,
    navigate,
    rosterNav.current,
    rosterNav.index,
    rosterNav.members,
    rosterNav.next,
    rosterNav.previous,
    rosterNav.total,
    subjectUserId,
  ]);

  async function persistHrProfile() {
    if (!teamId || !profile) return;
    try {
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
      setHrInactiveConfirmOpen(false);
      await invalidate.mutateAsync();
      await profileQuery.refetch();
    } catch {
      toast.error("Couldn't save profile");
    }
  }

  return {
    teamId,
    subjectUserId,
    loading: profileQuery.isPending || tenurePolicyQuery.isPending,
    refreshing:
      (profileQuery.isFetching && Boolean(profileQuery.data?.userId === subjectUserId)) ||
      (tenurePolicyQuery.isFetching && Boolean(tenurePolicyQuery.data)),
    error: profileQuery.error
      ? profileQuery.error instanceof Error
        ? profileQuery.error.message
        : "Couldn't load profile"
      : store.error,
    memberNav,
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
      weekStartsOn,
      label: periodLabel,
    },
    profile,
    leaveDialogOpen,
    reviewDialogOpen,
    hrDialogOpen,
    offDayRangeSelect,
    leaveRemoveTarget,
    leavePending: store.leavePending,
    reviewPending: store.reviewPending,
    hrPending: store.hrPending,
    hrInactiveConfirmOpen,
    setHrInactiveConfirmOpen,
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
    openRemoveLeave(leaveId, clickedDate) {
      const data = profileQuery.data;
      if (!data) return;
      const fromLeave = data.leave.find((row) => row.id === leaveId);
      const fromHeat = data.heatMap.days.find((day) => day.off?.leaveId === leaveId)?.off;
      const startDate = fromLeave?.startDate ?? fromHeat?.rangeStart ?? clickedDate ?? "";
      const endDate = fromLeave?.endDate ?? fromHeat?.rangeEnd ?? clickedDate ?? "";
      const type = (fromLeave?.type ?? fromHeat?.type ?? "other") as LeaveType;
      const hasRange = Boolean(startDate && endDate);
      setLeaveRemoveTarget({
        leaveId,
        startDate,
        endDate,
        type,
        rangeLabel: hasRange ? leaveRangeLabel(startDate, endDate) : "this off day",
        typeLabel: leaveTypeLabel(type),
      });
    },
    closeRemoveLeave() {
      setLeaveRemoveTarget(null);
    },
    async confirmRemoveLeave() {
      if (!teamId || !leaveRemoveTarget) return;
      try {
        await store.deleteLeave({ teamId, leaveId: leaveRemoveTarget.leaveId });
        toast.success("Off day removed");
        setLeaveRemoveTarget(null);
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't remove off day");
      }
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
      setSelectedHeatDate(date);
      scrollToActivityDay(date);
    },
    highlightedActivityDate,
    openGaugeKey,
    gaugeDetail,
    openGauge(key) {
      if (!profile || profileQuery.data?.userId !== subjectUserId) return;
      setOpenGaugeKey(key);
    },
    closeGauge() {
      setOpenGaugeKey(null);
    },
    runGaugePrimaryAction() {
      const action = gaugeDetail?.primaryAction;
      if (!action) return;
      setOpenGaugeKey(null);
      if (action.kind === "add_off_day") {
        setLeaveDraftState((prev) => ({
          ...prev,
          startDate: clampedDefaultDate,
          endDate: clampedDefaultDate,
        }));
        setLeaveDialogOpen(true);
        return;
      }
      setSelectedHeatDate(action.date);
      scrollToActivityDay(action.date);
    },
    focusGaugeDay(date: string) {
      setOpenGaugeKey(null);
      setSelectedHeatDate(date);
      scrollToActivityDay(date);
    },
    askOrchAboutMember() {
      if (!profile) return;
      const agent = useWorkspaceAgentStore.getState();
      for (const chip of agent.scopeChips) {
        if (chip.kind === "member") agent.removeScopeChip(chip.id);
      }
      if (!profile.isSelf) {
        agent.addScopeChip({
          kind: "member",
          id: subjectUserId,
          label: profile.userName.trim() || "Member",
        });
      }
      agent.seedComposer({
        toolPreset: "ask",
        text: profile.isSelf
          ? `Review my profile for ${periodLabel}. Summarize hours, attendance, off days, and waste. Flag anomalies or risks, cite the relevant dates and figures, and recommend next steps.`
          : `Review ${profile.userName.trim() || "this member"}'s profile for ${periodLabel}. Summarize hours, attendance, off days, and waste. Flag anomalies or risks, cite the relevant dates and figures, and recommend next steps.`,
      });
    },
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
      await persistHrProfile();
    },
    requestSubmitHr() {
      if (!profile) return;
      if (profile.hr.status === "active" && hrDraft.status === "inactive") {
        setHrInactiveConfirmOpen(true);
        return;
      }
      void persistHrProfile();
    },
    confirmHrInactive() {
      setHrInactiveConfirmOpen(false);
      void persistHrProfile();
    },
  };
}
