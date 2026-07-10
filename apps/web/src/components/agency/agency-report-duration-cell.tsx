"use client";

import { useMemo, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AggregatedReportRow } from "@/lib/utils/agency-report-grouping";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

function formatEntryDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatEntryTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

const entryItemClass =
  "flex items-start justify-between gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-default/80";

type AgencyReportDurationCellProps = {
  row: AggregatedReportRow;
};

export function AgencyReportDurationCell({ row }: AgencyReportDurationCellProps) {
  const [open, setOpen] = useState(false);
  const duration = formatDuration(row.durationSeconds, "clock");
  const grouped = row.entryCount > 1;
  const entries = useMemo(
    () =>
      [...row.entries].sort(
        (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
      ),
    [row.entries],
  );

  if (!grouped) {
    return <span className="font-mono tabular-nums">{duration}</span>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-baseline gap-1 font-mono tabular-nums",
            "rounded px-1 -mx-1 transition-colors hover:bg-muted/60",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-label={`${duration}, ${row.entryCount} entries. Show details.`}
          onClick={(event) => event.stopPropagation()}
        >
          <span>{duration}</span>
          <span className="text-[10px] font-sans font-semibold text-dimmed">x{row.entryCount}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="space-y-1 border-b border-default px-3 py-2.5">
          <p className="text-sm font-semibold text-highlighted">
            {duration}
            <span className="font-normal text-muted"> total</span>
          </p>
          {row.taskTitle ? (
            <p className="truncate text-xs text-highlighted" title={row.taskTitle}>
              {row.taskTitle}
            </p>
          ) : null}
          <p className="text-xs text-muted">
            {row.userName}
            {row.description ? (
              <>
                <span aria-hidden="true"> · </span>
                <span className="text-highlighted">{row.description}</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {entries.map((entry) => (
            <div key={entry.id} className={entryItemClass}>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-highlighted">
                  {formatEntryDate(entry.startedAt)}
                  <span className="text-dimmed"> {formatEntryTime(entry.startedAt)}</span>
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                {formatDuration(entry.durationSeconds, "clock")}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
