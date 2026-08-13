import { useLayoutEffect, useRef, useState } from "react";
import {
  DEFAULT_WORK_SCHEDULE,
  monthGridPad,
  rotateWeekdayLabels,
} from "@orch/api/routers/agency-ops/resourcing/work-schedule";

import {
  STRIP_WEEK_COL_PX,
  stripFillWeekCount,
} from "@/features/member-profile/member-profile-heat-strip-fill";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

export type MemberProfileHeatDay = {
  date: string;
  totalSeconds: number;
  intensity: number;
  off: { type: string; reason: string | null } | null;
  offBand: "start" | "middle" | "end" | "single" | null;
  hoursLabel: string;
  dayOfMonthLabel: string;
};

export type MemberProfileHeatMapData = {
  startDate: string;
  endDate: string;
  days: MemberProfileHeatDay[];
};

/** Cool Orch intensity ramp — chromatic `chart-2` so dark mode doesn't collapse to grey/white. */
export const HEAT_INTENSITY: Record<number, string> = {
  0: "bg-muted",
  1: "bg-chart-2/25",
  2: "bg-chart-2/45",
  3: "bg-chart-2/70",
  4: "bg-chart-2",
};

const WEEKDAY_LABELS_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function leaveTypeLabel(type: string) {
  if (type === "pto") return "PTO";
  if (type === "sick") return "Sick";
  if (type === "team_holiday") return "Team holiday";
  if (type === "other") return "Other";
  return type;
}

function offBandRadius(band: MemberProfileHeatDay["offBand"]) {
  switch (band) {
    case "start":
      return "rounded-t-[3px] rounded-b-none";
    case "middle":
      return "rounded-none";
    case "end":
      return "rounded-b-[3px] rounded-t-none";
    case "single":
      return "rounded-[3px]";
    case null:
      return "rounded-[3px]";
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

function monthLabelsForWeeks(weeks: MemberProfileHeatDay[][]) {
  const labels: Array<{ weekIndex: number; label: string }> = [];
  let lastMonth = "";
  weeks.forEach((week, weekIndex) => {
    const firstReal = week.find((day) => !day.date.startsWith("pad-"));
    if (!firstReal) return;
    const month = firstReal.date.slice(0, 7);
    if (month === lastMonth) return;
    lastMonth = month;
    const date = new Date(`${firstReal.date}T00:00:00Z`);
    labels.push({
      weekIndex,
      label: date.toLocaleString(undefined, { month: "short", timeZone: "UTC" }),
    });
  });
  return labels;
}

function heatDayNumberClass(intensity: number, isOff: boolean) {
  if (isOff && intensity === 0) return "text-foreground";
  if (intensity >= 3) return "text-white";
  return "text-foreground";
}

function HeatPadCell({ sizeClass }: { sizeClass: string }) {
  return <span className={cn(sizeClass, "rounded-[3px]", HEAT_INTENSITY[0])} aria-hidden />;
}

function emptyHeatDay(key: string): MemberProfileHeatDay {
  return {
    date: key,
    totalSeconds: 0,
    intensity: 0,
    off: null,
    offBand: null,
    hoursLabel: "",
    dayOfMonthLabel: "",
  };
}

function buildHeatWeeks(
  days: MemberProfileHeatDay[],
  startDate: string,
  weekStartsOn: number = DEFAULT_WORK_SCHEDULE.weekStartsOn,
): MemberProfileHeatDay[][] {
  const padded: MemberProfileHeatDay[] = [...days];
  const first = new Date(`${padded[0]?.date ?? startDate}T00:00:00Z`);
  const pad = monthGridPad(first.getUTCDay(), weekStartsOn);
  for (let i = 0; i < pad; i++) {
    padded.unshift(emptyHeatDay(`pad-start-${i}`));
  }
  while (padded.length % 7 !== 0) {
    padded.push(emptyHeatDay(`pad-end-${padded.length}`));
  }
  const weeks: MemberProfileHeatDay[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }
  return weeks;
}

function HeatCell({
  day,
  sizeClass,
  showDayNumber,
  selected,
  onFocus,
}: {
  day: MemberProfileHeatDay;
  sizeClass: string;
  showDayNumber: boolean;
  selected: boolean;
  onFocus: () => void;
}) {
  const title = day.off
    ? `${day.date}: ${day.hoursLabel || "0m"} · off (${leaveTypeLabel(day.off.type)}${
        day.off.reason ? ` · ${day.off.reason}` : ""
      })`
    : `${day.date}: ${day.hoursLabel}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            sizeClass,
            "inline-flex items-center justify-center transition-transform duration-150 ease-out",
            "hover:z-10 hover:scale-125 active:scale-95",
            "motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
            agencyFocusRingClass,
            HEAT_INTENSITY[day.intensity] ?? HEAT_INTENSITY[0],
            showDayNumber &&
              cn(
                "text-[10px] font-semibold leading-none",
                heatDayNumberClass(day.intensity, Boolean(day.off)),
              ),
            day.off
              ? cn(
                  "ring-1 ring-warning",
                  day.intensity === 0 && "bg-warning/45",
                  offBandRadius(day.offBand),
                )
              : "rounded-[3px]",
            selected && "z-10 ring-2 ring-foreground ring-offset-1 ring-offset-card",
          )}
          aria-label={title}
          onClick={onFocus}
        >
          {showDayNumber ? day.dayOfMonthLabel : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{title}</TooltipContent>
    </Tooltip>
  );
}

export function MemberProfileHeatMap({
  heatMap,
  layout,
  onFocusDay,
  selectedDate = null,
  fillToWidth = true,
  weekStartsOn = DEFAULT_WORK_SCHEDULE.weekStartsOn,
}: {
  heatMap: MemberProfileHeatMapData;
  layout: "compact" | "strip";
  onFocusDay: (date: string) => void;
  selectedDate?: string | null;
  /** When false, skip empty week padding (avoids width feedback loops in nested layouts). */
  fillToWidth?: boolean;
  weekStartsOn?: number;
}) {
  const weekdayLabels = rotateWeekdayLabels(WEEKDAY_LABELS_MON_FIRST, weekStartsOn);
  const weeks = buildHeatWeeks(heatMap.days, heatMap.startDate, weekStartsOn);
  const monthLabels = monthLabelsForWeeks(weeks);
  const stripRef = useRef<HTMLDivElement>(null);
  const [stripFillWeeks, setStripFillWeeks] = useState(0);

  useLayoutEffect(() => {
    if (layout !== "strip" || !fillToWidth) {
      setStripFillWeeks(0);
      return;
    }
    const node = stripRef.current;
    if (!node) return;
    // Measure the width-constrained shell, not the week row (fill weeks must not widen the observer).
    const target = node;

    function measure() {
      const next = stripFillWeekCount(target.clientWidth, weeks.length);
      setStripFillWeeks((prev) => (prev === next ? prev : next));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [fillToWidth, layout, weeks.length]);

  if (layout === "compact") {
    return (
      <TooltipProvider delayDuration={120}>
        <div
          className="inline-grid min-w-max grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1"
          role="img"
          aria-label={`Contribution ${heatMap.startDate} to ${heatMap.endDate}`}
        >
          <span className="size-8" aria-hidden />
          {weekdayLabels.map((label) => (
            <span
              key={label}
              className="flex size-8 items-center justify-center text-[10px] font-medium text-muted-foreground"
            >
              {label.slice(0, 1)}
            </span>
          ))}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="contents">
              <span className="flex size-8 items-center text-[10px] font-medium text-muted-foreground">
                {weekIndex === 0
                  ? monthLabels[0]?.label
                  : monthLabels.find((entry) => entry.weekIndex === weekIndex)?.label || ""}
              </span>
              {week.map((day, dayIndex) =>
                day.date.startsWith("pad-") ? (
                  <HeatPadCell key={`pad-${weekIndex}-${dayIndex}`} sizeClass="size-8" />
                ) : (
                  <HeatCell
                    key={day.date}
                    day={day}
                    sizeClass="size-8"
                    showDayNumber
                    selected={day.date === selectedDate}
                    onFocus={() => onFocusDay(day.date)}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  const fillWeeks: MemberProfileHeatDay[][] = Array.from(
    { length: stripFillWeeks },
    (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => emptyHeatDay(`fill-${weekIndex}-${dayIndex}`)),
  );
  const displayWeeks = [...weeks, ...fillWeeks];

  return (
    <TooltipProvider delayDuration={120}>
      <div ref={stripRef} className="w-full min-w-0 overflow-hidden">
        <div className="flex w-full min-w-0 gap-1">
          <div className="flex w-7 shrink-0 flex-col gap-1 pt-5">
            {weekdayLabels.map((label, index) => (
              <span
                key={label}
                className={cn(
                  "flex h-3 items-center text-[10px] font-medium leading-none text-muted-foreground",
                  index % 2 === 1 ? "opacity-0" : "",
                )}
              >
                {label}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="relative mb-1 h-4">
              {monthLabels.map((entry) => (
                <span
                  key={`${entry.label}-${entry.weekIndex}`}
                  className="absolute top-0 text-[10px] font-medium text-muted-foreground"
                  style={{ left: `${entry.weekIndex * STRIP_WEEK_COL_PX}px` }}
                >
                  {entry.label}
                </span>
              ))}
            </div>
            <div
              className="flex gap-1"
              role="img"
              aria-label={`Contribution ${heatMap.startDate} to ${heatMap.endDate}`}
            >
              {displayWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex shrink-0 flex-col gap-1">
                  {week.map((day) =>
                    day.date.startsWith("pad-") || day.date.startsWith("fill-") ? (
                      <HeatPadCell key={day.date} sizeClass="size-3" />
                    ) : (
                      <HeatCell
                        key={day.date}
                        day={day}
                        sizeClass="size-3"
                        showDayNumber={false}
                        selected={day.date === selectedDate}
                        onFocus={() => onFocusDay(day.date)}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
