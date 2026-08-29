import { type MouseEvent } from "react";
import { PanelRight } from "lucide-react";

import { Button } from "@/ui/button";
import { TableCell } from "@/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";

function stopRowClick(event: MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

export function MoneyTableActionsCell({
  settleLabel,
  settleDisabled,
  onSettle,
  detailsLabel,
  onOpenDetails,
}: {
  settleLabel: string | null;
  settleDisabled: boolean;
  onSettle?: () => void;
  detailsLabel: string;
  onOpenDetails: () => void;
}) {
  return (
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-1">
        {settleLabel && onSettle ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={settleDisabled}
            aria-haspopup="dialog"
            onClick={(event) => {
              stopRowClick(event);
              onSettle();
            }}
          >
            {settleLabel}
          </Button>
        ) : null}
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={detailsLabel}
                aria-haspopup="dialog"
                onClick={(event) => {
                  stopRowClick(event);
                  onOpenDetails();
                }}
              >
                <PanelRight className="size-3.5" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Details</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </TableCell>
  );
}
