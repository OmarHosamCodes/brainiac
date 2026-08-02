import { describe, expect, test } from "bun:test";

import {
  peopleConfigBadge,
  peopleConfigCompletionPercent,
  peopleConfigStepDone,
  peopleDirectoryAttentionCount,
  peopleDirectoryListSignals,
  type PeopleConfigSignals,
} from "./people-config-completion";

const complete: PeopleConfigSignals = {
  hasEmploymentType: true,
  hasWorkModel: true,
  hasContact: true,
  hasRate: true,
  tenureAwaitingFirstEntry: false,
  hasTenureOverride: false,
  hasActiveExemption: false,
  employmentStatus: "active",
};

describe("peopleConfigCompletionPercent", () => {
  test("returns 100 when every step is ready", () => {
    expect(peopleConfigCompletionPercent(complete)).toBe(100);
  });

  test("drops for missing rates and employment", () => {
    expect(
      peopleConfigCompletionPercent({
        ...complete,
        hasRate: false,
        hasEmploymentType: false,
      }),
    ).toBe(67);
  });
});

describe("peopleConfigBadge", () => {
  test("marks inactive first", () => {
    expect(peopleConfigBadge({ ...complete, employmentStatus: "inactive" })).toBe("Inactive");
  });

  test("marks incomplete before override", () => {
    expect(
      peopleConfigBadge({
        ...complete,
        hasRate: false,
        hasTenureOverride: true,
      }),
    ).toBe("Incomplete");
  });

  test("marks override when complete with exemption", () => {
    expect(peopleConfigBadge({ ...complete, hasActiveExemption: true })).toBe("Override");
  });
});

describe("peopleConfigStepDone", () => {
  test("leave and access are always ready", () => {
    const done = peopleConfigStepDone({
      ...complete,
      hasContact: false,
      hasRate: false,
    });
    expect(done.leave).toBe(true);
    expect(done.access).toBe(true);
    expect(done.identity).toBe(false);
    expect(done.rates).toBe(false);
  });
});

describe("peopleDirectoryAttentionCount", () => {
  test("counts incomplete and override cards", () => {
    expect(
      peopleDirectoryAttentionCount([
        complete,
        { ...complete, hasRate: false },
        { ...complete, hasActiveExemption: true },
      ]),
    ).toBe(2);
  });
});

describe("peopleDirectoryListSignals", () => {
  test("does not mark incomplete for unknown HR fields", () => {
    const signals = peopleDirectoryListSignals({
      hasRate: true,
      tenureAwaitingFirstEntry: false,
      hasTenureOverride: false,
      hasActiveExemption: false,
    });
    expect(peopleConfigBadge(signals)).toBe(null);
    expect(peopleConfigCompletionPercent(signals)).toBe(100);
  });

  test("marks incomplete when rate is missing", () => {
    const signals = peopleDirectoryListSignals({
      hasRate: false,
      tenureAwaitingFirstEntry: false,
      hasTenureOverride: false,
      hasActiveExemption: false,
    });
    expect(peopleConfigBadge(signals)).toBe("Incomplete");
  });
});
