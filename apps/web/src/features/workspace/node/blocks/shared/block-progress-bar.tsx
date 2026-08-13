import { cn } from "@/lib/utils";

type BlockProgressBarProps = {
  value: number;
  max: number;
  className?: string;
};

export function BlockProgressBar({ value, max, className }: BlockProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / Math.max(max, 1)) * 100));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-all duration-300 motion-reduce:transition-none"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
