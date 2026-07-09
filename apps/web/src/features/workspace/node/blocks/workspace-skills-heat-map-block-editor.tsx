import {
  WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT,
  createWorkspaceId,
  createWorkspaceSkillsHeatMapDimension,
  createWorkspaceSkillsHeatMapMember,
  getSkillsHeatMapMemberAverage,
  getSkillsHeatMapSummary,
  type WorkspaceSkillsHeatMapBlock,
} from "@brainiac/workspace";
import { Plus, Trash2, UserPlus, X } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

function getScoreClasses(score: number) {
  if (score <= 3) {
    return "border-destructive/35 bg-destructive/10 text-destructive";
  }

  if (score <= 5) {
    return "border-warning/35 bg-warning/10 text-warning";
  }

  if (score <= 7) {
    return "border-warning/20 bg-warning/5 text-foreground";
  }

  return "border-success/35 bg-success/10 text-success";
}

export function WorkspaceSkillsHeatMapBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceSkillsHeatMapBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getSkillsHeatMapSummary(block), [block]);
  const dimensionIds = useMemo(
    () => block.dimensions.map((dimension) => dimension.id),
    [block.dimensions],
  );
  const canAddDimension = block.dimensions.length < WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT;

  const strongestDimensionLabel = useMemo(() => {
    if (!summary.strongestDimension) {
      return "Unclear";
    }

    return (
      block.dimensions.find((dimension) => dimension.id === summary.strongestDimension)?.label ??
      "Skill"
    );
  }, [block.dimensions, summary.strongestDimension]);

  const strongestDimensionAverage = useMemo(() => {
    if (!summary.strongestDimension) {
      return null;
    }

    return summary.averageByDimension[summary.strongestDimension] ?? 0;
  }, [summary.averageByDimension, summary.strongestDimension]);

  function mutateHeatMap(mutator: (entry: WorkspaceSkillsHeatMapBlock) => void) {
    mutateTypedBlock(tabId, block.id, "skills-heat-map", mutator);
  }

  function initializeDimensions() {
    mutateHeatMap((entry) => {
      entry.dimensions = [
        { id: "writing", label: "Writing" },
        { id: "strategy", label: "Strategy" },
        { id: "design", label: "Design" },
        { id: "analytics", label: "Analytics" },
        { id: "leadership", label: "Leadership" },
      ];

      for (const member of entry.members) {
        const nextScores: Record<string, number> = {};

        for (const dimension of entry.dimensions) {
          nextScores[dimension.id] = member.scores[dimension.id] ?? 5;
        }

        member.scores = nextScores;
      }
    });
  }

  function addDimension() {
    mutateHeatMap((entry) => {
      const dimension = createWorkspaceSkillsHeatMapDimension({
        id: createWorkspaceId("dimension"),
        label: "New Skill",
      });

      entry.dimensions.push(dimension);
    });
  }

  function removeDimension(dimensionId: string) {
    mutateHeatMap((entry) => {
      if (entry.dimensions.length <= 1) {
        return;
      }

      entry.dimensions = entry.dimensions.filter((dimension) => dimension.id !== dimensionId);

      for (const member of entry.members) {
        delete member.scores[dimensionId];
      }
    });
  }

  function updateDimensionLabel(dimensionId: string, value: string) {
    mutateHeatMap((entry) => {
      const target = entry.dimensions.find((dimension) => dimension.id === dimensionId);

      if (!target) {
        return;
      }

      target.label = value.slice(0, 80);
    });
  }

  function cycleScore(memberId: string, dimensionId: string) {
    mutateHeatMap((entry) => {
      const member = entry.members.find((candidate) => candidate.id === memberId);

      if (!member) {
        return;
      }

      const current = member.scores[dimensionId] ?? 5;
      member.scores[dimensionId] = current >= 10 ? 1 : current + 1;
    });
  }

  function addMember() {
    mutateHeatMap((entry) => {
      entry.members.push(createWorkspaceSkillsHeatMapMember(entry.dimensions));
    });
  }

  function removeMember(memberId: string) {
    mutateHeatMap((entry) => {
      entry.members = entry.members.filter((member) => member.id !== memberId);
    });
  }

  function updateMemberName(memberId: string, value: string) {
    mutateHeatMap((entry) => {
      const target = entry.members.find((member) => member.id === memberId);

      if (!target) {
        return;
      }

      target.name = value.slice(0, 120);
    });
  }

  function updateMemberRole(memberId: string, value: string) {
    mutateHeatMap((entry) => {
      const target = entry.members.find((member) => member.id === memberId);

      if (!target) {
        return;
      }

      target.role = value.slice(0, 120);
    });
  }

  function getMemberAverage(member: WorkspaceSkillsHeatMapBlock["members"][number]) {
    return getSkillsHeatMapMemberAverage(member.scores, dimensionIds);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-primary/10 bg-primary/5 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Team
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-primary sm:text-3xl">
            {summary.memberCount}
          </p>
        </div>

        <div className="rounded-3xl border border-success/10 bg-success/5 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Avg Score
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-success sm:text-3xl">
            {summary.overallAverage}/10
          </p>
        </div>

        <div className="rounded-3xl border border-destructive/10 bg-destructive/5 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Critical Gaps
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-destructive sm:text-3xl">
            {summary.criticalGapCount}
          </p>
        </div>

        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Strongest
          </p>
          <p className="mt-2 text-lg font-black tracking-tight text-foreground">
            {strongestDimensionLabel}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            {strongestDimensionAverage === null
              ? "Add scores to rank the team."
              : `${strongestDimensionAverage}/10 team average`}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Skills matrix</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Score each team member from 1 to 10 for every skill. Higher scores indicate stronger
              capability.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canAddDimension ? (
              <Button
                type="button"
                variant="secondary"
                className="rounded-full px-4"
                aria-label="Add skill dimension"
                onClick={addDimension}
              >
                <Plus />
                Add Skill
              </Button>
            ) : null}

            <Button
              type="button"
              variant="secondary"
              className="rounded-full px-4"
              aria-label="Add team member"
              onClick={addMember}
            >
              <UserPlus />
              Add Team Member
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-destructive">
            1-3 Critical gap
          </div>
          <div className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-warning">
            4-5 Needs support
          </div>
          <div className="rounded-full border border-warning/20 bg-warning/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
            6-7 Reliable
          </div>
          <div className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success">
            8-10 Strength
          </div>
        </div>
      </div>

      {block.dimensions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            No skill dimensions added yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground/80">
            Start with a default set or add custom skills for your team.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 rounded-full px-4"
            aria-label="Initialize default skill dimensions"
            onClick={initializeDimensions}
          >
            <Plus />
            Initialize Default Dimensions
          </Button>
        </div>
      ) : block.members.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No team members added yet.</p>
          <p className="mt-2 text-sm text-muted-foreground/80">
            Add a team member to start scoring strengths and gaps.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 rounded-full px-4"
            aria-label="Add first team member"
            onClick={addMember}
          >
            <UserPlus />
            Add Team Member
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <table className="min-w-[880px] w-full border-separate border-spacing-y-3">
            <thead>
              <tr>
                <th className="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Team Member
                </th>
                {block.dimensions.map((dimension) => (
                  <th key={dimension.id} className="px-3 pb-1 text-center">
                    <div className="group flex flex-col items-center gap-1">
                      <Input
                        value={dimension.label}
                        placeholder="Skill"
                        className="w-24 border-0 bg-transparent px-0 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 shadow-none placeholder:text-muted-foreground/40 focus-visible:ring-0"
                        aria-label={`Skill name for ${dimension.label || "new skill"}`}
                        onChange={(event) => updateDimensionLabel(dimension.id, event.target.value)}
                      />
                      {block.dimensions.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-mt-1 h-4 w-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          aria-label={`Remove ${dimension.label || "skill"} skill`}
                          onClick={() => removeDimension(dimension.id)}
                        >
                          <X className="size-3" />
                        </Button>
                      ) : null}
                    </div>
                  </th>
                ))}
                <th className="px-3 pb-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Average
                </th>
                <th className="px-3 pb-1 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {block.members.map((member) => {
                const memberLabel = member.name.trim() || "Team member";
                const memberAverage = getMemberAverage(member);

                return (
                  <tr
                    key={member.id}
                    className="rounded-2xl border border-muted/20 bg-background/40"
                  >
                    <td className="rounded-l-2xl border-y border-l border-muted/20 bg-background/40 px-4 py-4 align-top">
                      <Input
                        value={member.name}
                        placeholder="Name"
                        className="border-0 bg-transparent px-0 text-sm font-semibold text-foreground shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
                        onChange={(event) => updateMemberName(member.id, event.target.value)}
                      />
                      <Input
                        value={member.role}
                        placeholder="Role"
                        className="mt-1 border-0 bg-transparent px-0 text-xs font-medium text-muted-foreground/70 shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
                        onChange={(event) => updateMemberRole(member.id, event.target.value)}
                      />
                    </td>

                    {block.dimensions.map((dimension) => {
                      const score = member.scores[dimension.id] ?? 5;

                      return (
                        <td
                          key={`${member.id}-${dimension.id}`}
                          className="border-y border-muted/20 bg-background/40 px-3 py-4 text-center"
                        >
                          <button
                            type="button"
                            className={cn(
                              "w-full rounded-2xl border px-3 py-4 text-lg font-black tracking-tight transition hover:scale-[1.02]",
                              getScoreClasses(score),
                            )}
                            aria-label={`${dimension.label} score for ${memberLabel}`}
                            onClick={() => cycleScore(member.id, dimension.id)}
                          >
                            {score}
                          </button>
                        </td>
                      );
                    })}

                    <td className="border-y border-muted/20 bg-background/40 px-3 py-4 text-center">
                      <div
                        className={cn(
                          "rounded-2xl border px-3 py-4 text-lg font-black tracking-tight",
                          getScoreClasses(memberAverage),
                        )}
                      >
                        {memberAverage}
                      </div>
                    </td>

                    <td className="rounded-r-2xl border-y border-r border-muted/20 bg-background/40 px-3 py-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-xl hover:text-destructive"
                        aria-label={`Remove ${memberLabel}`}
                        onClick={() => removeMember(member.id)}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td className="px-3 pt-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Team Average
                </td>
                {block.dimensions.map((dimension) => {
                  const average = summary.averageByDimension[dimension.id] ?? 0;

                  return (
                    <td key={`avg-${dimension.id}`} className="px-3 pt-2 text-center">
                      <div
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-sm font-bold",
                          getScoreClasses(average),
                        )}
                      >
                        {average}
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 pt-2 text-center">
                  <div
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-sm font-bold",
                      getScoreClasses(summary.overallAverage),
                    )}
                  >
                    {summary.overallAverage}
                  </div>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
