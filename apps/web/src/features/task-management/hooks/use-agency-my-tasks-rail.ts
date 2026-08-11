import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthSession } from "@/lib/auth-session";
import { orpc } from "@/lib/orpc";
import {
  useAgencyActiveTimerQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
} from "@/features/shared/agency-queries";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { toAgencyMemberOption } from "@/features/shared/agency-member-option";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import { groupTasksByClient } from "@/features/task-management/agency-task-utils";
import { useAgencyMyTasksRailStore } from "@/features/task-management/stores/agency-my-tasks-rail";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type MyTasksFilterPill = "open" | "done" | "delegated";

type UseAgencyMyTasksRailOptions = {
  teamId: string;
};

export function useAgencyMyTasksRail({ teamId }: UseAgencyMyTasksRailOptions) {
  const { user } = useAuthSession();
  const actorUserId = user?.id ?? "";

  const hydrate = useAgencyMyTasksRailStore((s) => s.hydrate);
  const collapsed = useAgencyMyTasksRailStore((s) => s.collapsed);
  const setCollapsed = useAgencyMyTasksRailStore((s) => s.setCollapsed);
  const toggleCollapsed = useAgencyMyTasksRailStore((s) => s.toggleCollapsed);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const [pills, setPills] = useState<Set<MyTasksFilterPill>>(() => new Set(["open"]));
  const [titleDraft, setTitleDraft] = useState("");
  const [assigneeUserIds, setAssigneeUserIds] = useState<string[]>(() =>
    actorUserId ? [actorUserId] : [],
  );
  const [assignedToTeam, setAssignedToTeam] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [justCompletedTaskId, setJustCompletedTaskId] = useState<string | null>(null);
  const [justCreatedTaskId, setJustCreatedTaskId] = useState<string | null>(null);
  const [justPlayedTaskId, setJustPlayedTaskId] = useState<string | null>(null);
  const [countTickKey, setCountTickKey] = useState(0);
  const flashTimerIdsRef = useRef<number[]>([]);

  function flashId(setter: (id: string | null) => void, id: string, ms: number) {
    setter(id);
    const timerId = window.setTimeout(() => {
      setter(null);
      flashTimerIdsRef.current = flashTimerIdsRef.current.filter((t) => t !== timerId);
    }, ms);
    flashTimerIdsRef.current.push(timerId);
  }

  useEffect(() => {
    return () => {
      for (const timerId of flashTimerIdsRef.current) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!actorUserId || assignedToTeam || assigneeUserIds.length > 0) return;
    setAssigneeUserIds([actorUserId]);
  }, [actorUserId, assignedToTeam, assigneeUserIds.length]);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];

  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const runningTaskId = activeTimerQuery.data?.timer?.taskId ?? null;

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      setProjectId(activeTimerQuery.data?.timer?.projectId || projects[0].id);
    }
  }, [projectId, projects, activeTimerQuery.data?.timer?.projectId]);

  const showOpen = pills.has("open") || pills.size === 0;
  const showDone = pills.has("done");
  const showDelegated = pills.has("delegated");

  const openQuery = useAgencyProjectTasksQuery(teamId, {
    assigneeUserId: actorUserId || undefined,
    statuses: ["open", "in_progress"],
    enabled: Boolean(actorUserId) && (showOpen || (!showDone && !showDelegated)),
  });
  const doneQuery = useAgencyProjectTasksQuery(teamId, {
    assigneeUserId: actorUserId || undefined,
    statuses: ["done"],
    enabled: Boolean(actorUserId) && showDone,
  });
  const delegatedQuery = useAgencyProjectTasksQuery(teamId, {
    delegatedByUserId: actorUserId || undefined,
    statuses: ["open", "in_progress"],
    enabled: Boolean(actorUserId) && showDelegated,
  });

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.team.members.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  const members = useMemo(
    () => (membersQuery.data?.items ?? []).map(toAgencyMemberOption),
    [membersQuery.data?.items],
  );

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of members) {
      map.set(member.userId, member.userName);
    }
    return map;
  }, [members]);

  const tasks = useMemo(() => {
    const byId = new Map<string, AgencyProjectTask>();
    const push = (items: AgencyProjectTask[] | undefined) => {
      for (const task of items ?? []) {
        byId.set(task.id, task);
      }
    };
    if (showOpen || pills.size === 0) push(openQuery.data?.items);
    if (showDone) push(doneQuery.data?.items);
    if (showDelegated) push(delegatedQuery.data?.items);
    return Array.from(byId.values());
  }, [
    showOpen,
    showDone,
    showDelegated,
    pills.size,
    openQuery.data?.items,
    doneQuery.data?.items,
    delegatedQuery.data?.items,
  ]);

  const clientGroups = useMemo(() => groupTasksByClient(tasks, projects), [tasks, projects]);

  const flatTaskIds = useMemo(
    () => clientGroups.flatMap((group) => group.tasks.map((task) => task.id)),
    [clientGroups],
  );

  const openCount = openQuery.data?.items?.length ?? 0;
  const prevOpenCountRef = useRef(openCount);

  useEffect(() => {
    if (prevOpenCountRef.current === openCount) return;
    prevOpenCountRef.current = openCount;
    setCountTickKey((key) => key + 1);
  }, [openCount]);

  const selectedProject = projects.find((project) => project.id === projectId) ?? null;

  const isLoading =
    (showOpen && openQuery.isLoading) ||
    (showDone && doneQuery.isLoading) ||
    (showDelegated && delegatedQuery.isLoading);
  const queryError =
    openQuery.error ?? doneQuery.error ?? delegatedQuery.error ?? projectsQuery.error;
  const errorMessage = queryError ? getErrorMessage(queryError, "Couldn't load tasks.") : null;

  const createProjectTask = useAgencyOpsStore((s) => s.createProjectTask);
  const completeProjectTaskForMember = useAgencyOpsStore((s) => s.completeProjectTaskForMember);
  const deleteProjectTask = useAgencyOpsStore((s) => s.deleteProjectTask);
  const isCreatingTask = useAgencyOpsStore(selectIsCreatingTask);
  const pendingTaskIds = useAgencyOpsStore((s) => s.pendingTaskIds);
  const deletingTaskIds = useAgencyOpsStore((s) => s.deletingTaskIds);

  function togglePill(pill: MyTasksFilterPill) {
    setPills((prev) => {
      const next = new Set(prev);
      if (next.has(pill)) next.delete(pill);
      else next.add(pill);
      if (next.size === 0) next.add("open");
      return next;
    });
  }

  async function onCreateTask() {
    const title = titleDraft.trim();
    if (!title || !teamId || !projectId) {
      setCreateError(!projectId ? "Choose a project." : null);
      return;
    }
    setCreateError(null);
    setTitleDraft("");
    const createdId = await createProjectTask({
      teamId,
      projectId,
      title,
      assignedToTeam,
      assigneeUserIds: assignedToTeam
        ? []
        : assigneeUserIds.length > 0
          ? assigneeUserIds
          : actorUserId
            ? [actorUserId]
            : [],
    });
    if (createdId) {
      flashId(setJustCreatedTaskId, createdId, 480);
    }
  }

  async function onCompleteTask(taskId: string) {
    flashId(setJustCompletedTaskId, taskId, 650);
    await completeProjectTaskForMember({ teamId, taskId });
  }

  async function onReopenTask(task: { id: string; title: string; projectId: string }) {
    await createProjectTask({
      teamId,
      projectId: task.projectId,
      title: task.title,
      assigneeUserIds: actorUserId ? [actorUserId] : [],
      successToast: false,
    });
  }

  async function onDeleteTask(task: { id: string; title: string }) {
    await deleteProjectTask({ teamId, taskId: task.id, taskTitle: task.title });
  }

  function onSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
  }

  function onKeyboardMove(delta: 1 | -1) {
    if (flatTaskIds.length === 0) return;
    const currentIndex = selectedTaskId ? flatTaskIds.indexOf(selectedTaskId) : -1;
    const nextIndex =
      currentIndex < 0
        ? delta > 0
          ? 0
          : flatTaskIds.length - 1
        : Math.min(flatTaskIds.length - 1, Math.max(0, currentIndex + delta));
    setSelectedTaskId(flatTaskIds[nextIndex] ?? null);
  }

  function onPlaySelected(taskIdOverride?: string) {
    const taskId = taskIdOverride ?? selectedTaskId;
    if (!taskId || !teamId) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const project = projects.find((item) => item.id === task.projectId);
    void useAgencyTimeTrackingStore.getState().startTimer({
      teamId,
      project: { id: task.projectId, name: project?.name ?? "" },
      task: { id: task.id, title: task.title },
      description: "",
      successDescription: "Timer started for this task.",
    });
    flashId(setJustPlayedTaskId, taskId, 450);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable=true]")
      ) {
        return;
      }

      const railFocused =
        target instanceof HTMLElement && Boolean(target.closest("[data-od-id='my-tasks-rail']"));
      if (!railFocused && !selectedTaskId) return;

      if (event.key === "j" || event.key === "J") {
        event.preventDefault();
        onKeyboardMove(1);
        return;
      }
      if (event.key === "k" || event.key === "K") {
        event.preventDefault();
        onKeyboardMove(-1);
        return;
      }
      if (event.key === "Enter" && selectedTaskId) {
        event.preventDefault();
        onPlaySelected();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // ponytail: rebind when selection/list changes; keyboard handlers close over latest state
  }, [selectedTaskId, flatTaskIds, tasks, projects, teamId]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const row = document.querySelector<HTMLElement>(
      `[data-od-id='my-tasks-rail'] [data-task-id='${CSS.escape(selectedTaskId)}']`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [selectedTaskId]);

  function onRetry() {
    void openQuery.refetch();
    void doneQuery.refetch();
    void delegatedQuery.refetch();
    void projectsQuery.refetch();
  }

  return {
    teamId,
    actorUserId,
    collapsed,
    setCollapsed,
    toggleCollapsed,
    sheetOpen,
    setSheetOpen,
    pills,
    togglePill,
    titleDraft,
    setTitleDraft,
    assigneeUserIds,
    setAssigneeUserIds,
    assignedToTeam,
    setAssignedToTeam,
    projectId,
    setProjectId,
    selectedProject,
    projects,
    members,
    memberNameById,
    clientGroups,
    flatTaskIds,
    selectedTaskId,
    onSelectTask,
    onKeyboardMove,
    onPlaySelected,
    runningTaskId,
    openCount,
    isLoading,
    errorMessage,
    createError,
    isCreatingTask,
    pendingTaskIds,
    deletingTaskIds,
    onCreateTask,
    onCompleteTask,
    onReopenTask,
    onDeleteTask,
    onRetry,
    isEmpty: !isLoading && !errorMessage && tasks.length === 0,
    justCompletedTaskId,
    justCreatedTaskId,
    justPlayedTaskId,
    countTickKey,
  };
}

export type AgencyMyTasksRailViewModel = ReturnType<typeof useAgencyMyTasksRail>;
