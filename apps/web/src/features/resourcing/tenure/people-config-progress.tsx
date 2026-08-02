import { cn } from "@/lib/utils";

type PeopleConfigProgressProps = {
  value: number;
  label: string;
  className?: string;
};

export function PeopleConfigProgress({ value, label, className }: PeopleConfigProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("bg-elevated h-1.5 overflow-hidden rounded-full", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        className="bg-highlighted h-full rounded-full motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
