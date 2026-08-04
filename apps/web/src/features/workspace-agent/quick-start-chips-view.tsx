import { AnimatePresence, motion } from "motion/react";

import type { WorkspaceAgentQuickStart } from "@/features/workspace-agent/workspace-agent-quick-starts";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

export type WorkspaceAgentQuickStartChipsViewProps = {
  starts: WorkspaceAgentQuickStart[];
  visible: boolean;
  onSelect: (start: WorkspaceAgentQuickStart) => void;
  className?: string;
  /** Floating dock vs empty-thread nest. */
  density?: "compact" | "comfortable";
};

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

export function WorkspaceAgentQuickStartChipsView({
  starts,
  visible,
  onSelect,
  className,
  density = "compact",
}: WorkspaceAgentQuickStartChipsViewProps) {
  const compact = density === "compact";

  return (
    <AnimatePresence initial={false}>
      {visible && starts.length > 0 ? (
        <motion.div
          key="workspace-agent-quick-starts"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4, transition: { duration: 0.12 } }}
          transition={{ duration: 0.18, ease: EASE_OUT_QUART }}
          className={cn(
            "pointer-events-auto flex min-w-0 flex-wrap content-center gap-1.5",
            className,
          )}
          role="group"
          aria-label="Quick starts"
        >
          {starts.map((start, index) => (
            <motion.div
              key={start.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.16,
                delay: index * 0.03,
                ease: EASE_OUT_QUART,
              }}
            >
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "rounded-full border-border bg-card text-foreground motion-safe:transition-colors motion-safe:duration-150",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:ring-2 focus-visible:ring-ring/40",
                  compact ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
                )}
                onClick={() => onSelect(start)}
              >
                {start.label}
              </Button>
            </motion.div>
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
