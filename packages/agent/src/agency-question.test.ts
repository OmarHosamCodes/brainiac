import { describe, expect, test } from "bun:test";

import {
  agencyAgentQuestionSchema,
  ASK_AGENCY_QUESTION_TOOL_NAME,
  createAskAgencyQuestionTool,
  isAgencyQuestionAnswerMessage,
} from "./agency-question";

function getQuestionTool() {
  const entry = createAskAgencyQuestionTool();
  if (entry.type !== "function") {
    throw new Error("expected function tool");
  }
  return entry.function;
}

describe("ask_agency_question tool", () => {
  test("creates a pending single-choice question", async () => {
    const toolDef = getQuestionTool();
    expect(toolDef.name).toBe(ASK_AGENCY_QUESTION_TOOL_NAME);

    const input = toolDef.inputSchema.parse({
      prompt: "Which entries should we clean first?",
      kind: "single",
      options: [
        { id: "standup", label: "Standup typos" },
        { id: "internal", label: "Internal meetings" },
      ],
      context: "August time cleanup",
    });
    const result = await toolDef.execute(input);
    const parsed = agencyAgentQuestionSchema.parse(result);
    expect(parsed.status).toBe("pending");
    expect(parsed.questionId.startsWith("aq-")).toBe(true);
    expect(parsed.options).toHaveLength(2);
    expect(parsed.allowFreeText).toBe(false);
  });

  test("rejects single choice with fewer than two options", async () => {
    const toolDef = getQuestionTool();
    const input = toolDef.inputSchema.parse({
      prompt: "Pick one",
      kind: "single",
      options: [{ id: "a", label: "A" }],
    });
    await expect(toolDef.execute(input)).rejects.toThrow();
  });

  test("recognizes a submitted question answer", () => {
    expect(isAgencyQuestionAnswerMessage("Answer to question aq-1: Standup typos")).toBe(true);
    expect(isAgencyQuestionAnswerMessage("Can you clarify this?")).toBe(false);
    expect(isAgencyQuestionAnswerMessage("Answer to question aq-1:")).toBe(false);
  });
});
