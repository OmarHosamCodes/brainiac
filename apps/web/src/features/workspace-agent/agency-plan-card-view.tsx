import { RecommendationCard } from "@/components/elements/recommendation-card";
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

function planBody(plan: AgencyPlanCardViewModel) {
  const steps = plan.steps.map((step, index) => `${index + 1}. ${step.label}`).join(" ");
  return [plan.summary.trim(), steps].filter(Boolean).join(" ");
}

/** Confirm-plan card — elements RecommendationCard (no Alternatives). */
export function AgencyPlanCardView({
  plan,
  confirming,
  onConfirm,
  className,
  embedded = false,
}: AgencyPlanCardViewProps) {
  return (
    <RecommendationCard
      state={confirming ? "accepted" : "idle"}
      question={plan.title}
      confidenceLabel={`${plan.steps.length} steps`}
      acceptedLabel="Confirming…"
      onAccept={onConfirm}
      className={cn(embedded ? "max-w-none" : "max-w-[min(100%,36rem)]", className)}
    >
      {planBody(plan)}
    </RecommendationCard>
  );
}
