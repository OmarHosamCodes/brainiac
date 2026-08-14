export type KnowledgeBoardCardViewProps = {
  chip: string;
  bodyPreview?: string;
  agencyHref?: string | null;
  kind: "knowledge" | "agency" | "folder" | "inbox" | "document";
};

export function KnowledgeBoardCardView({
  chip,
  bodyPreview,
  agencyHref,
  kind,
}: KnowledgeBoardCardViewProps) {
  if (kind === "folder" || kind === "inbox") {
    return (
      <div className="flex h-full items-end px-3 py-2 text-xs text-toned">
        {kind === "inbox" ? "Unplaced cards land here" : "Drop cards here to group"}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 px-3 py-2">
      {bodyPreview ? (
        <p className="line-clamp-4 text-sm text-toned">{bodyPreview}</p>
      ) : (
        <p className="text-sm text-muted">{chip}</p>
      )}
      {agencyHref ? (
        <a
          className="mt-auto text-xs font-medium text-primary underline-offset-4 hover:underline"
          href={agencyHref}
        >
          Open in Agency
        </a>
      ) : null}
    </div>
  );
}
