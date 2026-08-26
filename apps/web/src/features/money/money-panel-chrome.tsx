import { type ReactNode } from "react";
import { motion } from "motion/react";

import { agencyFocusRingClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { moneyBaseTransition } from "@/features/money/money-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

export const moneyPanelHeaderClass = "flex flex-col gap-3 border-b border-default p-5 pb-4";

export function MoneyPanelTitleRow({
  title,
  children,
  headingId,
  headingTabIndex,
}: {
  title: ReactNode;
  children?: ReactNode;
  headingId?: string;
  headingTabIndex?: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <h2
        id={headingId}
        tabIndex={headingTabIndex}
        className="min-w-0 text-sm font-semibold leading-snug text-balance text-highlighted"
      >
        {title}
      </h2>
      {children ? (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none sm:gap-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MoneyPanelCount({ children }: { children: ReactNode }) {
  return (
    <span className={cn(agencyMetricClass, "text-xs tabular-nums text-muted")}>{children}</span>
  );
}

export function MoneyPanelMetricBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <div className="text-[0.625rem] font-medium tracking-[0.06em] text-muted uppercase">
            {label}
          </div>
          <div
            className={cn(
              agencyMetricClass,
              "mt-0.5 font-mono text-base font-semibold tabular-nums tracking-tight text-highlighted",
            )}
          >
            {value}
          </div>
        </div>
        {hint ? (
          <p className="max-w-sm text-xs text-muted text-balance sm:text-end" aria-live="polite">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function MoneyPanelFilterPill({
  label,
  selected,
  onSelect,
  layoutId,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  layoutId: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "relative inline-flex h-10 items-center rounded-full px-3 text-xs font-medium transition-colors duration-150 sm:h-7 sm:px-2.5",
        agencyFocusRingClass,
        selected ? "text-highlighted" : "text-muted hover:bg-elevated/70 hover:text-highlighted",
        "motion-reduce:transition-none",
      )}
      onClick={onSelect}
    >
      {selected ? (
        <motion.span
          layoutId={layoutId}
          className="absolute inset-0 rounded-full bg-elevated ring-1 ring-border"
          transition={moneyBaseTransition}
          aria-hidden
        />
      ) : null}
      <span className="relative z-10">{label}</span>
    </button>
  );
}

export function MoneyPanelFilterRow({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role={label ? "group" : undefined}
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function MoneyPeriodFxLine({
  label,
  canApplyCurrent,
  applying,
  onApplyCurrent,
}: {
  label: string | null;
  canApplyCurrent: boolean;
  applying: boolean;
  onApplyCurrent: () => void;
}) {
  if (!label && !canApplyCurrent) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {label ? <p className="text-xs text-muted">{label}</p> : null}
      {canApplyCurrent ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted"
          disabled={applying}
          onClick={onApplyCurrent}
        >
          Update from current FX
        </Button>
      ) : null}
    </div>
  );
}
