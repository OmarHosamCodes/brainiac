import { describe, expect, test } from "bun:test";

import {
  filterMemberProfileRoster,
  memberProfileInitials,
  resolveMemberProfileRosterNav,
  sortMemberProfileRoster,
} from "./member-profile-roster-nav";

describe("memberProfileInitials", () => {
  test("uses first letters of two names", () => {
    expect(memberProfileInitials("Omar Hassan")).toBe("OH");
  });

  test("uses two letters for a single token", () => {
    expect(memberProfileInitials("Omar")).toBe("OM");
  });

  test("falls back for empty names", () => {
    expect(memberProfileInitials("   ")).toBe("?");
  });
});

describe("resolveMemberProfileRosterNav", () => {
  const members = [
    { userId: "c", userName: "Carol", userAvatarUrl: null },
    { userId: "a", userName: "Alice", userAvatarUrl: "https://example.com/a.png" },
    { userId: "b", userName: "Bob", userAvatarUrl: null },
  ];

  test("sorts A→Z and resolves prev/next", () => {
    const nav = resolveMemberProfileRosterNav(members, "b");
    expect(nav.members.map((m) => m.userId)).toEqual(["a", "b", "c"]);
    expect(nav.previous?.userId).toBe("a");
    expect(nav.next?.userId).toBe("c");
    expect(nav.index).toBe(1);
    expect(nav.total).toBe(3);
  });

  test("disables previous at the start", () => {
    const nav = resolveMemberProfileRosterNav(members, "a");
    expect(nav.previous).toBeNull();
    expect(nav.next?.userId).toBe("b");
  });

  test("disables next at the end", () => {
    const nav = resolveMemberProfileRosterNav(members, "c");
    expect(nav.previous?.userId).toBe("b");
    expect(nav.next).toBeNull();
  });
});

describe("filterMemberProfileRoster", () => {
  test("filters by name case-insensitively", () => {
    const sorted = sortMemberProfileRoster([
      { userId: "1", userName: "Alice", userAvatarUrl: null },
      { userId: "2", userName: "Bob", userAvatarUrl: null },
    ]);
    expect(filterMemberProfileRoster(sorted, "li").map((m) => m.userId)).toEqual(["1"]);
  });
});
