import { cn } from "@/lib/utils";

import { clampPlateRatio, type MoneyStatsPlateGlyphSignal } from "./money-stats-plate-signal";

export { clampPlateRatio };

const glyphMotionClass =
  "transition-[width,transform,stroke-dashoffset,opacity] duration-300 ease-out motion-reduce:transition-none";

function CollectionPaceGlyph({ ratio, className }: { ratio: number; className?: string }) {
  const r = clampPlateRatio(ratio);
  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden>
      <rect x="2" y="13" width="60" height="8" rx="2" className="fill-current opacity-20" />
      <rect
        x="2"
        y="13"
        height="8"
        rx="2"
        className={cn("fill-current", glyphMotionClass)}
        style={{ width: 60 * r }}
      />
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

function DeductionsStackGlyph({
  bars,
  className,
}: {
  bars: [number, number, number];
  className?: string;
}) {
  const maxBar = 20;
  const baseline = 26;
  const opacities = [0.9, 0.65, 0.35] as const;
  const xs = [6, 26, 46] as const;

  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden>
      <rect x="2" y="26" width="60" height="2" rx="1" className="fill-current opacity-20" />
      {bars.map((share, index) => {
        const r = clampPlateRatio(share);
        const x = xs[index]!;
        return (
          <rect
            key={x}
            x={x}
            y={baseline - maxBar}
            width="12"
            height={maxBar}
            rx="1.5"
            className={cn("fill-current origin-bottom", glyphMotionClass)}
            style={{
              transform: `scaleY(${Math.max(0.08, r)})`,
              transformOrigin: `${x + 6}px ${baseline}px`,
              opacity: opacities[index],
            }}
          />
        );
      })}
    </svg>
  );
}

/** Semicircle track length for r=24 from (8,26) to (56,26). */
const PROFIT_ARC_LENGTH = Math.PI * 24;

function ProfitArcGlyph({ arcRatio, className }: { arcRatio: number; className?: string }) {
  const r = clampPlateRatio(arcRatio);
  const dashoffset = PROFIT_ARC_LENGTH * (1 - r);

  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden fill="none">
      <path
        d="M8 26A24 24 0 0 1 56 26"
        className="stroke-current opacity-25"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M8 26A24 24 0 0 1 56 26"
        className={cn("stroke-current", glyphMotionClass)}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={PROFIT_ARC_LENGTH}
        style={{ strokeDashoffset: dashoffset }}
      />
    </svg>
  );
}

function AllocationsSegmentsGlyph({
  blocks,
  className,
}: {
  blocks: [number, number, number];
  className?: string;
}) {
  const maxHeight = 18;
  const baseline = 30;
  const xs = [2, 23, 44] as const;
  const width = 18;

  return (
    <svg viewBox="0 0 64 32" className={className} aria-hidden fill="none">
      {blocks.map((share, index) => {
        const r = clampPlateRatio(share);
        const quiet = r <= 0;
        const x = xs[index]!;
        const scale = quiet ? 0.45 : Math.max(0.22, r);
        return (
          <rect
            key={x}
            x={x}
            y={baseline - maxHeight}
            width={width}
            height={maxHeight}
            rx="1.5"
            className={cn(
              "stroke-current origin-bottom",
              quiet ? "fill-transparent opacity-35" : "fill-current opacity-15",
              glyphMotionClass,
            )}
            strokeWidth="2"
            style={{
              transform: `scaleY(${scale})`,
              transformOrigin: `${x + width / 2}px ${baseline}px`,
            }}
          />
        );
      })}
    </svg>
  );
}

export function MoneyStatsPlateGlyph({
  glyph,
  className,
}: {
  glyph: MoneyStatsPlateGlyphSignal;
  className?: string;
}) {
  const glyphClass = cn("h-full w-full", className);

  switch (glyph.kind) {
    case "income":
      return <CollectionPaceGlyph ratio={glyph.collectedRatio} className={glyphClass} />;
    case "deductions":
      return <DeductionsStackGlyph bars={glyph.bars} className={glyphClass} />;
    case "profitability":
      return <ProfitArcGlyph arcRatio={glyph.arcRatio} className={glyphClass} />;
    case "allocations":
      return <AllocationsSegmentsGlyph blocks={glyph.blocks} className={glyphClass} />;
    default: {
      const _exhaustive: never = glyph;
      return _exhaustive;
    }
  }
}
