/**
 * Serializes async timer start/stop so overlapping clicks enqueue instead of
 * dropping. Previous rejection still advances the chain so later ops run.
 */
export function createTimerMutationQueue() {
  let chain: Promise<void> = Promise.resolve();

  function enqueue(run: () => Promise<void>): Promise<void> {
    const next = chain.then(run, run);
    chain = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  return { enqueue };
}
