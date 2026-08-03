import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

export type AgencyProposalCardViewModel = {
  proposalId: string;
  label: string;
  before: unknown;
  after: unknown;
};

type AgencyProposalCardViewProps = {
  proposal: AgencyProposalCardViewModel;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  className?: string;
};

function previewJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Presentational Approve/Reject card with before/after JSON preview. */
export function AgencyProposalCardView({
  proposal,
  busy,
  onApprove,
  onReject,
  className,
}: AgencyProposalCardViewProps) {
  return (
    <div
      className={cn(
        "max-w-[min(100%,36rem)] rounded-lg border border-border bg-card p-3 text-card-foreground",
        className,
      )}
    >
      <div className="text-sm font-medium">{proposal.label}</div>
      <p className="mt-1 text-xs text-muted-foreground">
        Review before/after, then Approve or Reject. Open the artifact pane for the illustration.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/40 p-2">
          <div className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Before
          </div>
          <pre className="max-h-32 overflow-auto text-[10px] leading-snug whitespace-pre-wrap">
            {previewJson(proposal.before)}
          </pre>
        </div>
        <div className="rounded-md border border-border bg-muted/40 p-2">
          <div className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            After
          </div>
          <pre className="max-h-32 overflow-auto text-[10px] leading-snug whitespace-pre-wrap">
            {previewJson(proposal.after)}
          </pre>
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onReject}>
          Reject
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={onApprove}>
          {busy ? "Working…" : "Approve"}
        </Button>
      </div>
    </div>
  );
}
