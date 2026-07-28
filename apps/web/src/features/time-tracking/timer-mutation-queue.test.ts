import { describe, expect, test } from "bun:test";

import { createTimerMutationQueue } from "./timer-mutation-queue";

describe("createTimerMutationQueue", () => {
  test("runs overlapping mutations in order instead of dropping", async () => {
    const queue = createTimerMutationQueue();
    const order: number[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = queue.enqueue(async () => {
      await firstGate;
      order.push(1);
    });
    const second = queue.enqueue(async () => {
      order.push(2);
    });

    expect(order).toEqual([]);
    releaseFirst?.();
    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
  });

  test("continues the queue after a rejected mutation", async () => {
    const queue = createTimerMutationQueue();
    const order: string[] = [];

    const failed = queue.enqueue(async () => {
      order.push("fail");
      throw new Error("boom");
    });
    const next = queue.enqueue(async () => {
      order.push("next");
    });

    await expect(failed).rejects.toThrow("boom");
    await next;
    expect(order).toEqual(["fail", "next"]);
  });
});
