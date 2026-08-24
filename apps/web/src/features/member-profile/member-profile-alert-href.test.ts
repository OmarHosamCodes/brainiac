import { describe, expect, test } from "bun:test";

import { buildMemberProfileAlertHref } from "./member-profile-alert-href";

describe("buildMemberProfileAlertHref", () => {
  test("includes focus and alertId", () => {
    expect(
      buildMemberProfileAlertHref({
        subjectUserId: "user-1",
        alertId: "alert-9",
      }),
    ).toBe("/agency/members/user-1?focus=alerts&alertId=alert-9");
  });

  test("prefers day over period when both present", () => {
    expect(
      buildMemberProfileAlertHref({
        subjectUserId: "user-1",
        alertId: "a1",
        dateKey: "2026-08-04",
        periodKey: "2026-08",
      }),
    ).toBe("/agency/members/user-1?focus=alerts&alertId=a1&day=2026-08-04");
  });

  test("uses month period when no day", () => {
    expect(
      buildMemberProfileAlertHref({
        subjectUserId: "user-1",
        periodKey: "2026-08",
      }),
    ).toBe("/agency/members/user-1?focus=alerts&period=2026-08");
  });

  test("uses tenure month fingerprint when no day", () => {
    expect(
      buildMemberProfileAlertHref({
        subjectUserId: "user-1",
        alertId: "a1",
        periodKey: "tm:2026-07-26",
      }),
    ).toBe("/agency/members/user-1?focus=alerts&alertId=a1&period=tm%3A2026-07-26");
  });

  test("uses fiscal quarter period when no day", () => {
    expect(
      buildMemberProfileAlertHref({
        subjectUserId: "user-1",
        periodKey: "2026-Q3",
      }),
    ).toBe("/agency/members/user-1?focus=alerts&period=2026-Q3");
  });
});
