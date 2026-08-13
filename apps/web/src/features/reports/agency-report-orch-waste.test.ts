import { describe, expect, test } from "bun:test";

import { buildWasteOrchPrompt } from "./agency-report-orch-waste";

describe("buildWasteOrchPrompt", () => {
  test("names one entry id and forbids whole-day waste", () => {
    const prompt = buildWasteOrchPrompt({
      entryId: "e1",
      description: "Slack",
      durationLabel: "00:12:04",
    });
    expect(prompt).toContain("e1");
    expect(prompt).toContain("Slack");
    expect(prompt).toContain("time_entry.update");
    expect(prompt.toLowerCase()).toContain("only this entry");
    expect(prompt).toContain("isWaste");
  });
});
