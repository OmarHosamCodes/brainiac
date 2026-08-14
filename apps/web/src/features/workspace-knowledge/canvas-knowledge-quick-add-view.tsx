import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

export type CanvasKnowledgeQuickAddViewProps = {
  title: string;
  pending: boolean;
  error: string | null;
  pendingLabel: string | null;
  onTitleChange: (title: string) => void;
  onSubmit: () => void;
};

export function CanvasKnowledgeQuickAddView({
  title,
  pending,
  error,
  pendingLabel,
  onTitleChange,
  onSubmit,
}: CanvasKnowledgeQuickAddViewProps) {
  return (
    <form
      className="flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-xl border border-default bg-default p-3 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Quick note"
          aria-label="Quick note"
          disabled={pending}
        />
        <Button type="submit" disabled={pending || title.trim().length === 0}>
          Add
        </Button>
      </div>
      {pendingLabel ? <p className="text-xs text-toned">{pendingLabel}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </form>
  );
}
