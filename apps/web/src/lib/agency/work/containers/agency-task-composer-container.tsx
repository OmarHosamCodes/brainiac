import { useAgencyTaskComposer } from "@/lib/agency/work/hooks/use-agency-task-composer";
import type { AgencyTaskComposerUploadHandler } from "@/lib/agency/work/hooks/use-agency-task-composer";
import { useAgencyVoiceRecorder } from "@/lib/agency/work/hooks/use-agency-voice-recorder";

import { AgencyTaskComposerView } from "@/components/agency/work/task-thread/agency-task-composer-view";

type AgencyTaskComposerContainerProps = {
  teamId: string;
  taskId: string;
  agentEnabled: boolean;
  onSent: () => void;
  onRegisterUploadHandler?: (handler: AgencyTaskComposerUploadHandler | null) => void;
};

export function AgencyTaskComposerContainer({
  onRegisterUploadHandler = () => {},
  ...props
}: AgencyTaskComposerContainerProps) {
  const composer = useAgencyTaskComposer({ ...props, onRegisterUploadHandler });
  const voice = useAgencyVoiceRecorder({
    disabled: composer.isBusy,
    onRecorded: composer.onVoiceRecorded,
  });
  return <AgencyTaskComposerView composer={composer} voice={voice} />;
}
