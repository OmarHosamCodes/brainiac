import { Button } from "@/ui/button";
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
  onOpenBoard?: (href: string) => void;
  className?: string;
  embedded?: boolean;
};

function previewJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Presentational Approve/Reject card — Approach A before/after panels. */
export function AgencyProposalCardView({
  proposal,
  busy,
  onApprove,
  onReject,
  onOpenBoard,
  className,
  embedded = false,
}: AgencyProposalCardViewProps) {
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
        Proposed change
      </p>
      <div className="mt-1.5 text-base font-semibold tracking-tight">{proposal.label}</div>
      <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
        Review before/after, then Approve or Reject.
      </p>
      <div className="mt-3 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg border border-border bg-muted/30 p-2.5">
          <div className="mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Before
          </div>
          <pre className="max-h-28 overflow-auto text-[10px] leading-snug whitespace-pre-wrap text-foreground/80">
            {previewJson(proposal.before)}
          </pre>
        </div>
        <div
          aria-hidden
          className="hidden items-center justify-center text-muted-foreground sm:flex"
        >
          →
        </div>
        <div className="rounded-lg border border-border bg-muted/30 p-2.5 ring-1 ring-foreground/5">
          <div className="mb-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            After
          </div>
          <pre className="max-h-28 overflow-auto text-[10px] leading-snug whitespace-pre-wrap text-foreground/80">
            {previewJson(proposal.after)}
          </pre>
        </div>
      </div>
      <div className="mt-3.5 flex justify-end gap-2">
        {proposal.boardHref && onOpenBoard ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onOpenBoard(proposal.boardHref!)}
            className="h-8 rounded-full px-4"
          >
            Open on board
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onReject}
          className="h-8 rounded-full px-4"
        >
          Reject
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={onApprove}
          className="h-8 min-w-24 rounded-full px-4 font-medium"
        >
          {busy ? "Approving…" : "Approve"}
        </Button>
      </div>
    </div>
  );
}
