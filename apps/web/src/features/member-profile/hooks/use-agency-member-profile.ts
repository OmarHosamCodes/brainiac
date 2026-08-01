import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { RangePreset } from "@/features/dashboard/agency-dashboard-command-bar";
import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
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
    role: string;
    joinedAtLabel: string;
    isSelf: boolean;
    canAddReview: boolean;
    canManageLeave: boolean;
    periodHoursLabel: string;
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
          }
      >;
    }>;
  } | null;
  leaveDialogOpen: boolean;
  reviewDialogOpen: boolean;
  leavePending: boolean;
  reviewPending: boolean;
  leaveDraft: {
    startDate: string;
    endDate: string;
    type: LeaveType;
    reason: string;
    teamWide: boolean;
  };
  reviewDraft: { reviewDate: string; body: string };
  setLeaveDialogOpen: (open: boolean) => void;
  setReviewDialogOpen: (open: boolean) => void;
  setLeaveDraft: (patch: Partial<AgencyMemberProfileViewModel["leaveDraft"]>) => void;
  setReviewDraft: (patch: Partial<AgencyMemberProfileViewModel["reviewDraft"]>) => void;
  toggleDay: (date: string) => void;
  focusDay: (date: string) => void;
  retry: () => void;
  submitLeave: () => Promise<void>;
  submitReview: () => Promise<void>;
};

function todayKey(utcOffsetMinutes: number) {
  const localMs = Date.now() - utcOffsetMinutes * 60_000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
      return "Leave";
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
  const [customFromDate, setCustomFromDate] = useState(toDateInputValue(startOfWeekUtc()));
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
      ),
    [
      customFromDate,
      customToDate,
      effectiveRangePreset,
      effectiveTenureMonthIndexes,
      now,
      tenurePolicy,
    ],
  );

  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({ [today]: true });
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
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

  const profileQueryInput = useMemo(
    () => ({
      teamId,
      userId: subjectUserId,
      utcOffsetMinutes,
      from: range.from,
      to: range.to,
    }),
    [range.from, range.to, subjectUserId, teamId, utcOffsetMinutes],
  );

  const profileQuery = useQuery({
    ...orpc.agencyOps.memberProfile.get.queryOptions({
      input: profileQueryInput,
    }),
    enabled: Boolean(teamId && subjectUserId && session.data?.user),
    placeholderData: keepPreviousData,
  });

  const invalidate = useMutation({
    mutationFn: async () => undefined,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.memberProfile.get.key(),
      });
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
        ? "No leave in this period"
        : `${data.leave.length} leave range${data.leave.length === 1 ? "" : "s"}`;

    const heatLayout = resolveMemberProfileHeatLayout(
      effectiveRangePreset,
      effectiveTenureMonthIndexes,
      data.heatMap.startDate,
      data.heatMap.endDate,
    );

    return {
      userName: data.userName,
      userAvatarUrl: avatarUrl,
      role: data.role,
      joinedAtLabel,
      isSelf: data.isSelf,
      canAddReview: data.canAddReview,
      canManageLeave: data.canManageLeave,
      periodHoursLabel: shortHours(data.periodTotalSeconds),
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
      timeline: data.timeline.map((day, index) => {
        const defaultOpen =
          day.date === today ||
          (expandedDays[day.date] === undefined &&
            !data.timeline.some((entry) => entry.date === today) &&
            index === 0);
        const parts = formatDayParts(day.date, today);
        const reviewCount = day.items.filter((item) => item.kind === "review").length;
        const activityCount = day.items.length - reviewCount;
        const countLabel = [
          reviewCount > 0 ? `${reviewCount} review` : null,
          `${activityCount} activity`,
        ]
          .filter(Boolean)
          .join(" · ");

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
              timeLabel: new Date(item.createdAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              }),
              durationLabel:
                item.durationSeconds == null ? null : formatDuration(item.durationSeconds, "short"),
            };
          }),
        };
      }),
    };
  }, [
    effectiveRangePreset,
    effectiveTenureMonthIndexes,
    expandedDays,
    profileQuery.data,
    serverUrl,
    today,
  ]);

  // Keep leave/review drafts inside the selected period when the range changes.
  const rangeStartKey = range.from.slice(0, 10);
  const rangeEndKey = range.to.slice(0, 10);
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
    leavePending: store.leavePending,
    reviewPending: store.reviewPending,
    leaveDraft,
    reviewDraft,
    setLeaveDialogOpen(open) {
      if (open) {
        setLeaveDraftState((prev) => ({
          ...prev,
          startDate: clampedDefaultDate,
          endDate: clampedDefaultDate,
        }));
      }
      setLeaveDialogOpen(open);
    },
    setReviewDialogOpen(open) {
      if (open) {
        setReviewDraftState((prev) => ({ ...prev, reviewDate: clampedDefaultDate }));
      }
      setReviewDialogOpen(open);
    },
    setLeaveDraft(patch) {
      setLeaveDraftState((prev) => ({ ...prev, ...patch }));
    },
    setReviewDraft(patch) {
      setReviewDraftState((prev) => ({ ...prev, ...patch }));
    },
    toggleDay(date) {
      setExpandedDays((prev) => ({ ...prev, [date]: !(prev[date] ?? date === today) }));
    },
    focusDay(date) {
      setExpandedDays((prev) => ({ ...prev, [date]: true }));
      const el = document.getElementById(`member-profile-day-${date}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    retry() {
      void profileQuery.refetch();
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
        toast.success("Leave saved");
        setLeaveDialogOpen(false);
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't save leave");
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
  };
}
