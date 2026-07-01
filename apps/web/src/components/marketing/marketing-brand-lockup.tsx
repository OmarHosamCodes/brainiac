import { BrainCircuit } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";

type MarketingBrandLockupProps = {
  className?: string;
  invert?: boolean;
  linkToHome?: boolean;
};

export function MarketingBrandLockup({
  className,
  invert = false,
  linkToHome = false,
}: MarketingBrandLockupProps) {
  const content = (
    <div className={cn("flex items-center gap-2.5 text-sm font-bold tracking-tight", className)}>
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-md",
          invert
            ? "bg-neutral-100 text-neutral-900"
            : "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900",
        )}
      >
        <BrainCircuit className="size-4" />
      </span>
      Brainiac
    </div>
  );

  if (linkToHome) {
    return (
      <Link to="/" className="inline-flex transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}
