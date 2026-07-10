import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { orpc } from "@/lib/orpc";
import type { AgencyTaskThreadMember } from "@/lib/schemas/agency-work";
import {
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
} from "@/lib/utils/agency-ui";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import { cn } from "@/lib/utils";
import { selectIsProjectMutationPending, useAgencyOpsStore } from "@/stores/agency-ops";

type AgencyClientOption = {
  id: string;
  name: string;
};

type MilestoneDraft = {
  key: string;
  title: string;
  assignedToTeam: boolean;
  assigneeUserIds: string[];
};

type ProjectCreateMode = "normal" | "journey";

const CREATE_MODE_OPTIONS: Array<{ value: ProjectCreateMode; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "journey", label: "Journey" },
];

export type AgencyProjectCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  clients: AgencyClientOption[];
  /** When set, client picker is hidden and this client is used. */
  lockClientId?: string;
  defaultClientId?: string;
  onCreated?: (projectId: string) => void;
};

function createMilestoneDraft(): MilestoneDraft {
  return {
    key: crypto.randomUUID(),
    title: "",
    assignedToTeam: false,
    assigneeUserIds: [],
  };
}

export function AgencyProjectCreateDialog({
  open,
  onOpenChange,
  teamId,
  clients,
  lockClientId,
  defaultClientId,
  onCreated,
}: AgencyProjectCreateDialogProps) {
  const agencyOps = useAgencyOpsStore();
  const isProjectMutationPending = useAgencyOpsStore(selectIsProjectMutationPending);
  const formId = useId();

  const [mode, setMode] = useState<ProjectCreateMode>("journey");
  const [clientId, setClientId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>(() => [createMilestoneDraft()]);
  const [formError, setFormError] = useState<string | null>(null);

  const isJourneyMode = mode === "journey";

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.taskThreads.members.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId) && open && isJourneyMode,
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const members: AgencyTaskThreadMember[] = membersQuery.data?.items ?? [];

  const resolvedClientId = lockClientId ?? clientId;
  const selectedClient = clients.find((client) => client.id === resolvedClientId) ?? null;
  const clientLocked = Boolean(lockClientId);

  useEffect(() => {
    if (!open) return;

    const initialClientId = lockClientId ?? defaultClientId ?? clients[0]?.id ?? "";
    setMode("journey");
    setClientId(initialClientId);
    setProjectName("");
    setMilestones([createMilestoneDraft()]);
    setFormError(null);
  }, [open, lockClientId, defaultClientId, clients]);

  function updateMilestone(key: string, patch: Partial<MilestoneDraft>) {
    setMilestones((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
    setFormError(null);
  }

  function addMilestone() {
    setMilestones((current) => [...current, createMilestoneDraft()]);
    setFormError(null);
  }

  function removeMilestone(key: string) {
    setMilestones((current) => {
      if (current.length <= 1) return current;
      return current.filter((row) => row.key !== key);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const name = projectName.trim();
    if (!teamId || !resolvedClientId || !name || !selectedClient) return;

    if (isJourneyMode) {
      const validMilestones = milestones
        .map((row) => ({
          title: row.title.trim(),
          assigneeUserIds: row.assignedToTeam ? [] : [...new Set(row.assigneeUserIds)],
        }))
        .filter((row) => row.title.length > 0);

      if (validMilestones.length === 0) {
        setFormError("Add at least one milestone.");
        return;
      }

      const projectId = await agencyOps.createProjectWithJourney({
        teamId,
        clientId: resolvedClientId,
        clientName: selectedClient.name,
        name,
        milestones: validMilestones,
      });

      if (projectId) {
        onOpenChange(false);
        onCreated?.(projectId);
      }
      return;
    }

    const projectId = await agencyOps.createProject({
      teamId,
      clientId: resolvedClientId,
      clientName: selectedClient.name,
      name,
    });

    if (projectId) {
      onOpenChange(false);
      onCreated?.(projectId);
    }
  }

  const canSubmit =
    Boolean(projectName.trim()) &&
    Boolean(resolvedClientId) &&
    (!isJourneyMode || milestones.length > 0) &&
    !isProjectMutationPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b border-default px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-highlighted">New project</DialogTitle>
          <DialogDescription className="text-xs text-muted">
            {isJourneyMode
              ? "Define milestones and assignees to seed the project journey."
              : "Create a simple project with client and name."}
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <div className="space-y-4 overflow-y-auto px-5 py-4">
            <div className="inline-flex rounded-full border border-default bg-elevated p-1">
              {CREATE_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                    mode === option.value
                      ? "bg-default text-highlighted"
                      : "text-muted hover:text-highlighted",
                  )}
                  aria-pressed={mode === option.value}
                  disabled={isProjectMutationPending}
                  onClick={() => {
                    setMode(option.value);
                    setFormError(null);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {!clientLocked ? (
                <div className={agencyFormFieldClass}>
                  <label htmlFor={`${formId}-client`} className={agencyFormLabelClass}>
                    Client
                  </label>
                  <select
                    id={`${formId}-client`}
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="h-9 w-full rounded-xl border border-default bg-background px-2.5 text-sm"
                    disabled={clients.length === 0 || isProjectMutationPending}
                  >
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : selectedClient ? (
                <div className={agencyFormFieldClass}>
                  <span className={agencyFormLabelClass}>Client</span>
                  <p className="truncate text-sm font-semibold text-highlighted">
                    {selectedClient.name}
                  </p>
                </div>
              ) : null}

              <div className={cn(agencyFormFieldClass, clientLocked ? "sm:col-span-2" : "")}>
                <label htmlFor={`${formId}-name`} className={agencyFormLabelClass}>
                  Project name
                </label>
                <Input
                  id={`${formId}-name`}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name"
                  autoFocus
                  disabled={isProjectMutationPending}
                  className={cn(
                    "h-9 rounded-xl border-default bg-default text-sm",
                    agencyInputPlaceholderClass,
                  )}
                />
              </div>
            </div>

            {isJourneyMode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className={agencyLabelClass}>Milestones</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-full px-2.5 text-xs"
                    onClick={addMilestone}
                    disabled={isProjectMutationPending}
                  >
                    <Plus className="size-3.5" />
                    Add milestone
                  </Button>
                </div>

                <div className="space-y-2">
                  {milestones.map((row, index) => (
                    <div
                      key={row.key}
                      className="rounded-2xl border border-default bg-elevated/60 p-2.5"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-muted">
                          Milestone {index + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-full p-0 text-muted hover:text-error"
                          onClick={() => removeMilestone(row.key)}
                          disabled={milestones.length <= 1 || isProjectMutationPending}
                          aria-label={`Remove milestone ${index + 1}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
                        <Input
                          value={row.title}
                          onChange={(e) => updateMilestone(row.key, { title: e.target.value })}
                          placeholder="Milestone title"
                          disabled={isProjectMutationPending}
                          className={cn(
                            "h-8 rounded-lg border-default bg-default text-xs",
                            agencyInputPlaceholderClass,
                          )}
                          aria-label={`Milestone ${index + 1} title`}
                        />
                        <AgencyMemberChooser
                          mode="multiple"
                          assignedToTeam={row.assignedToTeam}
                          selectedUserIds={row.assigneeUserIds}
                          onAssignedToTeamChange={(assignedToTeam) =>
                            updateMilestone(row.key, {
                              assignedToTeam,
                              assigneeUserIds: assignedToTeam ? [] : row.assigneeUserIds,
                            })
                          }
                          onSelectedUserIdsChange={(assigneeUserIds) =>
                            updateMilestone(row.key, {
                              assignedToTeam: false,
                              assigneeUserIds,
                            })
                          }
                          members={members}
                          loading={membersQuery.isPending}
                          disabled={isProjectMutationPending}
                          triggerVariant="stack"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {formError ? (
                  <p className="text-xs font-semibold text-error" role="alert">
                    {formError}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-default px-5 py-4 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isProjectMutationPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!canSubmit} form={formId}>
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
