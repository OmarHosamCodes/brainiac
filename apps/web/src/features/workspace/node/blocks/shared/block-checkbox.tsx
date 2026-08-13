import { Checkbox } from "@/ui/checkbox";
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
    <Checkbox
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn("size-5", className)}
      onCheckedChange={(value) => onCheckedChange(value === true)}
    />
  );
}
