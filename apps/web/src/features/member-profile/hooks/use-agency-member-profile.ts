import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
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
  profile: {
    userName: string;
    userAvatarUrl: string | null;
    role: string;
    joinedAtLabel: string;
    isSelf: boolean;
    canAddReview: boolean;
    canManageLeave: boolean;
    monthHoursLabel: string;
    yearHoursLabel: string;
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
        hoursLabel: string;
      }>;
    };
    leaveSummary: string;
    timeline: Array<{
      date: string;
      label: string;
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
            summary: string;
            projectName: string | null;
            isWaste: boolean;
            timeLabel: string;
            durationLabel: string;
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

function formatDayLabel(dateKey: string, today: string) {
  if (dateKey === today) return `Today · ${dateKey}`;
  const yesterday = new Date(`${today}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yKey = yesterday.toISOString().slice(0, 10);
  if (dateKey === yKey) return `Yesterday · ${dateKey}`;
  return dateKey;
}

function shortHours(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
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

  const profileQuery = useQuery({
    ...orpc.agencyOps.memberProfile.get.queryOptions({
      input: { teamId, userId: subjectUserId, utcOffsetMinutes },
    }),
    enabled: Boolean(teamId && subjectUserId && session.data?.user),
  });

  const invalidate = useMutation({
    mutationFn: async () => undefined,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: orpc.agencyOps.memberProfile.get.key({
          input: { teamId, userId: subjectUserId, utcOffsetMinutes },
        }),
      });
    },
  });

  const serverUrl = getServerUrl();

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
        ? "No leave ranges in this year"
        : `${data.leave.length} leave range${data.leave.length === 1 ? "" : "s"}`;

    return {
      userName: data.userName,
      userAvatarUrl: avatarUrl,
      role: data.role,
      joinedAtLabel,
      isSelf: data.isSelf,
      canAddReview: data.canAddReview,
      canManageLeave: data.canManageLeave,
      monthHoursLabel: shortHours(data.monthTotalSeconds),
      yearHoursLabel: shortHours(data.yearTotalSeconds),
      heatMap: {
        startDate: data.heatMap.startDate,
        endDate: data.heatMap.endDate,
        days: data.heatMap.days.map((day) => ({
          ...day,
          hoursLabel: shortHours(day.totalSeconds),
        })),
      },
      leaveSummary,
      timeline: data.timeline.map((day) => ({
        date: day.date,
        label: formatDayLabel(day.date, today),
        open: expandedDays[day.date] ?? day.date === today,
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
            summary: item.summary,
            projectName: item.projectName,
            isWaste: item.isWaste,
            timeLabel: new Date(item.createdAt).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            }),
            durationLabel: formatDuration(item.durationSeconds, "short"),
          };
        }),
      })),
    };
  }, [profileQuery.data, serverUrl, today, expandedDays]);

  return {
    teamId,
    subjectUserId,
    loading: profileQuery.isPending,
    error: profileQuery.error
      ? profileQuery.error instanceof Error
        ? profileQuery.error.message
        : "Couldn't load profile"
      : store.error,
    profile,
    leaveDialogOpen,
    reviewDialogOpen,
    leavePending: store.leavePending,
    reviewPending: store.reviewPending,
    leaveDraft,
    reviewDraft,
    setLeaveDialogOpen,
    setReviewDialogOpen,
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
        setReviewDraftState({ reviewDate: today, body: "" });
        await invalidate.mutateAsync();
        await profileQuery.refetch();
      } catch {
        toast.error("Couldn't save review");
      }
    },
  };
}
