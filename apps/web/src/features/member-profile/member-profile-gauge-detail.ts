import type { StatPlateKey } from "@/features/member-profile/member-profile-instrument-plate";
import {
  gaugeToneToPlateTone,
  type InstrumentPlateTone,
  statPlateShortLabel,
} from "@/features/member-profile/member-profile-instrument-plate";

export type GaugeDetailRow = {
  label: string;
  meta?: string;
};

export type GaugeDetailPrimaryAction =
  | { kind: "add_off_day"; label: string }
  | { kind: "focus_day"; label: string; date: string };

export type GaugeDetailModel = {
  key: StatPlateKey;
  title: string;
  explain: string;
  metric: string;
  shortLabel: string;
  tone: InstrumentPlateTone;
  ratio: number;
  rows: GaugeDetailRow[];
  emptyLabel: string | null;
  primaryAction: GaugeDetailPrimaryAction | null;
};

export type GaugeLeaveEntry = {
  id: string;
  startDate: string;
  endDate: string;
  typeLabel: string;
  rangeLabel: string;
};

export type GaugeDayHours = {
  date: string;
  label: string;
  hoursLabel: string;
  totalSeconds: number;
};

export type GaugeCalendarDay = {
  date: string;
  inMonth: boolean;
  status: "present" | "leave" | "holiday" | "weekend" | "empty";
  dayLabel: string;
};

export type GaugeWasteDay = {
  date: string;
  label: string;
  hoursLabel: string;
};

export type GaugeDetailContext = {
  canManageLeave: boolean;
  leavePeriodLabel: string;
  usedDays: number;
  allowanceDays: number;
  leaveEntries: GaugeLeaveEntry[];
  periodLabel: string;
  periodHoursLabel: string;
  periodTotalSeconds: number;
  periodWasteSeconds: number;
  periodWasteLabel: string;
  dayHours: GaugeDayHours[];
  calendarLabel: string;
  calendarDays: GaugeCalendarDay[];
  wasteDays: GaugeWasteDay[];
  gauge: {
    key: StatPlateKey;
    valueLabel: string;
    ratio: number;
    tone: "success" | "warning" | "foreground";
  };
  attendanceStreak?: {
    currentStreak: number;
    bestInMonth: number;
    monthPresentDays: number;
  };
};

function formatShortDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function titleForKey(key: StatPlateKey): string {
  switch (key) {
    case "leaves":
      return "Off days";
    case "period":
      return "Period hours";
    case "present":
      return "Attendance streak";
    case "waste":
      return "Waste";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

function busiestDay(days: GaugeDayHours[]): GaugeDayHours | null {
  let best: GaugeDayHours | null = null;
  for (const day of days) {
    if (day.totalSeconds <= 0) continue;
    if (!best || day.totalSeconds > best.totalSeconds) best = day;
  }
  return best;
}

export function buildGaugeDetail(context: GaugeDetailContext): GaugeDetailModel {
  const { gauge } = context;
  const key = gauge.key;
  const tone = gaugeToneToPlateTone(gauge.tone);
  const shortLabel = statPlateShortLabel(key);
  const metric = gauge.valueLabel;
  const title = titleForKey(key);

  switch (key) {
    case "leaves": {
      const rows = context.leaveEntries.map((entry) => ({
        label: entry.rangeLabel,
        meta: entry.typeLabel,
      }));
      const primaryAction: GaugeDetailPrimaryAction | null = context.canManageLeave
        ? { kind: "add_off_day", label: "Add off day" }
        : null;
      return {
        key,
        title,
        explain: `Off days used against the ${context.leavePeriodLabel} allowance (${context.usedDays} of ${context.allowanceDays}).`,
        metric,
        shortLabel,
        tone,
        ratio: gauge.ratio,
        rows,
        emptyLabel: rows.length === 0 ? "No off days recorded for this allowance period." : null,
        primaryAction,
      };
    }
    case "period": {
      const rows = context.dayHours
        .filter((day) => day.totalSeconds > 0)
        .map((day) => ({
          label: day.label,
          meta: day.hoursLabel,
        }));
      const focus = busiestDay(context.dayHours);
      return {
        key,
        title,
        explain: `Hours logged in ${context.periodLabel} (${context.periodHoursLabel} total).`,
        metric,
        shortLabel,
        tone,
        ratio: gauge.ratio,
        rows,
        emptyLabel: rows.length === 0 ? "No time logged in this period yet." : null,
        primaryAction: focus
          ? { kind: "focus_day", label: "View activity for this period", date: focus.date }
          : null,
      };
    }
    case "present": {
      const present = context.calendarDays
        .filter((day) => day.inMonth && day.status === "present")
        .sort((a, b) => b.date.localeCompare(a.date));
      const streak = context.attendanceStreak;
      const summaryRows: GaugeDetailRow[] = streak
        ? [
            { label: "This month", meta: `${streak.monthPresentDays} days` },
            { label: "Best this month", meta: `${streak.bestInMonth} days` },
          ]
        : [];
      const dayRows = present.map((day) => ({
        label: day.dayLabel,
        meta: formatShortDate(day.date),
      }));
      const latest = present[0] ?? null;
      return {
        key,
        title,
        explain: streak
          ? `Consecutive working days with logged time. Best run in ${context.calendarLabel}: ${streak.bestInMonth} days.`
          : `Days with logged time in ${context.calendarLabel}.`,
        metric,
        shortLabel,
        tone,
        ratio: gauge.ratio,
        rows: [...summaryRows, ...dayRows],
        emptyLabel:
          present.length === 0
            ? "No streak yet. Log time on a working day to start one."
            : null,
        primaryAction: latest
          ? { kind: "focus_day", label: "View latest present day", date: latest.date }
          : null,
      };
    }
    case "waste": {
      const rows = context.wasteDays.map((day) => ({
        label: day.label,
        meta: day.hoursLabel,
      }));
      const share =
        context.periodTotalSeconds <= 0
          ? 0
          : Math.round((context.periodWasteSeconds / context.periodTotalSeconds) * 100);
      const first = context.wasteDays[0] ?? null;
      return {
        key,
        title,
        explain: `Waste marked in this period (${context.periodWasteLabel}, ${share}% of logged hours).`,
        metric,
        shortLabel,
        tone,
        ratio: gauge.ratio,
        rows,
        emptyLabel: rows.length === 0 ? "No waste marked in this period." : null,
        primaryAction: first
          ? { kind: "focus_day", label: "View waste in activity", date: first.date }
          : null,
      };
    }
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}
