import { isCancelledError } from "@tanstack/react-query";

export function isQueryCancelRejection(error: unknown): boolean {
  if (isCancelledError(error)) return true;
  // Cross-bundle copies of query-core fail `instanceof CancelledError`.
  return error instanceof Error && error.message === "CancelledError";
}

/** Ignore expected in-flight query cancels; rethrow anything else. */
export function ignoreQueryCancelRejection(error: unknown): void {
  if (isQueryCancelRejection(error)) return;
  throw error;
}

export async function settledQueryCancel(run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
  } catch (error) {
    ignoreQueryCancelRejection(error);
  }
}
