import { useAgencyVoiceRecorder } from "@/features/task-management/hooks/use-agency-voice-recorder";

import { AgencyTaskVoiceRecorderView } from "@/features/task-management/task-thread/agency-task-voice-recorder-view";

type AgencyVoiceRecorderContainerProps = {
  disabled?: boolean;
  onRecorded: (file: File, durationSeconds: number) => void;
};

export function AgencyVoiceRecorderContainer({
  disabled = false,
  onRecorded,
}: AgencyVoiceRecorderContainerProps) {
  const view = useAgencyVoiceRecorder({ disabled, onRecorded });
  return <AgencyTaskVoiceRecorderView view={view} />;
}
