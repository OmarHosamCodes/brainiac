import { z } from "zod";

/** Max React module source length for sandboxed artifacts. */
export const AI_UI_REACT_CODE_MAX = 24_000;

export const UI_PRESENT_TOOL_NAME = "ui_present";

const uiTextNodeSchema = z.object({
  type: z.literal("text"),
  text: z.string().max(8_000),
  tone: z.enum(["default", "muted"]).optional(),
});

const uiMarkdownNodeSchema = z.object({
  type: z.literal("markdown"),
  text: z.string().max(12_000),
});

const uiDividerNodeSchema = z.object({
  type: z.literal("divider"),
});

const uiStatNodeSchema = z.object({
  type: z.literal("stat"),
  label: z.string().min(1).max(80),
  value: z.union([z.string().max(80), z.number()]),
  hint: z.string().max(160).optional(),
});

const uiCalloutNodeSchema = z.object({
  type: z.literal("callout"),
  tone: z.enum(["info", "success", "warning", "danger"]).default("info"),
  title: z.string().max(120).optional(),
  body: z.string().min(1).max(4_000),
});

const uiPillRowNodeSchema = z.object({
  type: z.literal("pillRow"),
  pills: z
    .array(
      z.object({
        label: z.string().min(1).max(60),
        tone: z.enum(["default", "accent", "muted"]).optional(),
      }),
    )
    .min(1)
    .max(24),
});

const uiTableNodeSchema = z.object({
  type: z.literal("table"),
  columns: z.array(z.string().min(1).max(60)).min(1).max(12),
  rows: z.array(z.array(z.union([z.string().max(500), z.number(), z.null()])).max(12)).max(100),
});

/** http/https only — `z.string().url()` alone would accept `javascript:`. */
const webUrlSchema = z
  .string()
  .url()
  .max(2_000)
  .refine((value) => {
    const scheme = value.slice(0, value.indexOf(":")).toLowerCase();
    return scheme === "http" || scheme === "https";
  }, "Only http(s) URLs are allowed");

const uiImageGridNodeSchema = z.object({
  type: z.literal("imageGrid"),
  items: z
    .array(
      z.object({
        src: webUrlSchema,
        title: z.string().max(120).optional(),
        subtitle: z.string().max(240).optional(),
        href: webUrlSchema.optional(),
      }),
    )
    .min(1)
    .max(48),
});

type UiNode =
  | z.infer<typeof uiTextNodeSchema>
  | z.infer<typeof uiMarkdownNodeSchema>
  | z.infer<typeof uiDividerNodeSchema>
  | z.infer<typeof uiStatNodeSchema>
  | z.infer<typeof uiCalloutNodeSchema>
  | z.infer<typeof uiPillRowNodeSchema>
  | z.infer<typeof uiTableNodeSchema>
  | z.infer<typeof uiImageGridNodeSchema>
  | { type: "stack"; gap?: "sm" | "md" | "lg"; children: UiNode[] }
  | {
      type: "grid";
      columns?: 1 | 2 | 3 | 4;
      gap?: "sm" | "md" | "lg";
      children: UiNode[];
    };

const uiNodeSchema: z.ZodType<UiNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    uiTextNodeSchema,
    uiMarkdownNodeSchema,
    uiDividerNodeSchema,
    uiStatNodeSchema,
    uiCalloutNodeSchema,
    uiPillRowNodeSchema,
    uiTableNodeSchema,
    uiImageGridNodeSchema,
    z.object({
      type: z.literal("stack"),
      gap: z.enum(["sm", "md", "lg"]).optional(),
      children: z.array(uiNodeSchema).min(1).max(40),
    }),
    z.object({
      type: z.literal("grid"),
      columns: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
      gap: z.enum(["sm", "md", "lg"]).optional(),
      children: z.array(uiNodeSchema).min(1).max(40),
    }),
  ]),
);

export const uiSchemaDocSchema = z.object({
  version: z.literal(1),
  root: uiNodeSchema,
});
export type UiSchemaDoc = z.infer<typeof uiSchemaDocSchema>;
export type UiSchemaNode = UiNode;

const artifactIdSchema = z.string().min(1).max(80);

export const aiUiSchemaArtifactSchema = z.object({
  id: artifactIdSchema,
  kind: z.literal("schema"),
  title: z.string().min(1).max(160),
  schema: uiSchemaDocSchema,
});

export const aiUiReactArtifactSchema = z.object({
  id: artifactIdSchema,
  kind: z.literal("react"),
  title: z.string().min(1).max(160),
  code: z.string().min(1).max(AI_UI_REACT_CODE_MAX),
  props: z.record(z.string(), z.unknown()).optional(),
});

export const aiUiArtifactSchema = z.discriminatedUnion("kind", [
  aiUiSchemaArtifactSchema,
  aiUiReactArtifactSchema,
]);
export type AiUiArtifact = z.infer<typeof aiUiArtifactSchema>;

export const aiUiArtifactsSchema = z.array(aiUiArtifactSchema).max(8);

/** JSON.parse a value only if it's a string that looks like an object/array. */
function coerceJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * Parse tool args for ui_present — accepts `{ artifact }` or the artifact itself.
 * Weaker models often double-encode nested objects (e.g. `{ artifact: "{...}" }`
 * or a stringified `schema`), so coerce stringified JSON at each level before
 * validating. This is defensive parsing at the LLM trust boundary.
 */
export function parseUiPresentInput(raw: unknown): AiUiArtifact {
  const outer = coerceJson(raw);
  const unwrapped =
    outer && typeof outer === "object" && "artifact" in outer
      ? coerceJson((outer as { artifact: unknown }).artifact)
      : outer;
  if (unwrapped && typeof unwrapped === "object" && "schema" in unwrapped) {
    (unwrapped as { schema: unknown }).schema = coerceJson(
      (unwrapped as { schema: unknown }).schema,
    );
  }
  return aiUiArtifactSchema.parse(unwrapped);
}

/**
 * Re-validate a successful `ui_present` call into a canvas artifact.
 * The tool handler is validate-only; persistence + streaming live at the turn layer.
 */
export function artifactFromToolCall(call: {
  name: string;
  input?: unknown;
  status?: "completed" | "error" | "in_progress";
}): AiUiArtifact | null {
  if (call.name !== UI_PRESENT_TOOL_NAME) return null;
  if (call.status === "error" || call.status === "in_progress") return null;
  try {
    return parseUiPresentInput(call.input);
  } catch {
    // ponytail: the tool result already reported the schema error to the model.
    return null;
  }
}

/** Trim to the persisted artifact cap so one turn can't flood the canvas. */
export function cappedArtifacts(artifacts: AiUiArtifact[]): AiUiArtifact[] {
  if (artifacts.length === 0) return [];
  const parsed = aiUiArtifactsSchema.safeParse(artifacts);
  return parsed.success ? parsed.data : artifacts.slice(0, 8);
}

export const UI_PRESENT_TOOL_DESCRIPTION =
  "Render a live UI artifact in the operator canvas (tables, metrics, comparisons, lists). Prefer kind 'schema' (stack, grid, stat, table, callout, pillRow, imageGrid, markdown, text, divider). Use kind 'react' only when schema cannot express it: sandbox plain JS only (no JSX/imports/fetch); h(type, props, ...children); render(element) once; props global; components Stack, Grid, Stat, Table, Text, Image, Callout. Reply one short line after; never repeat rendered data.";

/** One-line system nudge; full rules live on the ui_present tool description. */
export const UI_PRESENT_SYSTEM_GUIDANCE =
  "For tables, comparisons, metrics, or multi-item lists, call ui_present instead of dumping markdown; then reply with one short line.";
