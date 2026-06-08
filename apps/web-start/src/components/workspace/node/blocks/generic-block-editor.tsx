import type { WorkspaceBlock } from "@brainiac/workspace";
import { Bot, CopyPlus, Play, Save, Trash2 } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceNodeEditor } from "@/components/workspace/node/context";

export type WorkspaceBlockEditorProps<TBlock extends WorkspaceBlock = WorkspaceBlock> = {
  tabId: string;
  block: TBlock;
  canEdit: boolean;
};

const READONLY_KEYS = new Set([
  "id",
  "type",
  "createdAt",
  "updatedAt",
  "definitionId",
  "latestOutput",
  "latestAiOutput",
  "outputHistory",
]);

const MULTILINE_KEYS = new Set([
  "body",
  "content",
  "description",
  "notes",
  "prompt",
  "analysis",
  "latestOutput",
  "latestAiOutput",
]);

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function GenericWorkspaceBlockEditor(props: WorkspaceBlockEditorProps) {
  const editor = useWorkspaceNodeEditor();
  const operation = editor.getBlockOperationState(props.tabId, props.block.id);
  const searchText = editor.getBlockSearchText(props.block);
  const summary = React.useMemo(() => getBlockSummary(props.block), [props.block]);

  const updateAtPath = React.useCallback(
    (path: Array<string | number>, value: JsonValue) => {
      editor.mutateBlock(props.tabId, props.block.id, (block) => {
        setValueAtPath(block as unknown as JsonValue, path, value);
      });
    },
    [editor, props.block.id, props.tabId],
  );

  const removeAtPath = React.useCallback(
    (path: Array<string | number>) => {
      editor.mutateBlock(props.tabId, props.block.id, (block) => {
        removeValueAtPath(block as unknown as JsonValue, path);
      });
    },
    [editor, props.block.id, props.tabId],
  );

  const duplicateAtPath = React.useCallback(
    (path: Array<string | number>) => {
      editor.mutateBlock(props.tabId, props.block.id, (block) => {
        duplicateValueAtPath(block as unknown as JsonValue, path);
      });
    },
    [editor, props.block.id, props.tabId],
  );

  return (
    <article className="rounded-3xl border bg-background p-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{props.block.type}</Badge>
            {operation.pending ? <Badge variant="muted">{operation.label ?? "Working"}</Badge> : null}
          </div>
          <Input
            className="mt-3 h-10 border-0 bg-muted px-3 text-base font-bold shadow-none"
            value={props.block.title}
            disabled={!props.canEdit}
            onChange={(event) =>
              editor.updateBlockTitle(props.tabId, props.block.id, event.currentTarget.value)
            }
            aria-label="Block title"
          />
          {summary ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{summary}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {props.block.type === "ai-prompt" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!props.canEdit || operation.pending}
              onClick={() => void editor.runPromptBlock(props.tabId, props.block.id)}
            >
              <Play className="size-4" />
              Run
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={editor.isAgentContextBlock(props.tabId, props.block.id) ? "default" : "outline"}
            onClick={() => editor.toggleAgentContextBlock(props.tabId, props.block.id)}
          >
            <Bot className="size-4" />
            Context
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => void editor.saveBlockToMarketplace(props.tabId, props.block)}
            aria-label="Save block to marketplace"
          >
            <Save className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={!props.canEdit}
            onClick={() => editor.removeBlock(props.tabId, props.block.id)}
            aria-label="Delete block"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

      {props.block.type === "notes" ? (
        <div className="mt-4">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => editor.toggleNotePreview(props.block.id)}
          >
            {editor.isNotePreviewEnabled(props.block.id) ? "Edit notes" : "Preview notes"}
          </Button>
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <ObjectEditor
          value={props.block as unknown as Record<string, JsonValue>}
          path={[]}
          disabled={!props.canEdit}
          searchText={searchText}
          onChange={updateAtPath}
          onRemove={removeAtPath}
          onDuplicate={duplicateAtPath}
        />
      </div>
    </article>
  );
}

function ObjectEditor(props: {
  value: Record<string, JsonValue>;
  path: Array<string | number>;
  disabled: boolean;
  searchText: string;
  onChange(path: Array<string | number>, value: JsonValue): void;
  onRemove(path: Array<string | number>): void;
  onDuplicate(path: Array<string | number>): void;
}) {
  return (
    <div className="grid gap-3">
      {Object.entries(props.value)
        .filter(([key]) => !READONLY_KEYS.has(key))
        .map(([key, value]) => (
          <FieldEditor
            key={[...props.path, key].join(".")}
            label={formatLabel(key)}
            fieldKey={key}
            value={value}
            path={[...props.path, key]}
            disabled={props.disabled}
            onChange={props.onChange}
            onRemove={props.onRemove}
            onDuplicate={props.onDuplicate}
          />
        ))}
    </div>
  );
}

function FieldEditor(props: {
  label: string;
  fieldKey: string;
  value: JsonValue;
  path: Array<string | number>;
  disabled: boolean;
  onChange(path: Array<string | number>, value: JsonValue): void;
  onRemove(path: Array<string | number>): void;
  onDuplicate(path: Array<string | number>): void;
}) {
  if (props.value === null) {
    return <ReadOnlyField label={props.label} value="Not set" />;
  }

  if (typeof props.value === "boolean") {
    return (
      <label className="flex items-center gap-3 rounded-2xl border bg-muted/30 px-3 py-2 text-sm">
        <Checkbox
          checked={props.value}
          disabled={props.disabled}
          onCheckedChange={(checked) => props.onChange(props.path, checked === true)}
        />
        <span className="font-semibold">{props.label}</span>
      </label>
    );
  }

  if (typeof props.value === "number") {
    return (
      <LabeledField label={props.label}>
        <Input
          type="number"
          value={Number.isFinite(props.value) ? String(props.value) : "0"}
          disabled={props.disabled}
          onChange={(event) => props.onChange(props.path, Number(event.currentTarget.value))}
        />
      </LabeledField>
    );
  }

  if (typeof props.value === "string") {
    const isLong = MULTILINE_KEYS.has(props.fieldKey) || props.value.length > 80;
    return (
      <LabeledField label={props.label}>
        {isLong ? (
          <Textarea
            rows={Math.min(8, Math.max(3, props.value.split("\n").length + 1))}
            value={props.value}
            disabled={props.disabled}
            onChange={(event) => props.onChange(props.path, event.currentTarget.value)}
          />
        ) : (
          <Input
            value={props.value}
            disabled={props.disabled}
            onChange={(event) => props.onChange(props.path, event.currentTarget.value)}
          />
        )}
      </LabeledField>
    );
  }

  if (Array.isArray(props.value)) {
    return (
      <section className="rounded-2xl border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold">{props.label}</h4>
          <Badge variant="muted">{props.value.length}</Badge>
        </div>
        <div className="mt-3 grid gap-3">
          {props.value.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries.</p>
          ) : (
            props.value.map((item, index) => (
              <div key={index} className="rounded-2xl border bg-background p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Badge variant="outline">Entry {index + 1}</Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={props.disabled}
                      onClick={() => props.onDuplicate([...props.path, index])}
                      aria-label={`Duplicate ${props.label} entry ${index + 1}`}
                    >
                      <CopyPlus className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={props.disabled}
                      onClick={() => props.onRemove([...props.path, index])}
                      aria-label={`Remove ${props.label} entry ${index + 1}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {isPlainObject(item) ? (
                  <ObjectEditor
                    value={item}
                    path={[...props.path, index]}
                    disabled={props.disabled}
                    searchText=""
                    onChange={props.onChange}
                    onRemove={props.onRemove}
                    onDuplicate={props.onDuplicate}
                  />
                ) : (
                  <FieldEditor
                    label="Value"
                    fieldKey="value"
                    value={item}
                    path={[...props.path, index]}
                    disabled={props.disabled}
                    onChange={props.onChange}
                    onRemove={props.onRemove}
                    onDuplicate={props.onDuplicate}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </section>
    );
  }

  if (isPlainObject(props.value)) {
    return (
      <section className="rounded-2xl border bg-muted/20 p-3">
        <h4 className="mb-3 text-sm font-bold">{props.label}</h4>
        <ObjectEditor
          value={props.value}
          path={props.path}
          disabled={props.disabled}
          searchText=""
          onChange={props.onChange}
          onRemove={props.onRemove}
          onDuplicate={props.onDuplicate}
        />
      </section>
    );
  }

  return <ReadOnlyField label={props.label} value={String(props.value)} />;
}

function LabeledField(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}

function ReadOnlyField(props: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {props.label}
      </span>
      <p className="rounded-2xl border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        {props.value}
      </p>
    </div>
  );
}

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setValueAtPath(root: JsonValue, path: Array<string | number>, value: JsonValue) {
  const parent = getParentAtPath(root, path);
  const key = path[path.length - 1];
  if (!parent || key === undefined) return;
  (parent as Record<string, JsonValue> | JsonValue[])[key as never] = value as never;
}

function removeValueAtPath(root: JsonValue, path: Array<string | number>) {
  const parent = getParentAtPath(root, path);
  const key = path[path.length - 1];
  if (!Array.isArray(parent) || typeof key !== "number") return;
  parent.splice(key, 1);
}

function duplicateValueAtPath(root: JsonValue, path: Array<string | number>) {
  const parent = getParentAtPath(root, path);
  const key = path[path.length - 1];
  if (!Array.isArray(parent) || typeof key !== "number") return;
  const current = parent[key];
  if (current === undefined) return;
  parent.splice(key + 1, 0, cloneJsonValue(current));
}

function getParentAtPath(root: JsonValue, path: Array<string | number>) {
  let current: JsonValue = root;
  for (const segment of path.slice(0, -1)) {
    if (current === null || typeof current !== "object") return null;
    current = (current as Record<string, JsonValue> | JsonValue[])[segment as never] as JsonValue;
  }
  return current;
}

function cloneJsonValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function getBlockSummary(block: WorkspaceBlock) {
  if ("tasks" in block && Array.isArray(block.tasks)) {
    return `${block.tasks.length} tasks`;
  }
  if ("items" in block && Array.isArray(block.items)) {
    return `${block.items.length} items`;
  }
  if ("cards" in block && Array.isArray(block.cards)) {
    return `${block.cards.length} cards`;
  }
  if ("metrics" in block && Array.isArray(block.metrics)) {
    return `${block.metrics.length} metrics`;
  }
  if ("milestones" in block && Array.isArray(block.milestones)) {
    return `${block.milestones.length} milestones`;
  }
  if (block.type === "notes") {
    return block.body.trim() ? `${block.body.trim().split(/\s+/).length} words` : "Empty notes";
  }

  return null;
}
