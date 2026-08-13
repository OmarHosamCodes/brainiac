export const CONTINUE_TURN_TEXT = "Continue.";

export function shouldShowStoppedRun(input: { streamStopped: boolean; isStreaming: boolean }) {
  return input.streamStopped && !input.isStreaming;
}
