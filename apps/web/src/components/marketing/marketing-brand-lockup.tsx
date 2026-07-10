import { Link } from "react-router-dom";

import { BrandMark } from "@/features/app-shell/components/brand-mark";
import { cn } from "@/lib/utils";

type MarketingBrandLockupProps = {
  className?: string;
  linkToHome?: boolean;
};

export function MarketingBrandLockup({ className, linkToHome = false }: MarketingBrandLockupProps) {
  const content = (
    <div className={cn("flex items-center gap-2.5 text-sm font-bold tracking-tight", className)}>
      <BrandMark className="size-7" />
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
