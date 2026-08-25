import type { MoneyStatsCardId } from "@/features/billing/money-stats-fixtures";
import { cn } from "@/lib/utils";

export function clampPlateRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio));
}

function CollectionPaceGlyph({
  ratio,
  className,
}: {
  ratio: number;
  className?: string;
}) {
  const r = clampPlateRatio(ratio);
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect x="4" y="11" width="56" height="6" rx="1.5" className="fill-current opacity-20" />
      {r > 0 ? (
        <rect x="4" y="11" width={56 * r} height="6" rx="1.5" className="fill-current" />
      ) : null}
      <line
        x1={4 + 56 * 0.85}
        y1="7"
        x2={4 + 56 * 0.85}
        y2="21"
        className="stroke-current opacity-55"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

function DeductionsStackGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect x="4" y="22" width="56" height="1.5" rx="0.75" className="fill-current opacity-20" />
      <rect x="8" y="18" width="10" height="4" rx="1" className="fill-current opacity-90" />
      <rect x="27" y="13" width="10" height="9" rx="1" className="fill-current opacity-65" />
      <rect x="46" y="20" width="10" height="2" rx="1" className="fill-current opacity-35" />
    </svg>
  );
}

function ProfitArcGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden fill="none">
      <path
        d="M10 24A54 54 0 0 1 54 24"
        className="stroke-current opacity-25"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M10 24A54 54 0 0 1 48 8"
        className="stroke-current"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AllocationsSegmentsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden fill="none">
      <rect
        x="4"
        y="16"
        width="16"
        height="10"
        rx="1"
        className="stroke-current fill-current opacity-15"
        strokeWidth="1.5"
      />
      <rect
        x="24"
        y="12"
        width="16"
        height="14"
        rx="1"
        className="stroke-current"
        strokeWidth="1.5"
      />
      <rect
        x="44"
        y="18"
        width="16"
        height="8"
        rx="1"
        className="stroke-current opacity-60"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MoneyStatsPlateGlyph({
  plateId,
  collectedRatio = 0,
  className,
}: {
  plateId: MoneyStatsCardId;
  collectedRatio?: number;
  className?: string;
}) {
  const glyphClass = cn("h-full w-full", className);

  switch (plateId) {
    case "income-cash":
      return <CollectionPaceGlyph ratio={collectedRatio} className={glyphClass} />;
    case "deductions":
      return <DeductionsStackGlyph className={glyphClass} />;
    case "profitability":
      return <ProfitArcGlyph className={glyphClass} />;
    case "allocations":
      return <AllocationsSegmentsGlyph className={glyphClass} />;
    default: {
      const _exhaustive: never = plateId;
      return _exhaustive;
    }
  }
}
