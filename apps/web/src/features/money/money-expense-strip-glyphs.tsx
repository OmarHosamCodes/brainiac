import {
  instrumentPlateInkClass,
  instrumentPlateSurfaceClass,
} from "@/features/member-profile/member-profile-instrument-plate";
import { cn } from "@/lib/utils";

const STRIP_GLYPH_VIEW = "0 0 64 32";

/** Equal cadence bars — recurring subscription rhythm. */
function SubscriptionCadenceGlyph({ className }: { className?: string }) {
  const barWidth = 6;
  const barGap = 3;
  const barCount = 5;
  const barHeight = 14;
  const baseY = 26;
  const totalWidth = barCount * barWidth + (barCount - 1) * barGap;
  const startX = (64 - totalWidth) / 2;

  return (
    <svg viewBox={STRIP_GLYPH_VIEW} className={className} aria-hidden>
      <rect x="2" y={baseY} width="60" height="2" rx="1" className="fill-current opacity-20" />
      {Array.from({ length: barCount }, (_, index) => (
        <rect
          key={index}
          x={startX + index * (barWidth + barGap)}
          y={baseY - barHeight}
          width={barWidth}
          height={barHeight}
          rx="1.5"
          className="fill-current opacity-90"
        />
      ))}
      <path
        d={`M ${startX} ${baseY + 1} H ${startX + totalWidth}`}
        fill="none"
        className="stroke-current opacity-35"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

/** Single dominant bar — one-off spend. */
function OneTimeSpikeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox={STRIP_GLYPH_VIEW} className={className} aria-hidden>
      <rect x="2" y="26" width="60" height="2" rx="1" className="fill-current opacity-20" />
      <rect x="26" y="5" width="12" height="21" rx="1.5" className="fill-current" />
      <line
        x1="32"
        y1="5"
        x2="32"
        y2="1"
        className="stroke-current opacity-55"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ExpenseStripGlyph({ kind }: { kind: "one_time" | "subscription" }) {
  const ink = instrumentPlateInkClass("neutral");
  const Glyph = kind === "subscription" ? SubscriptionCadenceGlyph : OneTimeSpikeGlyph;

  return (
    <div
      className={cn(
        instrumentPlateSurfaceClass(),
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border p-1.5",
        ink,
      )}
      aria-hidden
    >
      <Glyph className="h-full w-full" />
    </div>
  );
}
