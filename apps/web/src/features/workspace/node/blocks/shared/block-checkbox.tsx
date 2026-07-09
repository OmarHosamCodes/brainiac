import { cn } from "@/lib/utils";

type BlockCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  "aria-label"?: string;
};

export function BlockCheckbox({
  checked,
  onCheckedChange,
  className,
  "aria-label": ariaLabel,
}: BlockCheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      aria-label={ariaLabel}
      className={cn(
        "size-5 shrink-0 cursor-pointer rounded border border-input accent-primary",
        className,
      )}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  );
}
