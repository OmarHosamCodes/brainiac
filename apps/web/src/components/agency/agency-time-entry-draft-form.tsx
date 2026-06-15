import { Link, Search, Tag, X } from "lucide-react";
import { useMemo, useState } from "react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type TimeEntryDraft = {
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationInput: string;
  description: string;
  linkUrl: string;
  tagIds: string[];
};

type Tag = {
  id: string;
  name: string;
};

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type Task = {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeName: string | null;
  dueDate: string | null;
};

type AgencyTimeEntryDraftFormProps = {
  draft: TimeEntryDraft;
  onDraftChange: (draft: TimeEntryDraft) => void;
  projects: Project[];
  tasks: Task[];
  tags: Tag[];
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onToggleTag: (tagId: string) => void;
  onUpdateDuration: (value: string) => void;
  onUpdateEndTime: (value: string) => void;
};

export function AgencyTimeEntryDraftForm({
  draft,
  onDraftChange,
  projects,
  tasks,
  tags,
  error,
  saving,
  onSave,
  onCancel,
  onToggleTag,
  onUpdateDuration,
  onUpdateEndTime,
}: AgencyTimeEntryDraftFormProps) {
  const [tagSearchTerm, setTagSearchTerm] = useState("");

  const filteredTags = useMemo(() => {
    const query = tagSearchTerm.trim().toLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tagSearchTerm, tags]);

  const selectedTags = useMemo(() => {
    const selectedIds = new Set(draft.tagIds);
    return tags.filter((tag) => selectedIds.has(tag.id));
  }, [draft.tagIds, tags]);

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft.description}
          onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
          aria-label="Time entry description"
          placeholder="What did you work on?"
          className="min-w-64 flex-1 basis-64"
          disabled={saving}
        />

        <AgencyTaskChooser
          value={draft.taskId}
          onValueChange={(taskId) => onDraftChange({ ...draft, taskId })}
          projects={projects}
          tasks={tasks}
          placeholder="Task"
          className="w-64 shrink-0 max-sm:w-full"
          disabled={saving}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={draft.date}
            onChange={(e) => onDraftChange({ ...draft, date: e.target.value })}
            type="date"
            className="w-36 shrink-0"
            aria-label="Entry date"
            disabled={saving}
          />

          <div className="flex shrink-0 items-center gap-1">
            <Input
              value={draft.startTime}
              onChange={(e) => {
                onDraftChange({ ...draft, startTime: e.target.value });
                onUpdateDuration(draft.durationInput);
              }}
              type="time"
              className="w-24 font-mono tabular-nums"
              aria-label="Start time"
              disabled={saving}
            />
            <span className="text-xs text-muted">to</span>
            <Input
              value={draft.endTime}
              onChange={(e) => onUpdateEndTime(e.target.value)}
              type="time"
              className="w-24 font-mono tabular-nums"
              aria-label="End time"
              disabled={saving}
            />
          </div>

          <Input
            value={draft.durationInput}
            onChange={(e) => onUpdateDuration(e.target.value)}
            className="w-20 shrink-0 font-mono tabular-nums"
            placeholder="1:00"
            aria-label="Duration"
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-2">
          {tags.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-sm:min-h-11 max-sm:min-w-11"
                  disabled={saving}
                  aria-label={`Tags${draft.tagIds.length > 0 ? ` (${draft.tagIds.length} selected)` : ""}`}
                >
                  <Tag className={draft.tagIds.length > 0 ? "text-primary" : ""} />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 space-y-2 p-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
                  <Input
                    value={tagSearchTerm}
                    onChange={(e) => setTagSearchTerm(e.target.value)}
                    placeholder="Search tags"
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <div className="flex max-h-52 flex-wrap gap-1 overflow-y-auto">
                  {filteredTags.map((tag) => (
                    <Button
                      key={tag.id}
                      type="button"
                      variant={draft.tagIds.includes(tag.id) ? "secondary" : "ghost"}
                      size="sm"
                      className="rounded-full"
                      disabled={saving}
                      onClick={() => onToggleTag(tag.id)}
                    >
                      {tag.name}
                    </Button>
                  ))}
                  {filteredTags.length === 0 ? (
                    <div className="px-1 py-2 text-xs text-muted">No matching tags.</div>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          ) : null}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="max-sm:min-h-11 max-sm:min-w-11"
                disabled={saving}
                aria-label="Link URL"
              >
                <Link className={draft.linkUrl ? "text-primary" : ""} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-2 p-2">
              <div className="relative">
                <Link className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
                <Input
                  value={draft.linkUrl}
                  onChange={(e) => onDraftChange({ ...draft, linkUrl: e.target.value })}
                  placeholder="Task, ticket, or brief URL"
                  className="h-8 pl-8 text-xs"
                  disabled={saving}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={saving || !draft.linkUrl}
                  onClick={() => onDraftChange({ ...draft, linkUrl: "" })}
                >
                  Clear
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button type="submit" size="sm" className="shrink-0 font-bold" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Cancel"
            disabled={saving}
            onClick={onCancel}
          >
            <X />
          </Button>
        </div>
      </div>

      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 pl-0.5">
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="rounded-full">
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
