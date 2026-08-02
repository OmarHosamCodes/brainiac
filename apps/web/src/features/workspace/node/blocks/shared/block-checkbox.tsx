import { cn } from "@/lib/utils";

type BlockCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export function BlockCheckbox({
  checked,
  onCheckedChange,
  className,
  disabled,
  "aria-label": ariaLabel,
}: BlockCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "size-5 shrink-0 cursor-pointer rounded border border-input accent-primary",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  );
}
