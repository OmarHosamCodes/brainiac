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
        "text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60",
        className,
      )}
    >
      {children}
    </span>
  );
}
