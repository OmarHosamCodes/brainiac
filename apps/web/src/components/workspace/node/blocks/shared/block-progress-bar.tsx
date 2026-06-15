import { cn } from "@/lib/utils";

type BlockProgressBarProps = {
  value: number;
  max: number;
  className?: string;
};

export function BlockProgressBar({ value, max, className }: BlockProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted/20", className)}>
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
