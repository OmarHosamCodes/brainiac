import { motion, MotionConfig } from "motion/react";

import type { GaugeDetailModel } from "@/features/member-profile/member-profile-gauge-detail";
import {
  memberProfileGaugeContentFade,
  memberProfileGaugeLayoutId,
  memberProfileGaugeMorphTransition,
} from "@/features/member-profile/member-profile-gauge-morph";
import {
  instrumentPlateInkClass,
  StatPlateGlyph,
} from "@/features/member-profile/member-profile-instrument-plate";
import { agencyFocusRingClass, agencyWorkMetaClass } from "@/features/shared/agency-ui";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

type Props = {
  detail: GaugeDetailModel | null;
  onClose: () => void;
  onPrimaryAction: () => void;
};

export function MemberProfileGaugeDetailDialog({ detail, onClose, onPrimaryAction }: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const open = detail !== null;
  const layoutId =
    detail && !prefersReducedMotion ? memberProfileGaugeLayoutId(detail.key) : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-md",
          // Shared-layout morph owns the enter; kill default zoom so it does not fight.
          "duration-0 data-open:fade-in-0 data-open:zoom-in-100 data-closed:fade-out-0 data-closed:zoom-out-100",
        )}
        showCloseButton={false}
      >
        {detail ? (
          <MotionConfig reducedMotion="user">
            <motion.div
              layoutId={layoutId}
              transition={memberProfileGaugeMorphTransition}
              className="relative rounded-[min(var(--radius-4xl),24px)] border border-border bg-card shadow-xl ring-1 ring-foreground/5 dark:ring-foreground/10"
            >
              <DialogHeader className="border-b border-border px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <div
                    className={cn("h-8 w-16 shrink-0", instrumentPlateInkClass(detail.tone))}
                    aria-hidden
                  >
                    <StatPlateGlyph
                      plateKey={detail.key}
                      ratio={detail.ratio}
                      segments={detail.streakSegments}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base">{detail.title}</DialogTitle>
                    <p className="mt-1 font-mono text-xl font-semibold tracking-tight tabular-nums text-foreground">
                      {detail.metric}
                    </p>
                    <p className="mt-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {detail.shortLabel}
                    </p>
                  </div>
                </div>
                <DialogDescription className="mt-3 text-pretty text-start">
                  {detail.explain}
                </DialogDescription>
              </DialogHeader>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={memberProfileGaugeContentFade}
                className="max-h-[min(18rem,40vh)] overflow-y-auto px-4 py-3 sm:px-5"
              >
                {detail.rows.length > 0 ? (
                  <ul className="flex list-none flex-col gap-0 p-0">
                    {detail.rows.map((row, index) => (
                      <li
                        key={`${row.label}-${index}`}
                        className="flex items-baseline justify-between gap-3 border-t border-border/60 py-2.5 first:border-t-0 first:pt-0"
                      >
                        <span className="min-w-0 text-sm text-foreground">{row.label}</span>
                        {row.meta ? (
                          <span
                            className={cn(agencyWorkMetaClass, "shrink-0 font-mono tabular-nums")}
                          >
                            {row.meta}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : detail.emptyLabel ? (
                  <p className={agencyWorkMetaClass}>{detail.emptyLabel}</p>
                ) : null}
              </motion.div>

              <DialogFooter className="border-t border-border px-4 py-3 sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  className={agencyFocusRingClass}
                  onClick={onClose}
                >
                  Close
                </Button>
                {detail.primaryAction ? (
                  <Button type="button" className={agencyFocusRingClass} onClick={onPrimaryAction}>
                    {detail.primaryAction.label}
                  </Button>
                ) : null}
              </DialogFooter>
            </motion.div>
          </MotionConfig>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
