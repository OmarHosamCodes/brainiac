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
  test("counts incomplete only, not override", () => {
    expect(
      peopleDirectoryAttentionCount([
        complete,
        { ...complete, hasRate: false },
        { ...complete, hasActiveExemption: true },
      ]),
    ).toBe(1);
  });
});

describe("peopleDirectoryListSignals", () => {
  test("marks incomplete when HR fields are missing", () => {
    const signals = peopleDirectoryListSignals({
      hasEmploymentType: false,
      hasWorkModel: false,
      hasContact: false,
      hasRate: true,
      tenureAwaitingFirstEntry: false,
      hasTenureOverride: false,
      hasActiveExemption: false,
      employmentStatus: null,
    });
    expect(peopleConfigBadge(signals)).toBe("Incomplete");
    expect(peopleConfigCompletionPercent(signals)).toBe(67);
  });

  test("marks incomplete when rate is missing", () => {
    const signals = peopleDirectoryListSignals({
      hasEmploymentType: true,
      hasWorkModel: true,
      hasContact: true,
      hasRate: false,
      tenureAwaitingFirstEntry: false,
      hasTenureOverride: false,
      hasActiveExemption: false,
      employmentStatus: null,
    });
    expect(peopleConfigBadge(signals)).toBe("Incomplete");
  });

  test("does not treat member exemption alone as incomplete", () => {
    const signals = peopleDirectoryListSignals({
      hasEmploymentType: true,
      hasWorkModel: true,
      hasContact: true,
      hasRate: true,
      tenureAwaitingFirstEntry: false,
      hasTenureOverride: false,
      hasActiveExemption: true,
      employmentStatus: "active",
    });
    expect(peopleConfigBadge(signals)).toBe("Override");
    expect(peopleConfigCompletionPercent(signals)).toBe(100);
  });
});
