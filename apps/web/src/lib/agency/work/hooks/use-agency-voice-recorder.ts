import { useEffect, useRef, useState } from "react";

type UseAgencyVoiceRecorderOptions = {
  disabled?: boolean;
  onRecorded: (file: File, durationSeconds: number) => void;
};

export type AgencyVoiceRecorderViewModel = {
  disabled: boolean;
  isRecording: boolean;
  recordedUrl: string;
  recordingSeconds: number;
  recordingDurationLabel: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSendRecording: () => void;
  onDiscardRecording: () => void;
};

function formatRecordingDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function useAgencyVoiceRecorder({
  disabled = false,
  onRecorded,
}: UseAgencyVoiceRecorderOptions): AgencyVoiceRecorderViewModel {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerHandleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopTimer() {
    if (timerHandleRef.current) {
      clearInterval(timerHandleRef.current);
      timerHandleRef.current = null;
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  }

  async function startRecording() {
    if (disabled) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      stopTimer();
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingSeconds(0);
    timerHandleRef.current = setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1_000);
  }

  function sendRecording() {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
    onRecorded(file, recordingSeconds);
    discardRecording();
  }

  function discardRecording() {
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedBlob(null);
    setRecordedUrl("");
    setRecordingSeconds(0);
  }

  useEffect(() => {
    return () => {
      stopRecording();
      stopTimer();
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  return {
    disabled,
    isRecording,
    recordedUrl,
    recordingSeconds,
    recordingDurationLabel: formatRecordingDuration(recordingSeconds),
    onStartRecording: () => void startRecording(),
    onStopRecording: stopRecording,
    onSendRecording: sendRecording,
    onDiscardRecording: discardRecording,
  };
}
