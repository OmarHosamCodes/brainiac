import { Mic, Send, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { AgencyTaskMediaPlayer } from "./agency-task-media-player";

type AgencyVoiceRecorderProps = {
  disabled?: boolean;
  onRecorded: (file: File, durationSeconds: number) => void;
};

function formatRecordingDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function AgencyVoiceRecorder({ disabled = false, onRecorded }: AgencyVoiceRecorderProps) {
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
      setRecordingSeconds((value) => value + 1);
    }, 1_000);
  }

  function sendRecording() {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `voice-${Date.now()}.webm`, {
      type: "audio/webm",
    });
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

  return (
    <div className="inline-flex items-center gap-1">
      {!isRecording && !recordedUrl ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label="Record voice message"
          onClick={() => void startRecording()}
        >
          <Mic />
        </Button>
      ) : isRecording ? (
        <>
          <span className="text-xs tabular-nums text-error">
            {formatRecordingDuration(recordingSeconds)}
          </span>
          <Button variant="secondary" size="sm" onClick={stopRecording}>
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
          <Button variant="secondary" size="sm" onClick={sendRecording}>
            <Send />
          </Button>
          <Button variant="ghost" size="sm" onClick={discardRecording}>
            <Trash2 />
          </Button>
        </>
      )}
    </div>
  );
}
