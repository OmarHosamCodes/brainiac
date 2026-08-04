import { tool } from "@openrouter/sdk/lib/tool";
import { createWorkspaceId } from "@orch/workspace";
import { z } from "zod";

export const ASK_AGENCY_QUESTION_TOOL_NAME = "ask_agency_question";

export const agencyQuestionOptionSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(200),
  hint: z.string().trim().min(1).max(300).optional(),
});

export const agencyQuestionKindSchema = z.enum(["single", "multi", "text"]);

const agencyQuestionOptionsSchema = z.array(agencyQuestionOptionSchema).max(12);

export const agencyAgentQuestionSchema = z
  .object({
    questionId: z.string().trim().min(1).max(160),
    prompt: z.string().trim().min(1).max(500),
    kind: agencyQuestionKindSchema,
    options: agencyQuestionOptionsSchema.default([]),
    allowFreeText: z.boolean().default(false),
    context: z.string().trim().min(1).max(1_000).optional(),
    status: z.literal("pending"),
    note: z.string().trim().min(1).max(300),
  })
  .superRefine((value, ctx) => {
    if ((value.kind === "single" || value.kind === "multi") && value.options.length < 2) {
      ctx.addIssue({
        code: "custom",
        message: "single/multi questions need at least 2 options",
        path: ["options"],
      });
    }
    if (value.kind === "text" && value.options.length > 0) {
      ctx.addIssue({
        code: "custom",
        message: "text questions must not include options",
        path: ["options"],
      });
    }
  });

export type AgencyAgentQuestion = z.infer<typeof agencyAgentQuestionSchema>;

export function isAgencyQuestionAnswerMessage(content: unknown): boolean {
  return typeof content === "string" && /^Answer to question [^:]+:\s*\S/.test(content.trim());
}

const askAgencyQuestionInputSchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  kind: agencyQuestionKindSchema,
  options: agencyQuestionOptionsSchema.optional(),
  allowFreeText: z.boolean().optional(),
  context: z.string().trim().min(1).max(1_000).optional(),
});

/** Validate-only HITL question — UI card is streamed at the turn layer. */
export function createAskAgencyQuestionTool() {
  return tool({
    name: ASK_AGENCY_QUESTION_TOOL_NAME,
    description:
      "Ask the user a clarifying question in the chat UI (single choice, multi choice, or free text). Required in Plan mode before draft_agency_plan. Prefer pairing with ui_present for context. Never ask clarifying questions only in prose.",
    inputSchema: askAgencyQuestionInputSchema,
    outputSchema: agencyAgentQuestionSchema,
    execute: async ({ prompt, kind, options, allowFreeText, context }) => {
      const normalizedOptions = options ?? [];
      return agencyAgentQuestionSchema.parse({
        questionId: createWorkspaceId("aq"),
        prompt,
        kind,
        options: kind === "text" ? [] : normalizedOptions,
        allowFreeText: allowFreeText ?? kind === "text",
        ...(context ? { context } : {}),
        status: "pending",
        note: "Waiting for the user to answer in the UI.",
      });
    },
  });
}
