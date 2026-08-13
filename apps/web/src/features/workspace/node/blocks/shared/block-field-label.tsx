import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BlockFieldLabelProps = {
  children: ReactNode;
  className?: string;
};

export function BlockFieldLabel({ children, className }: BlockFieldLabelProps) {
  return (
    <span
      className={cn(
        "text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}
