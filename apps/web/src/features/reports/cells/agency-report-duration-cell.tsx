"use client";

import { ChevronDown } from "lucide-react";

import type { AggregatedReportRow } from "@/features/reports/agency-report-grouping";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

const durationTriggerClass = cn(
  "-mx-4 -my-3 inline-flex min-h-10 w-[calc(100%+2rem)] items-center justify-end gap-1 px-4 py-3 font-mono tabular-nums",
  "rounded-none transition-colors hover:bg-muted/60",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

type AgencyReportDurationCellProps = {
  row: AggregatedReportRow;
  onEditDetails?: () => void;
};

export function AgencyReportDurationCell({ row, onEditDetails }: AgencyReportDurationCellProps) {
  const duration = formatDuration(row.durationSeconds, "clock");
  const grouped = row.entryCount > 1;

  if (!onEditDetails) {
    return (
      <span className="inline-flex min-h-10 items-center gap-1 font-mono tabular-nums">
        <span>{duration}</span>
        {grouped ? (
          <span className="text-[10px] font-sans font-semibold text-dimmed">x{row.entryCount}</span>
        ) : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={durationTriggerClass}
      aria-label={
        grouped
          ? `${duration}, ${row.entryCount} entries. Edit details.`
          : `${duration}. Edit details.`
      }
      onClick={(event) => {
        event.stopPropagation();
        onEditDetails();
      }}
    >
      <span>{duration}</span>
      {grouped ? (
        <span className="text-[10px] font-sans font-semibold text-dimmed">x{row.entryCount}</span>
      ) : null}
      <ChevronDown className="size-3.5 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
