import { describe, expect, it } from "bun:test";

const NEAR_BOTTOM_THRESHOLD_PX = 80;

function isNearBottom(scrollTop: number, scrollHeight: number, clientHeight: number) {
  return scrollHeight - scrollTop - clientHeight <= NEAR_BOTTOM_THRESHOLD_PX;
}

describe("useTaskThreadScroll near-bottom gate", () => {
  it("treats viewport as near bottom within threshold", () => {
    expect(isNearBottom(920, 1000, 80)).toBe(true);
    expect(isNearBottom(800, 1000, 80)).toBe(false);
  });
});
