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
    <svg viewBox="0 0 64 32" className={className} aria-hidden>
      <rect x="2" y="13" width="60" height="8" rx="2" className="fill-current opacity-20" />
      {r > 0 ? (
        <rect x="2" y="13" width={60 * r} height="8" rx="2" className="fill-current" />
      ) : null}
      <line
        x1={2 + 60 * 0.85}
        y1="6"
        x2={2 + 60 * 0.85}
        y2="28"
        className="stroke-current opacity-55"
        strokeWidth="1.5"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

function DeductionsStackGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden>
      <rect x="2" y="26" width="60" height="2" rx="1" className="fill-current opacity-20" />
      <rect x="6" y="20" width="12" height="6" rx="1.5" className="fill-current opacity-90" />
      <rect x="26" y="13" width="12" height="13" rx="1.5" className="fill-current opacity-65" />
      <rect x="46" y="22" width="12" height="4" rx="1.5" className="fill-current opacity-35" />
    </svg>
  );
}

function ProfitArcGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden fill="none">
      <path
        d="M8 26A48 48 0 0 1 56 26"
        className="stroke-current opacity-25"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M8 26A48 48 0 0 1 50 7"
        className="stroke-current"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AllocationsSegmentsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden fill="none">
      <rect
        x="2"
        y="18"
        width="18"
        height="12"
        rx="1.5"
        className="stroke-current fill-current opacity-15"
        strokeWidth="2"
      />
      <rect
        x="23"
        y="12"
        width="18"
        height="18"
        rx="1.5"
        className="stroke-current"
        strokeWidth="2"
      />
      <rect
        x="44"
        y="20"
        width="18"
        height="10"
        rx="1.5"
        className="stroke-current opacity-60"
        strokeWidth="2"
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
