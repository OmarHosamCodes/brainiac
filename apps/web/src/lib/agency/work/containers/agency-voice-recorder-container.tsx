import { useAgencyVoiceRecorder } from "@/lib/agency/work/hooks/use-agency-voice-recorder";

import { AgencyTaskVoiceRecorderView } from "@/components/agency/work/task-thread/agency-task-voice-recorder-view";

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
