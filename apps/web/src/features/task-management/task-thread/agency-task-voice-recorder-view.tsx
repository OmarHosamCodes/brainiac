import { Mic, Send, Square, Trash2 } from "lucide-react";

import { AgencyTaskMediaPlayer } from "@/features/task-management/task-thread/agency-task-media-player";
import { Button } from "@/ui/button";
import type { AgencyVoiceRecorderViewModel } from "@/features/task-management/hooks/use-agency-voice-recorder";

type AgencyTaskVoiceRecorderViewProps = {
  view: AgencyVoiceRecorderViewModel;
};

export function AgencyTaskVoiceRecorderView({ view }: AgencyTaskVoiceRecorderViewProps) {
  const {
    disabled,
    isRecording,
    recordedUrl,
    recordingDurationLabel,
    onStartRecording,
    onStopRecording,
    onSendRecording,
    onDiscardRecording,
  } = view;

  return (
    <div className="inline-flex items-center gap-1">
      {!isRecording && !recordedUrl ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label="Record voice message"
          onClick={onStartRecording}
        >
          <Mic />
        </Button>
      ) : isRecording ? (
        <>
          <span className="text-xs tabular-nums text-error">{recordingDurationLabel}</span>
          <Button variant="secondary" size="sm" onClick={onStopRecording}>
            <Square />
          </Button>
        </>
      ) : (
        <>
          <AgencyTaskMediaPlayer
            src={recordedUrl}
            mimeType="audio/webm"
            fileName="Recorded voice message"
            compact
          />
          <Button variant="secondary" size="sm" onClick={onSendRecording}>
            <Send />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDiscardRecording}>
            <Trash2 />
          </Button>
        </>
      )}
    </div>
  );
}
