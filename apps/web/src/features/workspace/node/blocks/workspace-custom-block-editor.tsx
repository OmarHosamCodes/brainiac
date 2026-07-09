import type { WorkspaceCustomBlock, WorkspaceCustomBlockField } from "@brainiac/workspace";
import { AlertCircle, AlertTriangle, Loader2, Play } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { cn } from "@/lib/utils";

type BlockStatusTone = "success" | "warning" | "error" | "primary";

function getStatusAccentClass(tone: BlockStatusTone) {
  switch (tone) {
    case "success":
      return "text-success";
    case "warning":
      return "text-warning";
    case "error":
      return "text-error";
    case "primary":
      return "text-primary";
    default: {
      const _never: never = tone;
      return _never;
    }
  }
}

function getStatusBadgeClass(tone: BlockStatusTone) {
  switch (tone) {
    case "success":
      return "border-success/30 bg-success/10 text-success";
    case "warning":
      return "border-warning/30 bg-warning/10 text-warning";
    case "error":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "primary":
      return "border-primary/30 bg-primary/10 text-primary";
    default: {
      const _never: never = tone;
      return _never;
    }
  }
}

function hasFieldValue(block: WorkspaceCustomBlock, field: WorkspaceCustomBlockField) {
  const value = block.values[field.key];

  if (field.type === "checkbox") {
    return typeof value === "boolean";
  }

  if (field.type === "number") {
    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    if (typeof value === "string") {
      return value.trim().length > 0 && Number.isFinite(Number(value));
    }

    return false;
  }

  return typeof value === "string" && value.trim().length > 0;
}

function getTextValue(block: WorkspaceCustomBlock, field: WorkspaceCustomBlockField) {
  const value = block.values[field.key];
  return typeof value === "string" ? value : "";
}

function getNumericValue(block: WorkspaceCustomBlock, field: WorkspaceCustomBlockField) {
  const value = block.values[field.key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return "";
}

function getCheckedValue(block: WorkspaceCustomBlock, field: WorkspaceCustomBlockField) {
  return Boolean(block.values[field.key]);
}

function toNumberValue(value: string | number | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return numeric;
}

export function WorkspaceCustomBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceCustomBlock>) {
  const {
    mutateTypedBlock,
    getCustomTemplate,
    getCustomFormulaResult,
    formatFormulaResult,
    getCustomPromptPreview,
    runCustomPrompt,
    getBlockOperationState,
  } = useWorkspaceNodeEditorContext();

  const [runError, setRunError] = useState<string | null>(null);

  const template = getCustomTemplate(block.definitionId);
  const operationState = getBlockOperationState(tabId, block.id);
  const formulaResult = template ? getCustomFormulaResult(block) : null;

  const fieldTotal = template?.fields.length ?? 0;

  const completedFieldCount = useMemo(() => {
    if (!template) {
      return 0;
    }

    return template.fields.filter((field) => hasFieldValue(block, field)).length;
  }, [block, template]);

  const incompleteFieldCount = Math.max(0, fieldTotal - completedFieldCount);

  const completionPercent =
    fieldTotal === 0 ? 0 : Math.round((completedFieldCount / fieldTotal) * 100);

  const hasPromptTemplate = Boolean(template?.aiPromptTemplate?.trim());
  const hasLatestOutput = block.latestAiOutput.trim().length > 0;
  const latestOutputEntry = block.outputHistory[0] ?? null;

  const blockStatus = useMemo(() => {
    if (!template) {
      return {
        label: "Template missing",
        tone: "error" as const,
        description: "This block no longer has a valid template definition.",
      };
    }

    if (operationState.pending) {
      return {
        label: operationState.label || "Running template",
        tone: "primary" as const,
        description: "Generating output with the current field values.",
      };
    }

    if (runError) {
      return {
        label: "Prompt run failed",
        tone: "error" as const,
        description: runError,
      };
    }

    if (fieldTotal === 0) {
      return {
        label: "Template incomplete",
        tone: "warning" as const,
        description: "No fields are configured in this custom template.",
      };
    }

    if (incompleteFieldCount > 0) {
      return {
        label: "Capture remaining inputs",
        tone: "warning" as const,
        description: `${incompleteFieldCount} field${incompleteFieldCount === 1 ? "" : "s"} still need values.`,
      };
    }

    if (hasPromptTemplate && !hasLatestOutput) {
      return {
        label: "Ready to generate",
        tone: "primary" as const,
        description: "Run the template prompt to produce your first output.",
      };
    }

    return {
      label: "Block ready",
      tone: "success" as const,
      description: "Inputs and outputs are in sync for this template.",
    };
  }, [
    template,
    operationState.pending,
    operationState.label,
    runError,
    fieldTotal,
    incompleteFieldCount,
    hasPromptTemplate,
    hasLatestOutput,
  ]);

  const summaryCards = useMemo(
    () => [
      {
        key: "status",
        label: "Block state",
        value: blockStatus.label,
        supporting: blockStatus.description,
        accentClass: getStatusAccentClass(blockStatus.tone),
      },
      {
        key: "fields",
        label: "Field coverage",
        value: `${completedFieldCount}/${fieldTotal}`,
        supporting: `${completionPercent}% completion`,
        accentClass: "text-foreground",
      },
      {
        key: "formula",
        label: "Formula",
        value: template?.formula ? formatFormulaResult(formulaResult) : "No formula",
        supporting: template?.formula?.label || "Optional computed metric",
        accentClass: template?.formula ? "text-primary" : "text-muted-foreground",
      },
      {
        key: "ai",
        label: "AI outputs",
        value: hasPromptTemplate ? String(block.outputHistory.length) : "Disabled",
        supporting: latestOutputEntry
          ? `Last run ${formatDateTime(latestOutputEntry.createdAt)}`
          : hasPromptTemplate
            ? "No output generated yet"
            : "Template has no AI prompt",
        accentClass: hasPromptTemplate ? "text-foreground" : "text-muted-foreground",
      },
    ],
    [
      blockStatus,
      completedFieldCount,
      fieldTotal,
      completionPercent,
      template,
      formulaResult,
      formatFormulaResult,
      hasPromptTemplate,
      latestOutputEntry,
      block.outputHistory.length,
    ],
  );

  function mutateCustomBlock(mutator: (entry: WorkspaceCustomBlock) => void) {
    mutateTypedBlock(tabId, block.id, "custom", mutator);
  }

  function updateFieldValue(
    field: WorkspaceCustomBlockField,
    value: string | number | boolean | undefined,
  ) {
    mutateCustomBlock((entry) => {
      if (field.type === "checkbox") {
        entry.values[field.key] = Boolean(value);
        return;
      }

      if (field.type === "number") {
        entry.values[field.key] = toNumberValue(value as string | number | undefined);
        return;
      }

      entry.values[field.key] = String(value ?? "");
    });

    setRunError(null);
  }

  function updateNotes(value: string) {
    mutateCustomBlock((entry) => {
      entry.notes = value;
    });
  }

  async function handleRunPrompt() {
    if (!template || !hasPromptTemplate || operationState.pending) {
      return;
    }

    setRunError(null);

    try {
      await Promise.resolve(runCustomPrompt(tabId, block.id));
    } catch (error) {
      setRunError(getErrorMessage(error, "Could not run this template prompt."));
    }
  }

  if (!template) {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-warning/30 bg-warning/10 p-4 text-warning">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Template removed</p>
          <p className="mt-1 text-sm">
            This block template no longer exists. Delete this block or recreate the template
            definition.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-full border-warning/30 bg-warning/10 text-warning"
              >
                Legacy block
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {template.name}
              </Badge>
              <Badge
                variant="secondary"
                className={cn("rounded-full", getStatusBadgeClass(blockStatus.tone))}
              >
                {blockStatus.label}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{blockStatus.description}</p>
          </div>

          {operationState.pending ? (
            <Badge
              variant="secondary"
              className="rounded-full border-primary/30 bg-primary/10 text-primary"
            >
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                {operationState.label || "Running"}
              </span>
            </Badge>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.key} className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              {card.label}
            </p>
            <p
              className={cn(
                "mt-2 text-2xl font-black tracking-tight sm:text-3xl",
                card.accentClass,
              )}
            >
              {card.value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{card.supporting}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4 rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Template inputs</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Fill each field to keep formula outputs and AI responses grounded in real context.
            </p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {completedFieldCount} / {fieldTotal} complete
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {template.fields.map((field) => (
            <article
              key={field.id}
              className="rounded-2xl border border-muted/20 bg-background/50 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{field.label}</p>
                <Badge variant="secondary" className="rounded-full capitalize">
                  {field.type}
                </Badge>
              </div>

              {field.type === "textarea" ? (
                <Textarea
                  value={getTextValue(block, field)}
                  rows={4}
                  className="w-full rounded-2xl"
                  aria-label={field.label}
                  onChange={(event) => updateFieldValue(field, event.target.value)}
                />
              ) : field.type === "checkbox" ? (
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-muted/20 bg-background/70 px-3 py-2">
                  <span className="text-sm text-muted-foreground">
                    {getCheckedValue(block, field) ? "Enabled" : "Disabled"}
                  </span>
                  <BlockCheckbox
                    checked={getCheckedValue(block, field)}
                    aria-label={field.label}
                    onCheckedChange={(checked) => updateFieldValue(field, checked)}
                  />
                </label>
              ) : (
                <Input
                  value={
                    field.type === "number"
                      ? getNumericValue(block, field)
                      : getTextValue(block, field)
                  }
                  type={field.type === "number" ? "number" : "text"}
                  className="w-full rounded-2xl"
                  aria-label={field.label}
                  onChange={(event) => updateFieldValue(field, event.target.value)}
                />
              )}
            </article>
          ))}
        </div>
      </section>

      {template.formula ? (
        <section className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {template.formula.label}
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {formatFormulaResult(formulaResult)}
              </p>
            </div>

            <div className="rounded-2xl border border-muted/20 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              Expression: {template.formula.expression}
            </div>
          </div>
        </section>
      ) : null}

      {template.includeNotes ? (
        <section className="space-y-3 rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <h3 className="text-sm font-semibold text-foreground">Notes</h3>
          <Textarea
            value={block.notes}
            rows={4}
            className="w-full rounded-2xl"
            aria-label="Template notes"
            onChange={(event) => updateNotes(event.target.value)}
          />
        </section>
      ) : null}

      {template.aiPromptTemplate ? (
        <section className="space-y-4 rounded-3xl border border-muted/20 bg-background/40 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">AI prompt template</p>
              <p className="text-sm text-muted-foreground">{getCustomPromptPreview(block)}</p>
              <p className="text-xs text-muted-foreground">
                {hasLatestOutput
                  ? "Regenerate after important field changes."
                  : "Generate an initial draft once key fields are filled."}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              disabled={operationState.pending}
              onClick={handleRunPrompt}
            >
              {operationState.pending ? <Loader2 className="animate-spin" /> : <Play />}
              {operationState.pending ? "Running" : "Run"}
            </Button>
          </div>

          {runError ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Could not run template</p>
                <p className="mt-1 text-sm">{runError}</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-muted/20 bg-muted/10 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Latest output
              </p>
              {latestOutputEntry ? (
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(latestOutputEntry.createdAt)}
                </span>
              ) : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {block.latestAiOutput || "Run the template to capture output."}
            </p>
          </div>

          {block.outputHistory.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Recent runs
              </p>
              <div className="grid gap-2">
                {block.outputHistory.slice(0, 3).map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-muted/20 bg-background/60 p-3"
                  >
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs italic text-muted-foreground/80">
                      &quot;{entry.prompt}&quot;
                    </p>
                    <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                      {entry.output}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
