import { useCallback, useEffect, useMemo, useState } from "react";

import { useTaskThreadMessaging } from "@/lib/agency/work/hooks/use-task-thread-messaging";
import type { AgencyVoiceRecorderViewModel } from "@/lib/agency/work/hooks/use-agency-voice-recorder";
import type {
  AgencyProjectJourneyStep,
  AgencyTaskProject,
  AgencyTimeEntry,
} from "@/lib/schemas/agency-work";
import {
  useAgencyProjectJourneyQuery,
  useAgencyTaskThreadContextQuery,
  useAgencyTimeEntriesQuery,
} from "@/lib/queries/agency";
import { findProjectTaskInCache } from "@/lib/utils/agency-query-cache";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  isJourneyMilestoneTask,
  resolveFocusedJourneyStep,
  sumStepHoursFromEntries,
} from "@/lib/utils/agency-task-journey";
import { useAgencyTaskThreadStore } from "@/stores/agency-task-thread";

import type {
  TaskThreadComposerViewModel,
  TaskThreadMessageViewModel,
} from "@/lib/agency/work/hooks/use-task-thread-messaging";

export type AgencyTaskProgressThreadPanel = "progress" | "messages";

type UseAgencyTaskProgressThreadOptions = {
  teamId: string;
  taskId: string;
  projects: AgencyTaskProject[];
  onBack: () => void;
};

export type AgencyTaskProgressThreadViewModel =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void }
  | {
      status: "ready";
      teamId: string;
      taskId: string;
      taskTitle: string;
      clientName: string;
      projectName: string;
      projectId: string;
      taskKind: "journey_anchor" | "journey_milestone";
      steps: AgencyProjectJourneyStep[];
      focusedStep: AgencyProjectJourneyStep | null;
      focusedStepHoursSeconds: number;
      stepEntries: AgencyTimeEntry[];
      stepEntriesEmpty: boolean;
      completedSteps: number;
      totalSteps: number;
      panel: AgencyTaskProgressThreadPanel;
      onPanelChange: (panel: AgencyTaskProgressThreadPanel) => void;
      messages: TaskThreadMessageViewModel[];
      messagesEmpty: boolean;
      hasOlderMessages: boolean;
      isFetchingOlder: boolean;
      agentPending: boolean;
      lastError: string | null;
      onClearError: () => void;
      onBack: () => void;
      onEditJourney?: () => void;
      threadContainerRef: React.RefObject<HTMLDivElement | null>;
      showJumpToLatest: boolean;
      onJumpToLatest: () => void;
      composer: TaskThreadComposerViewModel;
      voice: AgencyVoiceRecorderViewModel;
    };

export function useAgencyTaskProgressThread({
  teamId,
  taskId,
  projects,
  onBack,
}: UseAgencyTaskProgressThreadOptions): AgencyTaskProgressThreadViewModel {
  const agentEnabled = useAgencyTaskThreadStore((s) => s.agentEnabled);
  const resetThreadStore = useAgencyTaskThreadStore((s) => s.reset);
  const [panel, setPanel] = useState<AgencyTaskProgressThreadPanel>("progress");

  const cachedTask = useMemo(
    () => findProjectTaskInCache(teamId, taskId),
    [teamId, taskId],
  );
  const contextQuery = useAgencyTaskThreadContextQuery(teamId, taskId);
  const context = contextQuery.data;
  const projectId = context?.projectId ?? cachedTask?.projectId ?? "";
  const project = projects.find((entry) => entry.id === projectId);
  const journeyQuery = useAgencyProjectJourneyQuery(teamId, projectId);
  const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 50);
  const messaging = useTaskThreadMessaging({ teamId, taskId, agentEnabled });

  useEffect(() => {
    resetThreadStore();
    setPanel("progress");
  }, [taskId, resetThreadStore]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onBack();
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onBack]);

  const journey = journeyQuery.data;
  const focusedStep = useMemo(() => {
    if (!cachedTask || !journey) return null;
    return resolveFocusedJourneyStep(journey, cachedTask);
  }, [cachedTask, journey]);

  const allEntries = entriesQuery.data?.items ?? [];
  const stepEntries = useMemo(() => {
    if (!focusedStep?.taskId) return [];
    return allEntries
      .filter((entry) => entry.taskId === focusedStep.taskId)
      .slice(0, 8);
  }, [allEntries, focusedStep?.taskId]);

  const focusedStepHoursSeconds = useMemo(
    () => sumStepHoursFromEntries(allEntries, focusedStep?.taskId),
    [allEntries, focusedStep?.taskId],
  );

  const isLoading =
    contextQuery.isPending ||
    journeyQuery.isPending ||
    (!cachedTask && contextQuery.isSuccess);
  const isError = contextQuery.isError || journeyQuery.isError;

  const retry = useCallback(() => {
    void contextQuery.refetch();
    void journeyQuery.refetch();
    void entriesQuery.refetch();
    void messaging.refetchMessages();
  }, [contextQuery, entriesQuery, journeyQuery, messaging]);

  if (isLoading) {
    return { status: "loading" };
  }

  if (isError || !context || !journey || !cachedTask) {
    const error = contextQuery.error ?? journeyQuery.error;
    return {
      status: "error",
      message: getErrorMessage(error, "Try refreshing."),
      onRetry: retry,
    };
  }

  const resolvedKind = isJourneyMilestoneTask(cachedTask)
    ? "journey_milestone"
    : "journey_anchor";

  return {
    status: "ready",
    teamId,
    taskId,
    taskTitle: context.taskTitle,
    clientName: project?.clientName ?? "Client",
    projectName: project?.name ?? context.projectName ?? "Project",
    projectId,
    taskKind: resolvedKind,
    steps: journey.steps,
    focusedStep,
    focusedStepHoursSeconds,
    stepEntries,
    stepEntriesEmpty: stepEntries.length === 0,
    completedSteps: journey.completedSteps,
    totalSteps: journey.totalSteps,
    panel,
    onPanelChange: setPanel,
    messages: messaging.messages,
    messagesEmpty: messaging.messagesEmpty,
    hasOlderMessages: messaging.hasOlderMessages,
    isFetchingOlder: messaging.isFetchingOlder,
    agentPending: messaging.agentPending,
    lastError: messaging.lastError,
    onClearError: messaging.clearError,
    onBack,
    threadContainerRef: messaging.scroll.containerRef,
    showJumpToLatest: messaging.scroll.showJumpToLatest,
    onJumpToLatest: () => messaging.scroll.scrollToBottom(),
    composer: messaging.composer,
    voice: messaging.voice,
  };
}
