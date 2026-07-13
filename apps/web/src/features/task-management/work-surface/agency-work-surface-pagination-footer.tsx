import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/ui/button";
import { agencyTimeWeekFooterClass } from "@/features/shared/agency-ui";

type AgencyWorkSurfacePaginationFooterProps = {
  rangeStart: number;
  rangeEnd: number;
  total: number;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
};

export function AgencyWorkSurfacePaginationFooter({
  rangeStart,
  rangeEnd,
  total,
  previousDisabled = true,
  nextDisabled = false,
  onPrevious,
  onNext,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: AgencyWorkSurfacePaginationFooterProps) {
  if (total === 0) return null;

  return (
    <div className={agencyTimeWeekFooterClass}>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={previousDisabled}
          aria-label="Previous page"
          onClick={onPrevious}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <p className="font-mono text-xs tabular-nums text-muted">
          {rangeStart}-{rangeEnd} of {total}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={nextDisabled}
          aria-label="Next page"
          onClick={onNext}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {pageSize !== undefined && pageSizeOptions && onPageSizeChange ? (
        <label className="flex items-center gap-2 text-xs text-muted">
          <span className="relative inline-flex items-center">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="appearance-none rounded-md border border-default bg-default py-1 pl-2 pr-6 font-mono text-xs tabular-nums leading-none text-highlighted"
              aria-label="Items per page"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-1.5 top-1/2 size-3 shrink-0 -translate-y-1/2 text-muted"
              aria-hidden
            />
          </span>
          <span>Items per page</span>
        </label>
      ) : null}
    </div>
  );
}
