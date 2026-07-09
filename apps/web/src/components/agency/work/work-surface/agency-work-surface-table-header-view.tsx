import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { AgencyWorkSurfaceTaskTableVariant } from "@/components/agency/work/work-surface/agency-work-surface-task-table-row-view";
import {
  agencyWorkTableGridClass,
  agencyWorkTableGridDelegatedClass,
  agencyWorkTableGridDoneClass,
  agencyWorkTableHeaderClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyWorkSurfaceTableHeaderItem = {
  icon: LucideIcon;
  label: string;
  secondaryIcon?: LucideIcon;
};

type AgencyWorkSurfaceTableHeaderViewProps = {
  meta: AgencyWorkSurfaceTableHeaderItem[];
  variant?: AgencyWorkSurfaceTaskTableVariant;
  taskLabel?: ReactNode;
};

function headerGridClass(variant: AgencyWorkSurfaceTaskTableVariant): string {
  switch (variant) {
    case "delegated":
      return agencyWorkTableGridDelegatedClass;
    case "done":
      return agencyWorkTableGridDoneClass;
    case "active":
      return agencyWorkTableGridClass;
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}

export function AgencyWorkSurfaceTableHeaderView({
  meta,
  variant = "active",
  taskLabel = "Task",
}: AgencyWorkSurfaceTableHeaderViewProps) {
  return (
    <div className={cn(headerGridClass(variant), agencyWorkTableHeaderClass, "hidden sm:grid")}>
      <span>{taskLabel}</span>
      {meta.map(({ icon: Icon, label, secondaryIcon: SecondaryIcon }, index) => {
        const isLast = index === meta.length - 1;
        const isActiveProjectCol = variant === "active" && index === 0;

        return (
          <span
            key={label}
            className={cn(
              "inline-flex min-w-0 items-center gap-1.5",
              isActiveProjectCol && "hidden lg:inline-flex",
              isLast && "justify-end",
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {SecondaryIcon ? <SecondaryIcon className="size-3.5 shrink-0" aria-hidden /> : null}
            {label}
          </span>
        );
      })}
    </div>
  );
}
