import { ArrowLeft, Lock, X } from "lucide-react";

import { agencyMetricClass } from "@/features/shared/agency-ui";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { cn } from "@/lib/utils";

import {
  MONEY_FORMULA_METRIC_OPTIONS,
  MONEY_FORMULA_OPS,
  MONEY_FORMULA_SECTION_OPTIONS,
  MONEY_FORMULA_VAR_PALETTE,
  moneyFormulaDestinationSummary,
  moneyFormulaTokenLabel,
  type MoneyFormulaDef,
  type MoneyFormulaOutput,
  type MoneyFormulaToken,
} from "./money-formula-chips";

export type MoneyFormulaChipEditorViewProps = {
  formula: MoneyFormulaDef;
  validationError: string | null;
  previewLabel: string;
  previewPending: boolean;
  isSaving: boolean;
  onChange: (formula: MoneyFormulaDef) => void;
  onCancel: () => void;
  onSave: () => void;
  canSave: boolean;
  onBack?: () => void;
};

function Chip({
  token,
  onRemove,
  disabled,
}: {
  token: MoneyFormulaToken;
  onRemove: () => void;
  disabled: boolean;
}) {
  const isVar = token.kind === "var";
  const isOp = token.kind === "op" || token.kind === "paren";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs transition-colors duration-150 ease-out motion-reduce:transition-none",
        isVar && "bg-muted text-foreground",
        isOp &&
          "min-w-7 justify-center border border-border bg-background px-2 text-muted-foreground",
        !isVar && !isOp && "bg-muted/70 text-muted-foreground",
      )}
    >
      {moneyFormulaTokenLabel(token)}
      <button
        type="button"
        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${moneyFormulaTokenLabel(token)}`}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

function PaletteButton({
  label,
  disabled,
  onClick,
  mono = true,
  compact = false,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  mono?: boolean;
  compact?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "h-7 border border-border/70 bg-background px-2 text-[11px] text-foreground hover:bg-muted",
        mono && "font-mono",
        compact && "w-8 px-0",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function MoneyFormulaChipEditorView({
  formula,
  validationError,
  previewLabel,
  previewPending,
  isSaving,
  onChange,
  onCancel,
  onSave,
  canSave,
  onBack,
}: MoneyFormulaChipEditorViewProps) {
  const periodVars = MONEY_FORMULA_VAR_PALETTE.filter((item) => item.group === "period");
  const memberVars = MONEY_FORMULA_VAR_PALETTE.filter((item) => item.group === "member");
  const destination = moneyFormulaDestinationSummary(formula);

  function appendToken(token: MoneyFormulaToken) {
    onChange({ ...formula, tokens: [...formula.tokens, token] });
  }

  function removeTokenAt(index: number) {
    onChange({
      ...formula,
      tokens: formula.tokens.filter((_, tokenIndex) => tokenIndex !== index),
    });
  }

  function updateNumberAt(index: number, value: number) {
    onChange({
      ...formula,
      tokens: formula.tokens.map((token, tokenIndex) =>
        tokenIndex === index && token.kind === "number" ? { kind: "number", value } : token,
      ),
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-3 pb-4">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 h-7 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            onClick={onBack}
            disabled={isSaving}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back
          </Button>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              {formula.locked ? (
                <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              ) : null}
              {formula.locked ? (
                <h2 className="text-xl font-semibold tracking-tight text-foreground text-balance">
                  {formula.label}
                </h2>
              ) : (
                <Input
                  value={formula.label}
                  onChange={(event) => onChange({ ...formula, label: event.target.value })}
                  disabled={isSaving}
                  className="h-9 max-w-sm text-lg font-semibold"
                  aria-label="Formula label"
                />
              )}
              {formula.locked ? (
                <Badge variant="outline" className="text-[0.65rem]">
                  Template
                </Badge>
              ) : null}
            </div>
            <p className="max-w-prose text-sm text-pretty text-muted-foreground">
              {formula.locked
                ? `Writes to ${destination}. Who receives it stays in Rules.`
                : "Compose the amount. Who receives it stays in Rules."}
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2.5 pt-1 text-sm text-foreground">
            <Checkbox
              checked={formula.enabled}
              onCheckedChange={(checked) => onChange({ ...formula, enabled: checked === true })}
              disabled={isSaving}
              aria-label="Enabled for this team"
            />
            Enabled
          </label>
        </div>

        <div
          className={cn(
            "overflow-hidden rounded-lg border",
            validationError ? "border-destructive/60" : "border-border",
          )}
        >
          <div className="flex items-baseline justify-between gap-2 border-b border-border/70 px-3 pt-2.5 pb-1.5">
            <Label id="money-formula-expression-label" className="text-xs text-muted-foreground">
              Expression
            </Label>
          </div>
          <div
            role="list"
            aria-labelledby="money-formula-expression-label"
            className="flex min-h-12 flex-wrap items-center gap-1.5 bg-background px-3 py-2.5"
          >
            {formula.tokens.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Add a period value, then math and numbers
              </span>
            ) : (
              formula.tokens.map((token, index) =>
                token.kind === "number" ? (
                  <span
                    key={`${token.kind}-${index}`}
                    role="listitem"
                    className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-xs"
                  >
                    <Input
                      type="number"
                      value={token.value}
                      onChange={(event) => updateNumberAt(index, Number(event.target.value) || 0)}
                      disabled={isSaving}
                      className="h-6 w-20 border-0 bg-transparent px-1 py-0 font-mono text-xs shadow-none focus-visible:ring-0"
                      aria-label={`Number chip ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-sm p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => removeTokenAt(index)}
                      disabled={isSaving}
                      aria-label={`Remove number ${token.value}`}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ) : (
                  <span key={`${token.kind}-${index}`} role="listitem">
                    <Chip token={token} onRemove={() => removeTokenAt(index)} disabled={isSaving} />
                  </span>
                ),
              )
            )}
          </div>
          <div
            className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-3.5 py-2.5"
            aria-live="polite"
            aria-busy={previewPending}
          >
            <p className="text-xs text-muted-foreground">This period</p>
            <p
              className={cn(
                agencyMetricClass,
                "shrink-0 text-right text-base font-semibold tracking-tight transition-opacity duration-150 ease-out motion-reduce:transition-none",
                previewPending && "opacity-70",
              )}
            >
              {previewPending ? "Computing…" : previewLabel}
            </p>
          </div>
        </div>
        {validationError ? (
          <p className="text-xs text-destructive" role="alert">
            {validationError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-[11px] font-medium text-muted-foreground">Math</span>
          {MONEY_FORMULA_OPS.map((item) => (
            <PaletteButton
              key={item.op}
              label={item.label}
              disabled={isSaving}
              compact
              onClick={() => appendToken({ kind: "op", op: item.op })}
            />
          ))}
          <PaletteButton
            label="("
            disabled={isSaving}
            compact
            onClick={() => appendToken({ kind: "paren", value: "(" })}
          />
          <PaletteButton
            label=")"
            disabled={isSaving}
            compact
            onClick={() => appendToken({ kind: "paren", value: ")" })}
          />
          <PaletteButton
            label="Number"
            disabled={isSaving}
            onClick={() => appendToken({ kind: "number", value: 0 })}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1 pb-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Period values</p>
          <div className="flex flex-wrap gap-1">
            {periodVars.map((item) => (
              <PaletteButton
                key={item.id}
                label={item.label}
                disabled={isSaving}
                onClick={() => appendToken({ kind: "var", id: item.id })}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Member values</p>
          <div className="flex flex-wrap gap-1">
            {memberVars.map((item) => (
              <PaletteButton
                key={item.id}
                label={item.label}
                disabled={isSaving}
                onClick={() => appendToken({ kind: "var", id: item.id })}
              />
            ))}
          </div>
        </div>

        {formula.locked ? null : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-formula-output">Output</Label>
              <Select
                value={formula.output}
                onValueChange={(value) =>
                  onChange({ ...formula, output: value as MoneyFormulaOutput })
                }
                disabled={isSaving}
              >
                <SelectTrigger id="money-formula-output" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Amount / money</SelectItem>
                  <SelectItem value="ratio">Ratio</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-formula-metric">Scoreboard metric</Label>
              <Select
                value={formula.metricId ?? "__none"}
                onValueChange={(value) =>
                  onChange({
                    ...formula,
                    metricId: value === "__none" ? null : value,
                  })
                }
                disabled={isSaving}
              >
                <SelectTrigger id="money-formula-metric" className="h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {MONEY_FORMULA_METRIC_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="money-formula-section">Payout section</Label>
              <Select
                value={formula.sectionKey ?? "__none"}
                onValueChange={(value) =>
                  onChange({
                    ...formula,
                    sectionKey: value === "__none" ? null : value,
                  })
                }
                disabled={isSaving}
              >
                <SelectTrigger id="money-formula-section" className="h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {MONEY_FORMULA_SECTION_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-background pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={onSave} disabled={!canSave || isSaving}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
