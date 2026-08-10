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
  className?: string;
  embedded?: boolean;
};

function previewJson(value: unknown) {
  if (value == null) return "Nothing yet";
  if (typeof value === "string" && value.trim() === "") return "Nothing yet";
  try {
    const text = JSON.stringify(value, null, 2);
    return text && text !== "null" ? text : "Nothing yet";
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
      <div className="text-base font-semibold tracking-tight">{proposal.label}</div>
      <p className="mt-1 max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
        Review before and after, then Approve or Reject.
      </p>
      <div className="mt-3 grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-lg bg-muted/40 p-2.5">
          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Before</div>
          <pre className="max-h-28 overflow-auto font-mono text-[11px] leading-snug whitespace-pre-wrap text-foreground/80">
            {previewJson(proposal.before)}
          </pre>
        </div>
        <div
          aria-hidden
          className="hidden items-center justify-center text-muted-foreground sm:flex"
        >
          →
        </div>
        <div className="rounded-lg bg-muted/40 p-2.5">
          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">After</div>
          <pre className="max-h-28 overflow-auto font-mono text-[11px] leading-snug whitespace-pre-wrap text-foreground/80">
            {previewJson(proposal.after)}
          </pre>
        </div>
      </div>
      <div className="mt-3.5 flex justify-end gap-2">
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
