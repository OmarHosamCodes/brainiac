import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useState } from "react";

import { AgencyHourBreakdownFlow } from "@/features/shared/agency-hour-breakdown-flow";
import { agencyFocusRingClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { projectHueFor } from "@/features/shared/project-palette";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startAngleDeg);
  const end = polarToCartesian(cx, cy, radius, endAngleDeg);
  const sweep = endAngleDeg - startAngleDeg;
  if (sweep <= 0) return "";
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

function ProjectShareDonut({
  projects,
  totalSeconds,
  isDark,
  totalButtonId,
  breakdownPanelId,
  totalLayoutId,
  expanded,
  onTotalClick,
}: {
  projects: Array<{ projectId: string; hours: number }>;
  totalSeconds: number;
  isDark: boolean;
  totalButtonId: string;
  breakdownPanelId: string;
  totalLayoutId: string;
  expanded: boolean;
  onTotalClick: () => void;
}) {
  const [teasing, setTeasing] = useState(false);
  const size = 100;
  const cx = 50;
  const cy = 50;
  const radius = 42;
  const strokeWidth = 11;
  const gapDeg = 2.8;

  const slices = projects.slice(0, 8).map((project) => {
    const hue = projectHueFor(project.projectId);
    return {
      projectId: project.projectId,
      seconds: Math.round(project.hours * 3_600),
      color: isDark ? hue.dark : hue.light,
    };
  });

  const trackedSeconds = slices.reduce((sum, slice) => sum + slice.seconds, 0);
  const total = Math.max(totalSeconds, 1);
  const trackedSweep = (trackedSeconds / total) * 360;
  const totalGap = slices.length > 1 ? (slices.length - 1) * gapDeg : 0;
  const drawableSweep = Math.max(0, trackedSweep - totalGap);

  let angle = -90;
  const arcs = slices
    .map((slice, index) => {
      const share = trackedSeconds > 0 ? slice.seconds / trackedSeconds : 0;
      const sweep = drawableSweep * share;
      const start = angle;
      const end = angle + sweep;
      angle = end + (index < slices.length - 1 ? gapDeg : 0);
      const path = describeArc(cx, cy, radius, start, end);
      if (!path) return null;
      return { ...slice, path };
    })
    .filter((arc): arc is NonNullable<typeof arc> => arc !== null);

  return (
    <div
      className="relative mt-6 flex aspect-square max-h-72 items-center justify-center"
      onMouseEnter={() => setTeasing(true)}
      onMouseLeave={() => setTeasing(false)}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-full"
        role="img"
        aria-label="Project time share"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeOpacity={teasing ? 0.5 : 0.35}
          strokeWidth={strokeWidth}
          className="transition-[stroke-opacity] duration-200 ease-out motion-reduce:transition-none"
        />
        {arcs.map((arc) => (
          <path
            key={arc.projectId}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={teasing ? strokeWidth + 1.75 : strokeWidth}
            strokeLinecap="round"
            className="transition-[stroke-width] duration-200 ease-out motion-reduce:transition-none"
          />
        ))}
      </svg>
      <motion.div
        layoutId={totalLayoutId}
        style={{ borderRadius: 9999 }}
        className="absolute flex size-32 items-center justify-center border border-default bg-default text-center"
      >
        <button
          id={totalButtonId}
          type="button"
          className={cn(
            "flex size-full cursor-pointer flex-col items-center justify-center rounded-full transition-colors duration-200 ease-out hover:bg-elevated motion-reduce:transition-none",
            agencyFocusRingClass,
          )}
          aria-expanded={expanded}
          aria-controls={breakdownPanelId}
          onFocus={() => setTeasing(true)}
          onBlur={() => setTeasing(false)}
          onClick={onTotalClick}
        >
          <p className={cn(agencyMetricClass, "text-lg")}>{formatDuration(totalSeconds)}</p>
          <p className="mt-1 text-xs text-muted">Total</p>
        </button>
      </motion.div>
    </div>
  );
}

export type AgencyProjectShareMorphProps = {
  projects: Array<{ projectId: string; hours: number }>;
  totalSeconds: number;
  externalSeconds: number;
  internalSeconds: number;
  internalBillableSeconds: number;
  paidSeconds: number;
  isDark: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  totalButtonId: string;
  breakdownPanelId: string;
};

/**
 * Project Share visual host: donut at rest, hour-breakdown flow when open.
 * The Total circle and Total bar share a layoutId so commit reads as a morph.
 */
export function AgencyProjectShareMorph({
  projects,
  totalSeconds,
  externalSeconds,
  internalSeconds,
  internalBillableSeconds,
  paidSeconds,
  isDark,
  open,
  onOpen,
  onClose,
  totalButtonId,
  breakdownPanelId,
}: AgencyProjectShareMorphProps) {
  const totalLayoutId = `${breakdownPanelId}-total`;

  const closeAndRefocus = () => {
    onClose();
    // Return focus to the trigger once the donut has remounted.
    requestAnimationFrame(() => document.getElementById(totalButtonId)?.focus());
  };

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <AnimatePresence initial={false} mode="popLayout">
        {open ? (
          <motion.div
            key="breakdown"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <AgencyHourBreakdownFlow
              className="mt-4"
              panelId={breakdownPanelId}
              totalLayoutId={totalLayoutId}
              totalSeconds={totalSeconds}
              externalSeconds={externalSeconds}
              internalSeconds={internalSeconds}
              internalBillableSeconds={internalBillableSeconds}
              paidSeconds={paidSeconds}
              onClose={closeAndRefocus}
            />
          </motion.div>
        ) : (
          <motion.div
            key="donut"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <ProjectShareDonut
              projects={projects}
              totalSeconds={totalSeconds}
              isDark={isDark}
              totalButtonId={totalButtonId}
              breakdownPanelId={breakdownPanelId}
              totalLayoutId={totalLayoutId}
              expanded={open}
              onTotalClick={onOpen}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
