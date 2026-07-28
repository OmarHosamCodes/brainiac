import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskChooserClientSectionProps = {
  clientName: string;
  projectCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function AgencyTaskChooserClientSection({
  clientName,
  projectCount,
  expanded,
  onToggle,
  children,
}: AgencyTaskChooserClientSectionProps) {
  return (
    <section className="py-1 first:pt-0">
      <button
        type="button"
        className={cn(
          "mb-0.5 flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-default/60",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="min-w-0 truncate text-xs font-medium text-muted">{clientName}</span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-normal text-dimmed tabular-nums">
          {projectCount} {projectCount === 1 ? "project" : "projects"}
          <ChevronDown
            className={cn(
              "size-3.5 text-muted transition-transform duration-200 motion-reduce:transition-none",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </span>
      </button>
      {expanded ? <div className="space-y-0.5">{children}</div> : null}
    </section>
  );
}
