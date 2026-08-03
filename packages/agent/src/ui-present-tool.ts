import { tool } from "@openrouter/sdk/lib/tool";
import { z } from "zod";

import {
  parseUiPresentInput,
  UI_PRESENT_TOOL_DESCRIPTION,
  UI_PRESENT_TOOL_NAME,
} from "./ui-artifact";

const uiPresentOutputSchema = z.object({
  message: z.string(),
});

const uiPresentInputSchema = z.object({
  // Loose so double-encoded nested JSON from weaker models can still reach execute.
  // OpenRouter's tool() requires a ZodObject shape; z.any() is allowed in $ZodShape, z.unknown() is not.
  artifact: z.any(),
});

/** Validate-only tool — canvas persistence/streaming happens at the turn layer. */
export function createUiPresentTool() {
  return tool({
    name: UI_PRESENT_TOOL_NAME,
    description: UI_PRESENT_TOOL_DESCRIPTION,
    inputSchema: uiPresentInputSchema,
    outputSchema: uiPresentOutputSchema,
    execute: async (raw) => {
      const artifact = parseUiPresentInput(raw);
      return {
        message: `Rendered "${artifact.title}" in the canvas (${artifact.kind}). Summarize it in one line; the operator can already see it.`,
      };
    },
  });
}
