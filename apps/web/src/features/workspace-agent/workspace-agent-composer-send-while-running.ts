export function shouldShowComposerSendWhileRunning(input: {
  isRunning: boolean;
  hasSendWhileRunningHandler: boolean;
}): boolean {
  return input.isRunning && input.hasSendWhileRunningHandler;
}

export function canComposerSendWhileRunning(text: string): boolean {
  return text.trim().length > 0;
}
