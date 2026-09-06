import { ChevronRight } from "lucide-react";

import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/collapsible";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";

export type MoneyFxOverrideFieldProps = {
  sourceCurrency: string;
  agencyCurrency: string;
  teamRate: string | null;
  value: string | null;
  onChange: (value: string | null) => void;
  error: string | null;
};

export function MoneyFxOverrideField({
  sourceCurrency,
  agencyCurrency,
  teamRate,
  value,
  onChange,
  error,
}: MoneyFxOverrideFieldProps) {
  const open = value != null;

  return (
    <div className="flex flex-col gap-1.5">
      {teamRate ? (
        <p className="text-[11px] text-muted">
          1 {sourceCurrency} = {teamRate} {agencyCurrency}
        </p>
      ) : null}
      <Collapsible
        open={open}
        onOpenChange={(nextOpen) => onChange(nextOpen ? (value ?? teamRate ?? "") : null)}
      >
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="group -ml-2 h-7 gap-1.5 px-2 text-muted hover:text-highlighted"
          >
            <ChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-90 motion-reduce:transition-none" />
            Use a different rate
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={cn(agencyFormFieldClass, "pt-2")}>
            <Label htmlFor="money-fx-override-rate" className={agencyFormLabelClass}>
              Rate
            </Label>
            <Input
              id="money-fx-override-rate"
              inputMode="decimal"
              value={value ?? ""}
              onChange={(event) => onChange(event.target.value)}
              placeholder={teamRate ?? ""}
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? "money-fx-override-rate-error" : "money-fx-override-rate-hint"
              }
              className={cn(
                "h-9 rounded-xl border-default bg-default text-sm tabular-nums",
                agencyInputPlaceholderClass,
              )}
            />
            {error ? (
              <p
                id="money-fx-override-rate-error"
                className="text-xs text-destructive"
                role="alert"
              >
                {error}
              </p>
            ) : (
              <p id="money-fx-override-rate-hint" className="text-[11px] text-muted">
                Applies only to this expense. Team rates stay the same.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
