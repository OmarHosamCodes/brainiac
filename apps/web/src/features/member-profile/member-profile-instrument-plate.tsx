import type { ReactNode } from "react";

import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

export type InstrumentPlateTone = "warning" | "danger" | "info" | "success" | "neutral";

export type StatPlateKey = "leaves" | "period" | "present" | "waste";

export function instrumentPlateToneClass(tone: InstrumentPlateTone) {
  switch (tone) {
    case "danger":
      return {
        plate: "border-destructive/45 bg-destructive/8 hover:bg-destructive/12",
        ink: "text-destructive",
      };
    case "warning":
      return {
        plate: "border-warning/45 bg-warning/8 hover:bg-warning/12",
        ink: "text-warning",
      };
    case "success":
      return {
        plate: "border-success/45 bg-success/8 hover:bg-success/12",
        ink: "text-success",
      };
    case "info":
      return {
        plate: "border-muted-foreground/30 bg-muted/40 hover:bg-muted/55",
        ink: "text-muted-foreground",
      };
    case "neutral":
      return {
        plate: "border-border/80 bg-muted/20 hover:bg-muted/35",
        ink: "text-foreground",
      };
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function statPlateShortLabel(key: StatPlateKey): string {
  switch (key) {
    case "leaves":
      return "Off";
    case "period":
      return "Hours";
    case "present":
      return "Days";
    case "waste":
      return "Waste";
    default: {
      const _exhaustive: never = key;
      return _exhaustive;
    }
  }
}

export function gaugeToneToPlateTone(tone: "success" | "warning" | "foreground"): InstrumentPlateTone {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "foreground":
      return "neutral";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

function PaceBarGlyph({ ratio, className }: { ratio: number; className?: string }) {
  const r = Math.min(1, Math.max(0, ratio));
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <rect x="4" y="11" width="56" height="6" rx="1.5" className="fill-current opacity-20" />
      <rect
        x="4"
        y="11"
        width={Math.max(4, 56 * r)}
        height="6"
        rx="1.5"
        className="fill-current"
      />
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

function DonutGlyph({ ratio, className }: { ratio: number; className?: string }) {
  const r = Math.min(1, Math.max(0, ratio));
  const c = 2 * Math.PI * 9;
  const dash = Math.max(2, c * r);
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      <g transform="translate(32 14)">
        <circle
          r="9"
          fill="none"
          className="stroke-current opacity-25"
          strokeWidth="2"
          strokeDasharray="2 2"
        />
        <circle
          r="9"
          fill="none"
          className="stroke-current"
          strokeWidth="2.5"
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform="rotate(-90)"
        />
      </g>
    </svg>
  );
}

function PeriodHoursGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 28" className={className} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={8 + i * 10}
          y={22 - (i % 3 === 0 ? 14 : i % 3 === 1 ? 10 : 6)}
          width="6"
          height={i % 3 === 0 ? 14 : i % 3 === 1 ? 10 : 6}
          rx="1"
          className="fill-current opacity-80"
        />
      ))}
    </svg>
  );
}

export function StatPlateGlyph({
  plateKey,
  ratio,
  className,
}: {
  plateKey: StatPlateKey;
  ratio: number;
  className?: string;
}) {
  switch (plateKey) {
    case "leaves":
    case "present":
      return <PaceBarGlyph ratio={ratio} className={className} />;
    case "period":
      return <PeriodHoursGlyph className={className} />;
    case "waste":
      return <DonutGlyph ratio={ratio} className={className} />;
    default: {
      const _exhaustive: never = plateKey;
      return _exhaustive;
    }
  }
}

type InstrumentPlateProps = {
  tone: InstrumentPlateTone;
  metric: string;
  shortLabel: string;
  ariaLabel: string;
  glyph: ReactNode;
  onClick?: () => void;
};

export function InstrumentPlate({
  tone,
  metric,
  shortLabel,
  ariaLabel,
  glyph,
  onClick,
}: InstrumentPlateProps) {
  const colors = instrumentPlateToneClass(tone);
  const body = (
    <>
      <div className={cn("h-7 w-full", colors.ink)}>{glyph}</div>
      <span
        className={cn(
          "max-w-full font-mono font-semibold tracking-tight tabular-nums leading-none",
          metric.length > 8 ? "text-lg" : metric.length > 6 ? "text-xl" : "text-2xl",
        )}
      >
        {metric}
      </span>
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] opacity-90">
        {shortLabel}
      </span>
    </>
  );
  const className = cn(
    "flex min-h-[7.5rem] flex-col items-center justify-between gap-2 rounded-xl border px-3 py-3 text-center transition-[colors,transform] duration-150 ease-out",
    "motion-reduce:transition-none motion-reduce:active:scale-100",
    onClick && "active:scale-[0.985]",
    onClick && agencyFocusRingClass,
    colors.plate,
    colors.ink,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={ariaLabel}>
        {body}
      </button>
    );
  }

  return (
    <div className={className} role="img" aria-label={ariaLabel}>
      {body}
    </div>
  );
}
