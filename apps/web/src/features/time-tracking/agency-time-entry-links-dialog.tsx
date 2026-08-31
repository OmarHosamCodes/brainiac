import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import {
  MAX_TIME_ENTRY_LINKS,
  normalizeTimeEntryLinkUrls,
  type TimeEntryLinkRecord,
} from "@/features/time-tracking/time-entry-links";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

type AgencyTimeEntryLinksDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: readonly TimeEntryLinkRecord[];
  saving?: boolean;
  onSave: (urls: string[]) => void | Promise<void>;
};

export function AgencyTimeEntryLinksDialog({
  open,
  onOpenChange,
  links,
  saving = false,
  onSave,
}: AgencyTimeEntryLinksDialogProps) {
  const [drafts, setDrafts] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const urls = links.map((link) => link.url);
    setDrafts(urls.length > 0 ? urls : [""]);
    setError(null);
  }, [open, links]);

  const canAddMore = drafts.length < MAX_TIME_ENTRY_LINKS;

  const handleSave = async () => {
    const normalized = normalizeTimeEntryLinkUrls(drafts);
    if (normalized.error) {
      setError(normalized.error);
      return;
    }
    setError(null);
    try {
      await onSave(normalized.urls);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save links.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Links</DialogTitle>
          <DialogDescription>
            Attach reference URLs to this time entry. They appear in Reports.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[min(24rem,50vh)] flex-col gap-2 overflow-y-auto py-1">
          {drafts.map((value, index) => (
            <div key={`link-draft-${index}`} className="flex items-center gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                {index === 0 ? (
                  <Label htmlFor={`time-entry-link-${index}`} className="sr-only">
                    Link URL
                  </Label>
                ) : null}
                <Input
                  id={`time-entry-link-${index}`}
                  type="url"
                  inputMode="url"
                  placeholder="https://…"
                  value={value}
                  disabled={saving}
                  onChange={(event) => {
                    const next = [...drafts];
                    next[index] = event.target.value;
                    setDrafts(next);
                    if (error) setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSave();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label={`Remove link ${index + 1}`}
                disabled={saving || (drafts.length === 1 && !value.trim())}
                onClick={() => {
                  if (drafts.length === 1) {
                    setDrafts([""]);
                    return;
                  }
                  setDrafts(drafts.filter((_, i) => i !== index));
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving || !canAddMore}
            onClick={() => setDrafts([...drafts, ""])}
          >
            <Plus className="size-4" />
            Add link
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              aria-busy={saving}
              disabled={saving}
              onClick={() => void handleSave()}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
