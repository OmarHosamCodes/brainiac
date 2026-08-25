import { type ReactNode } from "react";
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
  amountToFormulaMajor,
  majorToFormulaAmount,
  moneyFormulaDestinationSummary,
  moneyFormulaNumberChipUnit,
  moneyFormulaTokenLabel,
  type MoneyFormulaDef,
  type MoneyFormulaOutput,
  type MoneyFormulaToken,
} from "./money-formula-chips";

export type MoneyFormulaChipEditorViewProps = {
  formula: MoneyFormulaDef;
  currency: string;
  ruleOptions: Array<{ id: string; label: string }>;
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
  labelContext,
}: {
  token: MoneyFormulaToken;
  onRemove: () => void;
  disabled: boolean;
  labelContext?: {
    tokens: MoneyFormulaToken[];
    index: number;
    output: MoneyFormulaOutput;
    currency: string;
  };
}) {
  const isVar = token.kind === "var";
  const isOp = token.kind === "op" || token.kind === "paren";
  const label = moneyFormulaTokenLabel(token, labelContext);
  return (
    <span
      className={cn(
        "group/chip inline-flex items-center gap-0.5 rounded-md py-1 pr-0.5 pl-2 font-mono text-xs transition-colors duration-150 ease-out motion-reduce:transition-none",
        isVar && "bg-muted text-foreground",
        isOp &&
          "min-w-7 justify-center border border-border bg-background px-2 text-muted-foreground",
        !isVar && !isOp && "bg-muted/70 text-muted-foreground",
      )}
    >
      {label}
      <button
        type="button"
        className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground opacity-50 transition-opacity duration-150 ease-out hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 motion-reduce:transition-none sm:opacity-0 sm:group-hover/chip:opacity-70 sm:group-focus-within/chip:opacity-70"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${label}`}
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
        "h-7 border border-border/60 bg-background px-2 text-[11px] text-foreground transition-colors duration-150 ease-out hover:bg-muted motion-reduce:transition-none",
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

function PaletteSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function NumberChip({
  token,
  index,
  formula,
  currency,
  isSaving,
  onUpdate,
  onRemove,
}: {
  token: Extract<MoneyFormulaToken, { kind: "number" }>;
  index: number;
  formula: MoneyFormulaDef;
  currency: string;
  isSaving: boolean;
  onUpdate: (index: number, rawMajorOrScalar: number) => void;
  onRemove: (index: number) => void;
}) {
  const unit = moneyFormulaNumberChipUnit(formula.tokens, index, formula.output);
  const displayValue = unit === "amount" ? amountToFormulaMajor(token.value) : token.value;
  const displayLabel = moneyFormulaTokenLabel(token, {
    tokens: formula.tokens,
    index,
    output: formula.output,
    currency,
  });

  return (
    <span
      role="listitem"
      className="group/chip inline-flex items-center gap-0.5 rounded-md border border-border/70 bg-muted/50 py-0.5 pr-0.5 pl-1.5 font-mono text-xs"
    >
      <Input
        type="number"
        value={displayValue}
        step={unit === "amount" ? "0.01" : "1"}
        onChange={(event) => onUpdate(index, Number(event.target.value) || 0)}
        disabled={isSaving}
        className="h-6 w-24 border-0 bg-transparent px-1 py-0 font-mono text-xs shadow-none focus-visible:ring-0"
        aria-label={
          unit === "amount"
            ? `Amount chip ${index + 1} in ${currency}`
            : `Number chip ${index + 1}`
        }
      />
      {unit === "amount" ? (
        <span className="pr-0.5 text-[10px] text-muted-foreground">{currency}</span>
      ) : null}
      <button
        type="button"
        className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground opacity-50 transition-opacity duration-150 ease-out hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:opacity-0 sm:group-hover/chip:opacity-70 sm:group-focus-within/chip:opacity-70"
        onClick={() => onRemove(index)}
        disabled={isSaving}
        aria-label={`Remove ${displayLabel}`}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  );
}

export function MoneyFormulaChipEditorView({
  formula,
  currency,
  ruleOptions,
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
  const ruleLabel = ruleOptions.find((option) => option.id === formula.ruleId)?.label ?? null;
  const destination = moneyFormulaDestinationSummary(formula, ruleLabel);

  function appendToken(token: MoneyFormulaToken) {
    onChange({ ...formula, tokens: [...formula.tokens, token] });
  }

  function removeTokenAt(index: number) {
    onChange({
      ...formula,
      tokens: formula.tokens.filter((_, tokenIndex) => tokenIndex !== index),
    });
  }

  function updateNumberAt(index: number, rawMajorOrScalar: number) {
    const token = formula.tokens[index];
    if (!token || token.kind !== "number") return;
    const unit = moneyFormulaNumberChipUnit(formula.tokens, index, formula.output);
    const value =
      unit === "amount" ? majorToFormulaAmount(rawMajorOrScalar) : rawMajorOrScalar;
    onChange({
      ...formula,
      tokens: formula.tokens.map((entry, tokenIndex) =>
        tokenIndex === index && entry.kind === "number" ? { kind: "number", value } : entry,
      ),
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-col gap-2.5 pb-3">
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
                <h2 className="text-xl font-semibold tracking-tight text-balance text-foreground">
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
          <label className="inline-flex shrink-0 items-center gap-2 pt-1 text-xs font-medium text-foreground">
            <Checkbox
              checked={formula.enabled}
              onCheckedChange={(checked) => onChange({ ...formula, enabled: checked === true })}
              disabled={isSaving}
              aria-label="Enabled for this team"
            />
            Enabled
          </label>
        </div>
      </header>

      <div
        className={cn(
          "flex shrink-0 flex-col overflow-hidden rounded-xl border bg-muted/20",
          validationError ? "border-destructive/60" : "border-border",
        )}
      >
        <div className="flex items-baseline justify-between gap-2 px-3.5 pt-2.5 pb-1">
          <Label id="money-formula-expression-label" className="text-xs text-muted-foreground">
            Expression
          </Label>
        </div>
        <div
          role="list"
          aria-labelledby="money-formula-expression-label"
          className="flex max-h-28 min-h-11 flex-wrap items-center gap-1.5 overflow-y-auto overscroll-contain bg-background/60 px-3.5 py-2.5"
        >
          {formula.tokens.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              Add a period value, then math and numbers
            </span>
          ) : (
            formula.tokens.map((token, index) =>
              token.kind === "number" ? (
                <NumberChip
                  key={`${token.kind}-${index}`}
                  token={token}
                  index={index}
                  formula={formula}
                  currency={currency}
                  isSaving={isSaving}
                  onUpdate={updateNumberAt}
                  onRemove={removeTokenAt}
                />
              ) : (
                <span key={`${token.kind}-${index}`} role="listitem">
                  <Chip
                    token={token}
                    onRemove={() => removeTokenAt(index)}
                    disabled={isSaving}
                    labelContext={{
                      tokens: formula.tokens,
                      index,
                      output: formula.output,
                      currency,
                    }}
                  />
                </span>
              ),
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 border-t border-border/70 px-3 py-2">
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

        <div
          className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/40 px-3.5 py-3"
          aria-live="polite"
          aria-busy={previewPending}
        >
          <p className="text-xs text-muted-foreground">This period</p>
          <p
            className={cn(
              agencyMetricClass,
              "shrink-0 text-right text-lg font-semibold tracking-tight transition-opacity duration-150 ease-out motion-reduce:transition-none",
              previewPending && "opacity-70",
            )}
          >
            {previewPending ? "Computing…" : previewLabel}
          </p>
        </div>
      </div>

      {validationError ? (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {validationError}
        </p>
      ) : null}

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1 pb-1">
        <PaletteSection title="Period values">
          {periodVars.map((item) => (
            <PaletteButton
              key={item.id}
              label={item.label}
              disabled={isSaving}
              onClick={() => appendToken({ kind: "var", id: item.id })}
            />
          ))}
        </PaletteSection>
        <PaletteSection title="Member values">
          {memberVars.map((item) => (
            <PaletteButton
              key={item.id}
              label={item.label}
              disabled={isSaving}
              onClick={() => appendToken({ kind: "var", id: item.id })}
            />
          ))}
        </PaletteSection>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="money-formula-rule">Rule</Label>
          <Select
            value={formula.ruleId ?? "__none"}
            onValueChange={(value) =>
              onChange({ ...formula, ruleId: value === "__none" ? null : value })
            }
            disabled={isSaving}
          >
            <SelectTrigger id="money-formula-rule" className="h-9">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">None — whole team</SelectItem>
              {ruleOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Who qualifies. Cohort size in the formula uses this list.
          </p>
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

      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border pt-4">
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
