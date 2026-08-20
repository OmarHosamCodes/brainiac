import { ArrowLeft } from "lucide-react";

import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

type AgencyTaskThreadShellViewProps = {
  title: string;
  onBack: () => void;
  className?: string;
};

export function AgencyTaskThreadShellView({
  title,
  onBack,
  className,
}: AgencyTaskThreadShellViewProps) {
  return (
    <div
      role="region"
      aria-label={`Task thread: ${title}`}
      className={cn("flex h-full min-h-0 flex-col bg-card", className)}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Back" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title}</h2>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <p className="text-sm text-muted">Thread coming soon</p>
      </div>
    </div>
  );
}
