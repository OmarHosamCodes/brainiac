import { cn } from "@/lib/utils";

type BlockSelectOption = {
  label: string;
  value: string;
};

type BlockSelectProps = {
  value: string;
  options: BlockSelectOption[];
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function BlockSelect({
  value,
  options,
  onValueChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: BlockSelectProps) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value || "__empty"} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
