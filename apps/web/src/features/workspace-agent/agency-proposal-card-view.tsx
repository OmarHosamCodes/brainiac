import { ApprovalCard } from "@/components/elements/approval-card";
import { cn } from "@/lib/utils";

export type AgencyProposalCardViewModel = {
  proposalId: string;
  label: string;
  before: unknown;
  after: unknown;
  boardHref?: string | null;
};

type AgencyProposalCardViewProps = {
  proposal: AgencyProposalCardViewModel;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  className?: string;
  embedded?: boolean;
};

function previewJson(value: unknown) {
  if (value == null) return "Nothing yet";
  if (typeof value === "string" && value.trim() === "") return "Nothing yet";
  try {
    const text = JSON.stringify(value);
    if (!text || text === "null") return "Nothing yet";
    return text.length > 280 ? `${text.slice(0, 279)}…` : text;
  } catch {
    const text = String(value);
    return text.length > 280 ? `${text.slice(0, 279)}…` : text;
  }
}

/** Approve/Reject card — elements ApprovalCard (no Always allow). */
export function AgencyProposalCardView({
  proposal,
  busy,
  onApprove,
  onReject,
  className,
  embedded = false,
}: AgencyProposalCardViewProps) {
  return (
    <ApprovalCard
      state={busy ? "running" : "request"}
      title={proposal.label}
      subtitle="Review before and after, then approve or reject."
      command={`before ${previewJson(proposal.before)} → after ${previewJson(proposal.after)}`}
      onAllowOnce={onApprove}
      onDeny={onReject}
      className={cn(embedded ? "max-w-none" : "max-w-[min(100%,36rem)]", className)}
    />
  );
}
