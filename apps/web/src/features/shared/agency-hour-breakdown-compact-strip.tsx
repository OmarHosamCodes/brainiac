import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format-duration";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

import {
  buildHourBreakdownSegments,
  deriveInternalSplit,
  type AgencyHourBreakdownMetrics,
} from "./agency-hour-breakdown-flow";

export type AgencyHourBreakdownCompactStripProps = AgencyHourBreakdownMetrics & {
  className?: string;
  totalLabel?: string;
};

/** Compact Paid / Waste / Internal strip — same language as AgencyHourBreakdownFlow. */
export function AgencyHourBreakdownCompactStrip({
  className,
  totalLabel = "Total in filtered range",
  totalSeconds,
  externalSeconds,
  internalSeconds,
  internalBillableSeconds,
  paidSeconds,
}: AgencyHourBreakdownCompactStripProps) {
  const metrics = {
    totalSeconds,
    externalSeconds,
    internalSeconds,
    internalBillableSeconds,
    paidSeconds,
  };
  const { wasteSeconds } = deriveInternalSplit(metrics);
  const segments = buildHourBreakdownSegments(metrics).filter(
    (segment) =>
      segment.id === "paid" || segment.id === "waste" || segment.id === "internalBillable",
  );
  // Fold non-billable internal into a single Internal lane for the compact strip.
  const internalCombined = internalSeconds;
  const compact = [
    segments.find((s) => s.id === "paid")!,
    segments.find((s) => s.id === "waste")!,
    {
      id: "internal" as const,
      label: "Internal",
      shortLabel: "Internal",
      purpose: "Internal-client hours (billable and non-billable).",
      seconds: internalCombined,
      barClass: "bg-info",
      dotClass: "bg-info",
    },
  ];
  const denom = Math.max(1, paidSeconds + wasteSeconds + internalCombined);

  return (
    <TooltipProvider delayDuration={120}>
      <div className={cn("space-y-2 px-1", className)} aria-label="Hour composition">
        <p className="text-xs text-muted">
          {totalLabel}{" "}
          <span className="font-mono font-semibold tabular-nums text-foreground">
            {formatDuration(totalSeconds, "clock")}
          </span>
        </p>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-hidden>
          {compact.map((segment) => {
            if (segment.seconds <= 0) return null;
            const width = `${(segment.seconds / denom) * 100}%`;
            return (
              <span key={segment.id} className={cn("h-full", segment.barClass)} style={{ width }} />
            );
          })}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {compact.map((segment) => (
            <li key={segment.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className={cn("size-2 rounded-full", segment.dotClass)} aria-hidden />
                    <span className="font-medium text-foreground">{segment.label}</span>
                    <span className="font-mono tabular-nums">
                      {formatDuration(segment.seconds, "clock")}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[16rem] px-3 py-2 text-left">
                  <p className="text-[11px] leading-snug">{segment.purpose}</p>
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </div>
    </TooltipProvider>
  );
}
