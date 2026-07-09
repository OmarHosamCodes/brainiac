import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { agencyWorkTableHeaderClass, agencyWorkTableHeaderMetaClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyWorkSurfaceTableHeaderItem = {
  icon: LucideIcon;
  label: string;
  secondaryIcon?: LucideIcon;
};

type AgencyWorkSurfaceTableHeaderViewProps = {
  meta: AgencyWorkSurfaceTableHeaderItem[];
  taskLabel?: ReactNode;
};

export function AgencyWorkSurfaceTableHeaderView({
  meta,
  taskLabel = "Task",
}: AgencyWorkSurfaceTableHeaderViewProps) {
  return (
    <div className={cn(agencyWorkTableHeaderClass, "hidden sm:grid")}>
      <span>{taskLabel}</span>
      <div className={agencyWorkTableHeaderMetaClass}>
        {meta.map(({ icon: Icon, label, secondaryIcon: SecondaryIcon }) => (
          <span key={label} className="inline-flex min-w-0 items-center gap-1.5">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {SecondaryIcon ? <SecondaryIcon className="size-3.5 shrink-0" aria-hidden /> : null}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
