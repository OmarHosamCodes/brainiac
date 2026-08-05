import { z } from "zod";

export const moneyFormulaTokenSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("var"), id: z.string().min(1) }),
  z.object({ kind: z.literal("number"), value: z.number().finite() }),
  z.object({
    kind: z.literal("op"),
    op: z.enum(["+", "-", "*", "/"]),
  }),
  z.object({ kind: z.literal("paren"), value: z.enum(["(", ")"]) }),
]);

export const moneyFormulaDefSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  locked: z.boolean(),
  enabled: z.boolean(),
  tokens: z.array(moneyFormulaTokenSchema).min(1),
  output: z.enum(["cents", "ratio", "hours"]),
  metricId: z.string().min(1).nullable(),
  sectionKey: z.string().min(1).nullable(),
});

export const moneyCalcOptionsSchema = z.object({
  enabledOptionIds: z.array(z.string()),
  notesByOptionId: z.record(z.string(), z.string()).optional(),
  summaryByOptionId: z.record(z.string(), z.string()).optional(),
  valueByOptionId: z.record(z.string(), z.number()).optional(),
  formulas: z.array(moneyFormulaDefSchema).optional(),
});

export const moneyRulesSchema = z.object({
  enabledRuleIds: z.array(z.string()),
  notesByRuleId: z.record(z.string(), z.string()).optional(),
  labelByRuleId: z.record(z.string(), z.string()).optional(),
  cohortByRuleId: z.record(z.string(), z.string()).optional(),
  memberIdsByRuleId: z.record(z.string(), z.array(z.string())).optional(),
});

export const moneySettingsRecordSchema = z.object({
  teamId: z.string().min(1),
  rules: moneyRulesSchema,
  calcOptions: moneyCalcOptionsSchema,
  updatedAt: z.string().datetime(),
});
