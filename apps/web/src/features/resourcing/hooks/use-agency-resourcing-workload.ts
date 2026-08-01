import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import type { MemberProfileHeatMapData } from "@/features/member-profile/member-profile-heat-map";
import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
import {
  buildPresenceCalendarDays,
  focusMonthKeyFromAnchor,
  monthLabelFromKey,
  monthWindowDateKeys,
  shortDisplayName,
  type PresenceDayCell,
  type PresencePerson,
} from "@/features/resourcing/resourcing-team-presence";
import {
  addDaysToDateKey,
  periodAnchorUtc,
  periodLabel,
  shiftPeriodAnchor,
  type ResourcingPeriodGrain,
} from "@/features/resourcing/resourcing-workload-heat";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type ResourcingActivityHeatMemberRow = {
  userId: string;
  userName: string;
  heatMap: MemberProfileHeatMapData;
};

export type ResourcingAbsenceAgendaItem = {
  id: string;
  userId: string | null;
  userName: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string | null;
  daySpan: number;
};

export type ResourcingFilmstripDay = {
  date: string;
  dayOfMonth: number;
  weekdayShort: string;
  workingCount: number;
  memberCount: number;
  weekend: boolean;
};

export type ResourcingOutPerson = PresencePerson & {
  leaveType: string;
  leaveReason: string | null;
};

export type AgencyResourcingWorkloadViewModel = {
  grain: ResourcingPeriodGrain;
  periodTitle: string;
  focusMonthKey: string;
  focusMonthLabel: string;
  activityRows: ResourcingActivityHeatMemberRow[];
  calendarDays: PresenceDayCell[];
  filmstripDays: ResourcingFilmstripDay[];
  filmstripRangeLabel: string;
  selectedDate: string | null;
  selectedDay: PresenceDayCell | null;
  selectedOut: ResourcingOutPerson[];
  selectedWorkingCount: number;
  coveragePct: number;
  briefingDayNumber: string;
  briefingWeekday: string;
  briefingHeadline: string;
  briefingSentence: string;
  selectedDayLabel: string;
  selectedDaySummary: string;
  agenda: ResourcingAbsenceAgendaItem[];
  selectedPersonId: string | null;
  selectedPerson: ResourcingActivityHeatMemberRow | null;
  selectedPersonOutDays: number;
  selectedPersonMonthDays: Array<{
    date: string;
    off: { type: string; reason: string | null } | null;
  }>;
  memberCount: number;
  isPending: boolean;
  isError: boolean;
  errorMessage: string;
  leaveRequestOpen: boolean;
  leaveRequestPending: boolean;
  leaveRequestError: string | null;
  leaveRequestDraft: {
    userId: string;
    startDate: string;
    endDate: string;
    type: "pto" | "sick" | "team_holiday" | "other" | "";
    reason: string;
  };
  setGrain: (grain: ResourcingPeriodGrain) => void;
  goPrevPeriod: () => void;
  goNextPeriod: () => void;
  selectDate: (date: string) => void;
  selectPerson: (userId: string) => void;
  openLeaveRequest: () => void;
  closeLeaveRequest: () => void;
  setLeaveRequestDraft: (
    patch: Partial<{
      userId: string;
      startDate: string;
      endDate: string;
      type: "pto" | "sick" | "team_holiday" | "other" | "";
      reason: string;
    }>,
  ) => void;
  submitLeaveRequest: () => Promise<boolean>;
  exportCsv: () => void;
  refetch: () => void;
};

function shortHours(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function toActivityHeatMap(
  fromDate: string,
  toDate: string,
  days: Array<{
    date: string;
    totalSeconds: number;
    intensity: number;
    off: { type: string; reason: string | null } | null;
  }>,
): MemberProfileHeatMapData {
  return {
    startDate: fromDate,
    endDate: toDate,
    days: days.map((day, index, all) => {
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
        date: day.date,
        totalSeconds: day.totalSeconds,
        intensity: day.intensity,
        off: day.off ? { type: day.off.type, reason: day.off.reason } : null,
        hoursLabel: shortHours(day.totalSeconds),
        dayOfMonthLabel: String(Number(day.date.slice(8, 10))),
        offBand,
      };
    }),
  };
}

function leaveTypeLabel(type: string) {
  switch (type) {
    case "pto":
      return "Paid time off";
    case "sick":
      return "Sick leave";
    case "team_holiday":
      return "Team holiday";
    case "other":
      return "Personal leave";
    default:
      return type;
  }
}

function inclusiveDaySpan(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function weekdayShort(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    timeZone: "UTC",
  });
}

function isWeekend(dateKey: string): boolean {
  const day = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

function defaultSelectedDate(monthKey: string, calendarDays: PresenceDayCell[]): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (today.startsWith(monthKey) && calendarDays.some((day) => day.date === today)) {
    return today;
  }
  const firstWeekday = calendarDays.find(
    (day) => day.date && !isWeekend(day.date) && day.working.length + day.out.length > 0,
  );
  return firstWeekday?.date ?? calendarDays.find((day) => day.date)?.date ?? null;
}

function buildFilmstrip(selectedDate: string | null, monthKey: string): string[] {
  if (!selectedDate) return [];
  const monthStart = `${monthKey}-01`;
  const monthEnd = monthWindowDateKeys(monthKey).toDate;
  let cursor = selectedDate;
  let weekdaysBack = 0;
  while (weekdaysBack < 4) {
    const prev = addDaysToDateKey(cursor, -1);
    if (prev < monthStart) break;
    cursor = prev;
    if (!isWeekend(cursor)) weekdaysBack += 1;
  }
  while (cursor <= monthEnd && isWeekend(cursor)) {
    cursor = addDaysToDateKey(cursor, 1);
  }
  const dates: string[] = [];
  while (dates.length < 10 && cursor <= monthEnd) {
    if (!isWeekend(cursor)) dates.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return dates;
}

function outPhrase(person: PresencePerson, leaveType: string): string {
  const type = leaveType.toLowerCase();
  if (type.includes("sick")) return `${person.userName} sick`;
  if (type.includes("paid")) return `${person.userName} on PTO`;
  return `${person.userName} on ${type}`;
}

function outSentence(out: Array<PresencePerson & { leaveType: string }>): string {
  if (out.length === 0) return "No one is out. Full-team coverage is expected.";
  const phrases = out.map((person) => outPhrase(person, person.leaveType));
  if (phrases.length === 1) return `Out: ${phrases[0]}.`;
  return `Out: ${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}.`;
}

export function useAgencyResourcingWorkload(teamId: string): AgencyResourcingWorkloadViewModel {
  const [grain, setGrain] = useState<ResourcingPeriodGrain>("month");
  const [anchor, setAnchor] = useState(() => periodAnchorUtc(new Date(), "month"));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [leaveRequestOpen, setLeaveRequestOpen] = useState(false);
  const [leaveRequestError, setLeaveRequestError] = useState<string | null>(null);
  const [leaveRequestDraft, setLeaveRequestDraftState] = useState({
    userId: "",
    startDate: "",
    endDate: "",
    type: "" as "pto" | "sick" | "team_holiday" | "other" | "",
    reason: "",
  });
  const createLeave = useAgencyMemberProfileStore((state) => state.createLeave);
  const leaveRequestPending = useAgencyMemberProfileStore((state) => state.leavePending);

  const focusMonthKey = useMemo(() => focusMonthKeyFromAnchor(anchor), [anchor]);
  const presenceWindow = useMemo(() => monthWindowDateKeys(focusMonthKey), [focusMonthKey]);
  const utcOffsetMinutes = new Date().getTimezoneOffset();

  const activityHeatQuery = useQuery({
    ...orpc.agencyOps.activityHeat.list.queryOptions({
      input: {
        teamId,
        fromDate: presenceWindow.fromDate,
        toDate: presenceWindow.toDate,
        utcOffsetMinutes,
      },
    }),
    enabled: Boolean(teamId),
  });

  const leaveQuery = useQuery({
    ...orpc.agencyOps.leave.list.queryOptions({
      input: {
        teamId,
        fromDate: presenceWindow.fromDate,
        toDate: addDaysToDateKey(presenceWindow.toDate, 45),
      },
    }),
    enabled: Boolean(teamId),
  });

  const activityRows = useMemo<ResourcingActivityHeatMemberRow[]>(() => {
    const fromDate = activityHeatQuery.data?.fromDate ?? presenceWindow.fromDate;
    const toDate = activityHeatQuery.data?.toDate ?? presenceWindow.toDate;
    return (activityHeatQuery.data?.members ?? []).map((member) => ({
      userId: member.userId,
      userName: member.userName,
      heatMap: toActivityHeatMap(fromDate, toDate, member.days),
    }));
  }, [activityHeatQuery.data, presenceWindow.fromDate, presenceWindow.toDate]);

  const calendarDays = useMemo(
    () => buildPresenceCalendarDays(activityRows, focusMonthKey),
    [activityRows, focusMonthKey],
  );

  useEffect(() => {
    setSelectedDate((current) => {
      if (current && calendarDays.some((day) => day.date === current && !isWeekend(current))) {
        return current;
      }
      return defaultSelectedDate(focusMonthKey, calendarDays);
    });
  }, [calendarDays, focusMonthKey]);

  useEffect(() => {
    if (activityRows.length === 0) {
      setSelectedPersonId(null);
      return;
    }
    setSelectedPersonId((current) =>
      current && activityRows.some((row) => row.userId === current)
        ? current
        : (activityRows[0]?.userId ?? null),
    );
  }, [activityRows]);

  const selectedDay = useMemo(
    () => calendarDays.find((day) => day.date === selectedDate) ?? null,
    [calendarDays, selectedDate],
  );

  const selectedOut = useMemo<ResourcingOutPerson[]>(() => {
    if (!selectedDate || !selectedDay) return [];
    return selectedDay.out.map((person) => {
      const heatDay = activityRows
        .find((row) => row.userId === person.userId)
        ?.heatMap.days.find((day) => day.date === selectedDate);
      const rawType = typeof heatDay?.off?.type === "string" ? heatDay.off.type : "other";
      return {
        ...person,
        leaveType: leaveTypeLabel(rawType),
        leaveReason: heatDay?.off?.reason ?? null,
      };
    });
  }, [activityRows, selectedDate, selectedDay]);

  const selectedWorkingCount =
    selectedDate && isWeekend(selectedDate) ? 0 : (selectedDay?.working.length ?? 0);
  const memberCount = activityRows.length;
  const coveragePct = memberCount > 0 ? Math.round((selectedWorkingCount / memberCount) * 100) : 0;

  const filmstripDays = useMemo<ResourcingFilmstripDay[]>(() => {
    const dates = buildFilmstrip(selectedDate, focusMonthKey);
    return dates.map((date) => {
      const cell = calendarDays.find((day) => day.date === date);
      const workingCount = cell?.working.length ?? 0;
      return {
        date,
        dayOfMonth: Number(date.slice(8, 10)),
        weekdayShort: weekdayShort(date),
        workingCount,
        memberCount,
        weekend: isWeekend(date),
      };
    });
  }, [calendarDays, focusMonthKey, memberCount, selectedDate]);

  const filmstripRangeLabel = useMemo(() => {
    const first = filmstripDays[0]?.date;
    const last = filmstripDays[filmstripDays.length - 1]?.date;
    if (!first || !last) return "";
    const fmt = (dateKey: string) =>
      new Date(`${dateKey}T00:00:00Z`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    return `${fmt(first)} → ${fmt(last)}`;
  }, [filmstripDays]);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of activityRows) map.set(row.userId, row.userName);
    return map;
  }, [activityRows]);

  const agenda = useMemo<ResourcingAbsenceAgendaItem[]>(() => {
    const items = leaveQuery.data?.items ?? [];
    return items
      .filter((item) => item.endDate >= presenceWindow.fromDate)
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate))
      .slice(0, 8)
      .map((item) => ({
        id: item.id,
        userId: item.userId,
        userName:
          item.userId == null
            ? "Team holiday"
            : (nameByUserId.get(item.userId) ?? shortDisplayName(item.userId)),
        startDate: item.startDate,
        endDate: item.endDate,
        type: leaveTypeLabel(item.type),
        reason: item.reason,
        daySpan: inclusiveDaySpan(item.startDate, item.endDate),
      }));
  }, [leaveQuery.data?.items, nameByUserId, presenceWindow.fromDate]);

  const selectedPerson =
    activityRows.find((row) => row.userId === selectedPersonId) ?? activityRows[0] ?? null;

  const selectedPersonMonthDays = useMemo(() => {
    if (!selectedPerson) return [];
    return selectedPerson.heatMap.days
      .filter((day) => day.date.startsWith(focusMonthKey))
      .map((day) => ({ date: day.date, off: day.off }));
  }, [focusMonthKey, selectedPerson]);

  const selectedPersonOutDays = selectedPersonMonthDays.filter((day) => day.off).length;

  const selectedDayLabel = selectedDate
    ? new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : "—";

  const briefingDayNumber = selectedDate ? selectedDate.slice(8, 10) : "—";
  const briefingWeekday = selectedDate ? weekdayShort(selectedDate).toUpperCase() : "—";
  const todayKey = new Date().toISOString().slice(0, 10);
  const briefingHeadline = selectedDate
    ? `${selectedDate === todayKey ? "Today" : selectedDayLabel}, ${selectedWorkingCount} of ${memberCount || 0} people are working.`
    : "Select a day to see coverage.";
  const selectedDaySummary =
    selectedOut.length === 0
      ? "Full-team coverage."
      : `${selectedOut.length} ${selectedOut.length === 1 ? "person is" : "people are"} unavailable.`;

  return {
    grain,
    periodTitle: periodLabel(anchor, grain),
    focusMonthKey,
    focusMonthLabel: monthLabelFromKey(focusMonthKey),
    activityRows,
    calendarDays,
    filmstripDays,
    filmstripRangeLabel,
    selectedDate,
    selectedDay,
    selectedOut,
    selectedWorkingCount,
    coveragePct,
    briefingDayNumber,
    briefingWeekday,
    briefingHeadline,
    briefingSentence: outSentence(selectedOut),
    selectedDayLabel,
    selectedDaySummary,
    agenda,
    selectedPersonId: selectedPerson?.userId ?? null,
    selectedPerson,
    selectedPersonOutDays,
    selectedPersonMonthDays,
    memberCount,
    isPending:
      (activityHeatQuery.isPending && !activityHeatQuery.data) ||
      (leaveQuery.isPending && !leaveQuery.data),
    isError: activityHeatQuery.isError || leaveQuery.isError,
    errorMessage: activityHeatQuery.isError
      ? getErrorMessage(activityHeatQuery.error, "Try refreshing.")
      : getErrorMessage(leaveQuery.error, "Try refreshing."),
    leaveRequestOpen,
    leaveRequestPending,
    leaveRequestError,
    leaveRequestDraft,
    setGrain: (nextGrain) => {
      setGrain(nextGrain);
      setAnchor(periodAnchorUtc(new Date(), nextGrain));
    },
    goPrevPeriod: () => setAnchor((current) => shiftPeriodAnchor(current, grain, -1)),
    goNextPeriod: () => setAnchor((current) => shiftPeriodAnchor(current, grain, 1)),
    selectDate: (date) => {
      if (isWeekend(date)) return;
      setSelectedDate(date);
    },
    selectPerson: setSelectedPersonId,
    openLeaveRequest: () => {
      setLeaveRequestError(null);
      setLeaveRequestDraftState({
        userId: selectedPersonId ?? activityRows[0]?.userId ?? "",
        startDate: selectedDate ?? `${focusMonthKey}-01`,
        endDate: selectedDate ?? `${focusMonthKey}-01`,
        type: "",
        reason: "",
      });
      setLeaveRequestOpen(true);
    },
    closeLeaveRequest: () => {
      setLeaveRequestOpen(false);
      setLeaveRequestError(null);
    },
    setLeaveRequestDraft: (patch) => {
      setLeaveRequestDraftState((current) => ({ ...current, ...patch }));
    },
    submitLeaveRequest: async () => {
      setLeaveRequestError(null);
      const { userId, startDate, endDate, type, reason } = leaveRequestDraft;
      if (!userId || !startDate || !endDate || !type) {
        setLeaveRequestError("Choose a teammate, dates, and leave type before submitting.");
        return false;
      }
      if (endDate < startDate) {
        setLeaveRequestError("End date must be on or after the start date.");
        return false;
      }
      try {
        await createLeave({
          teamId,
          userId: type === "team_holiday" ? null : userId,
          startDate,
          endDate,
          type,
          reason: reason.trim() || null,
        });
        void activityHeatQuery.refetch();
        void leaveQuery.refetch();
        setLeaveRequestOpen(false);
        return true;
      } catch (error) {
        setLeaveRequestError(getErrorMessage(error, "Couldn't submit leave request."));
        return false;
      }
    },
    exportCsv: () => {
      const rows: string[][] = [["Team member", "Date", "Status"]];
      for (const member of activityRows) {
        for (const day of member.heatMap.days) {
          if (!day.date.startsWith(focusMonthKey) || isWeekend(day.date)) continue;
          rows.push([member.userName, day.date, day.off ? day.off.type : "Working"]);
        }
      }
      const csv = rows
        .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
        .join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `orch-resourcing-${focusMonthKey}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
    refetch: () => {
      void activityHeatQuery.refetch();
      void leaveQuery.refetch();
    },
  };
}
