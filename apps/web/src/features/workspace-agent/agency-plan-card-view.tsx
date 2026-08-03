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
};

/** Presentational Confirm-plan card for Agency Plan mode. */
export function AgencyPlanCardView({
  plan,
  confirming,
  onConfirm,
  className,
}: AgencyPlanCardViewProps) {
  return (
    <div
      className={cn(
        "max-w-[min(100%,36rem)] rounded-lg border border-border bg-card p-3 text-card-foreground",
        className,
      )}
    >
      <div className="text-sm font-medium">{plan.title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{plan.summary}</p>
      <ol className="mt-2 list-decimal space-y-1 ps-4 text-xs">
        {plan.steps.map((step, index) => (
          <li key={`${plan.planId}-${index}`}>{step.label}</li>
        ))}
      </ol>
      <div className="mt-3 flex justify-end">
        <Button type="button" size="sm" disabled={confirming} onClick={onConfirm}>
          {confirming ? "Confirming…" : "Confirm plan"}
        </Button>
      </div>
    </div>
  );
}
