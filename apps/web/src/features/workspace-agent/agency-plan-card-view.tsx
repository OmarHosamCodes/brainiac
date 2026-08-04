import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

export type AgencyPlanCardViewModel = {
  planId: string;
  title: string;
  summary: string;
  steps: Array<{ label: string }>;
};

type AgencyPlanCardViewProps = {
  plan: AgencyPlanCardViewModel;
  confirming: boolean;
  onConfirm: () => void;
  className?: string;
  embedded?: boolean;
};

/** Presentational Confirm-plan card — Approach A numbered steps + ink CTA. */
export function AgencyPlanCardView({
  plan,
  confirming,
  onConfirm,
  className,
  embedded = false,
}: AgencyPlanCardViewProps) {
  return (
    <div
      className={cn(
        "max-w-[min(100%,36rem)] text-card-foreground",
        embedded
          ? "rounded-none border-0 bg-transparent p-0"
          : "rounded-xl border border-border bg-card p-4",
        className,
      )}
    >
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        Plan to confirm
      </p>
      <div className="mt-1.5 text-base font-semibold tracking-tight">{plan.title}</div>
      <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
        {plan.summary}
      </p>
      <ol className="mt-3 grid gap-2">
        {plan.steps.map((step, index) => (
          <li
            key={`${plan.planId}-${index}`}
            className="grid grid-cols-[22px_1fr] items-start gap-2 text-xs"
          >
            <span className="flex size-[22px] items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <span className="pt-0.5 leading-snug text-foreground">{step.label}</span>
          </li>
        ))}
      </ol>
      <div className="mt-3.5 flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={confirming}
          onClick={onConfirm}
          className="h-8 min-w-28 rounded-full px-4 font-medium"
        >
          {confirming ? "Confirming…" : "Confirm plan"}
        </Button>
      </div>
    </div>
  );
}
