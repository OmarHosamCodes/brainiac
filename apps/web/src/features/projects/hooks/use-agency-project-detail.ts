import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { parseBillableRateAmount } from "@/features/shared/format-rate";
import { resolveEffectiveBillableRate } from "@/features/billing/client-billable-rate";
import { useAgencyProjectJourney } from "@/features/projects/use-agency-project-journey";
import {
  selectIsProjectMutationPending,
  useAgencyOpsStore,
} from "@/features/shared/stores/agency-ops";
import { startOfWeekUtc } from "@/features/shared/use-agency-time-range-filters";
import { useTeamWorkSchedule } from "@/features/shared/use-team-work-schedule";
import { teamDetailQueryOptions } from "@/features/team/team-queries";
import {
  canvasNodeHref,
  findCanvasNodeForAgencyProject,
} from "@/features/workspace/workspace-agency-links";
import { useWorkspaceStore } from "@/features/workspace/workspace-local-state";

export type ActivitySort = "newest" | "oldest" | "longest";

export type AgencyProjectDetailViewModel = {
  teamId: string;
  projectId: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  project: {
    id: string;
    name: string;
    clientId: string;
    clientName: string;
    deletedAt: string | null;
    billableRateAmount: number | null;
    currency: string;
    clientBillableRateAmount: number | null;
    clientCurrency: string;
    effectiveBillableRateAmount: number | null;
  } | null;
  projectBudget: {
    projectId: string;
    hoursBudget: number | null;
    hoursLogged: number;
    costBudgetAmount: number | null;
    costLoggedAmount: number;
  } | null;
  budgetPct: number;
  budgetTone: string;
  totalsThisWeek: number;
  totalsLast30: number;
  hoursByMemberThisWeek: Array<{ userId: string; name: string; seconds: number }>;
  memberSecondsMax: number;
  sortedRecentEntries: Array<{
    id: string;
    startedAt: string;
    userName: string;
    description: string;
    durationSeconds: number;
  }>;
  activitySort: ActivitySort;
  setActivitySort: (sort: ActivitySort) => void;
  journeyExpandedMobile: boolean;
  setJourneyExpandedMobile: (expanded: boolean | ((val: boolean) => boolean)) => void;
  journeyState: ReturnType<typeof useAgencyProjectJourney>;
  retryLoad: () => void;
  isTrashed: boolean;
  isOwner: boolean;
  isProjectMutationPending: boolean;
  restoreProject: () => void;
  requestMoveToTrash: () => void;
  pendingTrashConfirm: boolean;
  cancelTrashConfirm: () => void;
  confirmMoveToTrash: () => void;
  canvasNodeHref: string | null;
  editBillableRateDraft: string;
  onEditBillableRateDraftChange: (value: string) => void;
  saveProjectRate: () => void;
  canSaveProjectRate: boolean;
};

type UseAgencyProjectDetailOptions = {
  teamId: string;
  projectId: string;
};

export function useAgencyProjectDetail({
  teamId,
  projectId,
}: UseAgencyProjectDetailOptions): AgencyProjectDetailViewModel {
  const agencyOps = useAgencyOpsStore();
  const isProjectMutationPending = useAgencyOpsStore(selectIsProjectMutationPending);
  const workspaceNodes = useWorkspaceStore((state) => state.nodes);
  const linkedCanvasHref = useMemo(() => {
    const node = findCanvasNodeForAgencyProject(workspaceNodes, projectId);
    return node ? canvasNodeHref(node.id) : null;
  }, [projectId, workspaceNodes]);
  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    );
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);

  const [activitySort, setActivitySort] = useState<ActivitySort>("newest");
  const [journeyExpandedMobile, setJourneyExpandedMobile] = useState(true);
  const [pendingTrashConfirm, setPendingTrashConfirm] = useState(false);
  const [editBillableRateDraft, setEditBillableRateDraft] = useState("");

  const journeyState = useAgencyProjectJourney(teamId, projectId, {
    enabled: Boolean(teamId && projectId),
  });

  const teamQuery = useQuery({
    ...teamDetailQueryOptions(teamId),
    enabled: Boolean(teamId),
  });
  const isOwner = teamQuery.data?.role === "owner";

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: { teamId, trashFilter: "all" },
    }),
    enabled: Boolean(teamId),
  });

  const project = (projectsQuery.data?.items ?? []).find((entry) => entry.id === projectId) ?? null;

  useEffect(() => {
    if (!project) {
      setEditBillableRateDraft("");
      return;
    }
    if (project.billableRateAmount == null) {
      setEditBillableRateDraft("");
      return;
    }
    setEditBillableRateDraft(String(project.billableRateAmount / 100));
  }, [project?.billableRateAmount, project?.id]);

  const parsedProjectRate = parseBillableRateAmount(editBillableRateDraft);
  const nextProjectRate =
    editBillableRateDraft.trim() === "" ? null : parsedProjectRate;
  const canSaveProjectRate =
    Boolean(project) &&
    isOwner &&
    !isProjectMutationPending &&
    (editBillableRateDraft.trim() === "" || parsedProjectRate !== null) &&
    nextProjectRate !== (project?.billableRateAmount ?? null);

  function saveProjectRate() {
    if (!project || !teamId || !canSaveProjectRate) return;
    const billableRateAmount =
      editBillableRateDraft.trim() === "" ? null : parseBillableRateAmount(editBillableRateDraft);
    if (editBillableRateDraft.trim() && billableRateAmount === null) return;
    void agencyOps
      .updateProject({
        teamId,
        projectId: project.id,
        billableRateAmount,
        currency: project.clientCurrency,
      })
      .then(() => void projectsQuery.refetch());
  }

  const entriesQuery = useQuery({
    ...orpc.agencyOps.reports.listEntries.queryOptions({
      input: {
        teamId,
        projectId,
        from: range.from,
        to: range.to,
        page: 1,
        pageSize: 100,
      },
    }),
    enabled: Boolean(teamId) && Boolean(projectId),
  });

  const budgetsQuery = useQuery({
    ...orpc.agencyOps.budgets.list.queryOptions({
      input: { teamId, projectId },
    }),
    enabled: Boolean(teamId) && Boolean(projectId),
  });

  const projectBudget =
    budgetsQuery.data?.items.find((entry) => entry.projectId === projectId) ?? null;

  const budgetPct = useMemo(() => {
    if (!projectBudget) return 0;
    if (projectBudget.hoursBudget && projectBudget.hoursBudget > 0) {
      return Math.min(
        100,
        Math.round((projectBudget.hoursLogged / projectBudget.hoursBudget) * 100),
      );
    }
    if (projectBudget.costBudgetAmount && projectBudget.costBudgetAmount > 0) {
      return Math.min(
        100,
        Math.round((projectBudget.costLoggedAmount / projectBudget.costBudgetAmount) * 100),
      );
    }
    return 0;
  }, [projectBudget]);

  const budgetTone = budgetPct >= 100 ? "bg-error" : budgetPct >= 85 ? "bg-warning" : "bg-primary";

  const entries = entriesQuery.data?.items ?? [];
  const workSchedule = useTeamWorkSchedule(teamId);
  const weekStartIso = startOfWeekUtc(workSchedule.weekStartsOn).toISOString();

  const totalsThisWeek = useMemo(() => {
    const cutoff = new Date(weekStartIso).getTime();
    return entries
      .filter((entry) => new Date(entry.startedAt).getTime() >= cutoff)
      .reduce((sum, entry) => sum + entry.durationSeconds, 0);
  }, [entries, weekStartIso]);

  const totalsLast30 = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.durationSeconds, 0),
    [entries],
  );

  const hoursByMemberThisWeek = useMemo(() => {
    const cutoff = new Date(weekStartIso).getTime();
    const map = new Map<string, { name: string; seconds: number }>();
    for (const entry of entries) {
      if (new Date(entry.startedAt).getTime() < cutoff) continue;
      const existing = map.get(entry.userId);
      map.set(entry.userId, {
        name: entry.userName,
        seconds: (existing?.seconds ?? 0) + entry.durationSeconds,
      });
    }
    return [...map.entries()]
      .map(([userId, value]) => ({ userId, ...value }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [entries, weekStartIso]);

  const memberSecondsMax = hoursByMemberThisWeek.reduce(
    (max, row) => Math.max(max, row.seconds),
    0,
  );

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 25);

  const sortedRecentEntries = useMemo(() => {
    const list = [...recentEntries];
    if (activitySort === "newest") return list;
    if (activitySort === "oldest") return list.reverse();
    return list.sort((a, b) => b.durationSeconds - a.durationSeconds);
  }, [recentEntries, activitySort]);

  const isLoading = projectsQuery.isPending || entriesQuery.isPending;
  const isError = projectsQuery.isError || entriesQuery.isError;
  const errorMessage = getErrorMessage(
    entriesQuery.error ?? projectsQuery.error,
    "Try refreshing.",
  );

  function retryLoad() {
    void projectsQuery.refetch();
    void entriesQuery.refetch();
    void budgetsQuery.refetch();
  }

  function restoreProject() {
    if (!project || !teamId) return;
    void agencyOps.restoreProject({
      teamId,
      projectId: project.id,
      projectName: project.name,
    });
  }

  function requestMoveToTrash() {
    setPendingTrashConfirm(true);
  }

  function cancelTrashConfirm() {
    if (isProjectMutationPending) return;
    setPendingTrashConfirm(false);
  }

  function confirmMoveToTrash() {
    if (!project || !teamId) return;
    setPendingTrashConfirm(false);
    void agencyOps.deleteProject({
      teamId,
      projectId: project.id,
      projectName: project.name,
    });
  }

  return {
    teamId,
    projectId,
    isLoading,
    isError,
    errorMessage,
    project: project
      ? {
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          clientName: project.clientName,
          deletedAt: project.deletedAt ?? null,
          billableRateAmount: project.billableRateAmount,
          currency: project.currency,
          clientBillableRateAmount: project.clientBillableRateAmount,
          clientCurrency: project.clientCurrency,
          effectiveBillableRateAmount: resolveEffectiveBillableRate(
            project.billableRateAmount,
            project.clientBillableRateAmount,
          ),
        }
      : null,
    projectBudget,
    budgetPct,
    budgetTone,
    totalsThisWeek,
    totalsLast30,
    hoursByMemberThisWeek,
    memberSecondsMax,
    sortedRecentEntries,
    activitySort,
    setActivitySort,
    journeyExpandedMobile,
    setJourneyExpandedMobile,
    journeyState,
    retryLoad,
    isTrashed: Boolean(project?.deletedAt),
    isOwner,
    isProjectMutationPending,
    restoreProject,
    requestMoveToTrash,
    pendingTrashConfirm,
    cancelTrashConfirm,
    confirmMoveToTrash,
    canvasNodeHref: linkedCanvasHref,
    editBillableRateDraft,
    onEditBillableRateDraftChange: setEditBillableRateDraft,
    saveProjectRate,
    canSaveProjectRate,
  };
}
