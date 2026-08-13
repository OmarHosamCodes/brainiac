export function shouldOfferComposerDraftRestore(input: { liveDraft: string; serverText: string }) {
  return input.liveDraft.trim().length === 0 && input.serverText.trim().length > 0;
}

export function formatComposerDraftSavedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
