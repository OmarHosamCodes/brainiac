import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import {
  agencyFocusRingClass,
  agencyTaskChooserSectionHoverClass,
} from "@/features/shared/agency-ui";
import {
  chooserBaseTransition,
  chooserCollapseVariants,
  chooserTapScale,
} from "@/features/time-tracking/agency-task-chooser-motion";
import { cn } from "@/lib/utils";

type AgencyTaskChooserClientSectionProps = {
  clientName: string;
  projectCount: number;
  expanded: boolean;
  searchTerm: string;
  highlightSearch: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function AgencyTaskChooserClientSection({
  clientName,
  projectCount,
  expanded,
  searchTerm,
  highlightSearch,
  onToggle,
  children,
}: AgencyTaskChooserClientSectionProps) {
  return (
    <section className="py-1 first:pt-0">
      <motion.button
        type="button"
        className={cn(
          "mb-0.5 flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left",
          agencyTaskChooserSectionHoverClass,
          agencyFocusRingClass,
        )}
        whileTap={chooserTapScale}
        transition={chooserBaseTransition}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
          {highlightSearch ? (
            <AgencySearchHighlight text={clientName} query={searchTerm} />
          ) : (
            clientName
          )}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-normal text-muted-foreground tabular-nums">
          {projectCount} {projectCount === 1 ? "project" : "projects"}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={chooserBaseTransition}
            className="inline-flex"
          >
            <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
          </motion.span>
        </span>
      </motion.button>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="client-projects"
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={chooserCollapseVariants}
            className="overflow-hidden"
          >
            <div className="space-y-0.5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
