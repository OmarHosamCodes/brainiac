import {
  createWorkspaceDecisionMatrixCriterion,
  createWorkspaceDecisionMatrixOption,
  getDecisionMatrixSummary,
  type WorkspaceDecisionMatrixBlock,
} from "@brainiac/workspace";
import { Columns2, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/components/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

function clampWeight(value: string | number | undefined) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function clampScore(value: string | number | undefined) {
  const numeric = Number(value || 0);
  return Math.min(10, Math.max(0, Math.round(numeric)));
}

function getNextOptionLabel(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return index < alphabet.length ? `Option ${alphabet[index]}` : `Option ${index + 1}`;
}

export function WorkspaceDecisionMatrixBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceDecisionMatrixBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getDecisionMatrixSummary(block), [block]);

  const summaryByOptionId = useMemo(
    () => new Map(summary.optionScores.map((option) => [option.optionId, option])),
    [summary.optionScores],
  );

  const optionRanks = useMemo(() => {
    const sorted = [...summary.optionScores].sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.label.localeCompare(b.label);
    });
    return new Map(sorted.map((option, index) => [option.optionId, index + 1]));
  }, [summary.optionScores]);

  const matrixGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `minmax(15rem, 1.35fr) repeat(${block.options.length}, minmax(12rem, 1fr))`,
    }),
    [block.options.length],
  );

  function getOptionSummary(optionId: string) {
    return summaryByOptionId.get(optionId) ?? null;
  }

  function getOptionRank(optionId: string) {
    return optionRanks.get(optionId) ?? null;
  }

  function updateQuestion(value: string) {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      entry.question = value.slice(0, 240);
    });
  }

  function updateOptionLabel(optionId: string, value: string) {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      const target = entry.options.find((candidate) => candidate.id === optionId);
      if (!target) return;
      target.label = value.slice(0, 80);
    });
  }

  function updateCriterionLabel(criterionId: string, value: string) {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      const target = entry.criteria.find((candidate) => candidate.id === criterionId);
      if (!target) return;
      target.label = value.slice(0, 120);
    });
  }

  function updateCriterionWeight(criterionId: string, value: string | number | undefined) {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      const target = entry.criteria.find((candidate) => candidate.id === criterionId);
      if (!target) return;
      target.weight = clampWeight(value);
    });
  }

  function updateOptionScore(
    optionId: string,
    criterionId: string,
    value: string | number | undefined,
  ) {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      const target = entry.options.find((candidate) => candidate.id === optionId);
      if (!target) return;
      target.scores[criterionId] = clampScore(value);
    });
  }

  function addCriterion() {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      const criterion = createWorkspaceDecisionMatrixCriterion();
      entry.criteria.push(criterion);
      for (const option of entry.options) {
        option.scores[criterion.id] = 5;
      }
    });
  }

  function removeCriterion(criterionId: string) {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      if (entry.criteria.length <= 1) return;
      entry.criteria = entry.criteria.filter((criterion) => criterion.id !== criterionId);
      for (const option of entry.options) {
        delete option.scores[criterionId];
      }
    });
  }

  function addOption() {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      entry.options.push(
        createWorkspaceDecisionMatrixOption({
          label: getNextOptionLabel(entry.options.length),
          scores: Object.fromEntries(entry.criteria.map((criterion) => [criterion.id, 5])),
        }),
      );
    });
  }

  function removeOption(optionId: string) {
    mutateTypedBlock(tabId, block.id, "decision-matrix", (entry) => {
      if (entry.options.length <= 1) return;
      entry.options = entry.options.filter((option) => option.id !== optionId);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Decision prompt
            </p>
            <p className="text-sm text-muted-foreground">
              Compare options with weighted criteria, then score each path from 0 to 10.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-2xl">
              {summary.criteriaCount} criteria
            </Badge>
            <Badge variant="secondary" className="rounded-2xl">
              {block.options.length} options
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-2xl border-primary/20 bg-primary/10 text-primary"
            >
              {summary.totalWeight} weight pts
            </Badge>
          </div>
        </div>
        <Input
          value={block.question}
          placeholder="What decision are you making?"
          aria-label="Decision question"
          className="mt-4 w-full border-0 bg-transparent px-0 text-xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/40 shadow-none focus-visible:ring-0"
          onChange={(event) => updateQuestion(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {block.options.map((option) => (
          <article
            key={option.id}
            className="rounded-3xl border border-muted/20 bg-background/40 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-2xl">
                    Rank #{getOptionRank(option.id) ?? "—"}
                  </Badge>
                  {getOptionSummary(option.id)?.isWinner ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 text-[10px] uppercase tracking-[0.18em] text-primary"
                    >
                      {summary.hasTie ? "Tied lead" : "Recommended"}
                    </Badge>
                  ) : null}
                </div>
                <Input
                  value={option.label}
                  placeholder="Option name"
                  aria-label={`Option label for ${option.label || "decision option"}`}
                  className="mt-3 w-full border-0 bg-transparent px-0 text-lg font-bold text-foreground placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-0"
                  onChange={(event) => updateOptionLabel(option.id, event.target.value)}
                />
                <p className="mt-2 text-2xl font-black tracking-tight text-primary sm:text-3xl">
                  {getOptionSummary(option.id)?.totalScore ?? 0}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-2xl hover:text-destructive"
                disabled={block.options.length <= 1}
                aria-label={`Remove ${option.label || "decision"} option`}
                onClick={() => removeOption(option.id)}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                <span>Relative score</span>
                <span>{getOptionSummary(option.id)?.progress ?? 0}%</span>
              </div>
              <BlockProgressBar
                value={getOptionSummary(option.id)?.progress ?? 0}
                max={100}
                className="h-1.5"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="secondary" className="rounded-2xl">
                  Avg {getOptionSummary(option.id)?.averageScore ?? 0}
                </Badge>
                <Badge variant="secondary" className="rounded-2xl text-primary">
                  {getOptionSummary(option.id)?.totalScore ?? 0} weighted pts
                </Badge>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-sm font-semibold text-foreground">Weighted scoring matrix</p>
          <p className="text-sm text-muted-foreground">
            Increase criterion weight when it matters more, then score each option against that
            criterion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="rounded-full px-4"
            onClick={addCriterion}
          >
            <Plus />
            Add Criterion
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="rounded-full px-4"
            onClick={addOption}
          >
            <Columns2 />
            Add Option
          </Button>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        <div
          className="grid min-w-[760px] gap-px overflow-hidden rounded-3xl border border-muted/20 bg-muted/20"
          style={matrixGridStyle}
          role="table"
          aria-label="Decision matrix scoring grid"
        >
          <div className="flex flex-col justify-center bg-muted/10 p-4" role="columnheader">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Criteria
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground/70">
              {summary.criteriaCount} criteria, {summary.totalWeight} weight pts
            </p>
          </div>

          {block.options.map((option) => (
            <div
              key={`${option.id}-header`}
              className="flex flex-col justify-center bg-muted/10 p-4"
              role="columnheader"
            >
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {option.label || "Option"}
              </p>
              <p className="mt-1 text-lg font-black text-foreground">
                {getOptionSummary(option.id)?.totalScore ?? 0}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Rank #{getOptionRank(option.id) ?? "—"}
              </p>
            </div>
          ))}

          {block.criteria.flatMap((criterion) => [
            <div
              key={criterion.id}
              className="flex flex-col justify-center space-y-3 bg-background/40 p-4"
              role="rowheader"
            >
              <div className="flex items-start justify-between gap-3">
                <Input
                  value={criterion.label}
                  placeholder="Criterion name"
                  aria-label={`Criterion label for ${criterion.label || "decision criterion"}`}
                  className="flex-1 border-0 bg-transparent px-0 text-sm font-semibold text-foreground placeholder:text-muted-foreground/40 shadow-none focus-visible:ring-0"
                  onChange={(event) => updateCriterionLabel(criterion.id, event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg hover:text-destructive"
                  disabled={block.criteria.length <= 1}
                  aria-label={`Remove ${criterion.label || "decision"} criterion`}
                  onClick={() => removeCriterion(criterion.id)}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  <span>Weight</span>
                  <span>{criterion.weight}/10</span>
                </div>
                <input
                  value={criterion.weight}
                  type="range"
                  min={1}
                  max={10}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted/20 accent-primary"
                  aria-label={`Weight for ${criterion.label || "criterion"}`}
                  onChange={(event) => updateCriterionWeight(criterion.id, event.target.value)}
                />
              </div>
            </div>,
            ...block.options.map((option) => (
              <div
                key={`${criterion.id}-${option.id}`}
                className="flex flex-col justify-center bg-background/40 p-4"
                role="cell"
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  <span>Score</span>
                  <span>{option.scores[criterion.id] ?? 0}/10</span>
                </div>
                <input
                  value={option.scores[criterion.id] ?? 0}
                  type="range"
                  min={0}
                  max={10}
                  className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted/20 accent-primary"
                  aria-label={`Score for ${option.label || "option"} on ${criterion.label || "criterion"}`}
                  onChange={(event) =>
                    updateOptionScore(option.id, criterion.id, event.target.value)
                  }
                />
                <div className="mt-3 flex justify-between text-xs font-medium text-muted-foreground/70">
                  <span>Weighted</span>
                  <span className="font-black text-foreground">
                    {(option.scores[criterion.id] ?? 0) * criterion.weight}
                  </span>
                </div>
              </div>
            )),
          ])}
        </div>
      </div>
    </div>
  );
}
