import { z } from "zod";

export const invoiceStatusSchema = z.enum(["draft", "sent", "partial", "paid", "refunded"]);
export const invoiceBillStatusSchema = z.enum(["outstanding", "partial", "paid", "refunded"]);
export const payoutLineStatusSchema = z.enum(["draft", "partial", "paid"]);
export const payoutBillStatusSchema = z.enum(["outstanding", "partial", "paid"]);
export const payoutRunStatusSchema = z.enum(["draft", "paying", "paid"]);
export const payoutSectionKeySchema = z.enum([
  "salaries",
  "team_loss",
  "device_comp",
  "paid_vacation",
  "debt_discount",
  "charity",
  "pbc",
  "extra",
]);
export const payoutBillsPartySchema = z.enum(["team", "adjustments", "all"]);
export const expenseKindSchema = z.enum(["one_time", "subscription"]);
export const expenseAmountModeSchema = z.enum(["fixed", "variable"]);
export const expensePeriodSchema = z.enum(["weekly", "monthly", "quarterly", "yearly"]);
export const expenseStatusSchema = z.enum(["due", "partial", "paid"]);
export const moneySettleActionSchema = z.enum(["pay", "partial", "refund"]);
export const moneyExportModeSchema = z.enum(["combine", "split"]);
export const moneyObligationKindSchema = z.enum(["ready", "invoice", "payout"]);

export const moneyClientObligationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("invoice"),
    id: z.string().min(1),
    clientId: z.string().min(1),
    clientName: z.string().min(1),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    isCarry: z.boolean(),
    amount: z.number().int().nonnegative(),
    sourceAmount: z.number().int().nonnegative(),
    rateCurrency: z.string().min(1),
    receivedAmount: z.number().int().nonnegative(),
    remainingAmount: z.number().int().nonnegative(),
    wasteAmount: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
    number: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("ready"),
    id: z.string().min(1),
    clientId: z.string().min(1),
    clientName: z.string().min(1),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    isCarry: z.boolean(),
    amount: z.number().int().nonnegative(),
    sourceAmount: z.number().int().nonnegative(),
    rateCurrency: z.string().min(1),
    receivedAmount: z.literal(0),
    remainingAmount: z.number().int().nonnegative(),
    wasteAmount: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
    number: z.null(),
  }),
]);

export const moneyMemberObligationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("payout"),
    id: z.string().min(1),
    userId: z.string().min(1),
    userName: z.string().min(1),
    userAvatar: z.string().nullable(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    isCarry: z.boolean(),
    amount: z.number().int().nonnegative(),
    paidAmount: z.number().int().nonnegative(),
    remainingAmount: z.number().int().nonnegative(),
    wasteAmount: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("ready"),
    id: z.string().min(1),
    userId: z.string().min(1),
    userName: z.string().min(1),
    userAvatar: z.string().nullable(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    isCarry: z.boolean(),
    amount: z.number().int().nonnegative(),
    paidAmount: z.literal(0),
    remainingAmount: z.number().int().nonnegative(),
    wasteAmount: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
  }),
]);

export const invoiceRecordSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  number: z.string().min(1),
  status: invoiceStatusSchema,
  billStatus: invoiceBillStatusSchema,
  amount: z.number().int().nonnegative(),
  receivedAmount: z.number().int().nonnegative(),
  remainingAmount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  issuedAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
});

export const payoutLineRecordSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  sectionKey: payoutSectionKeySchema,
  sectionTitle: z.string().min(1),
  userId: z.string().min(1).nullable(),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
  label: z.string(),
  cohortKey: z.string().nullable(),
  status: payoutLineStatusSchema,
  billStatus: payoutBillStatusSchema,
  amount: z.number().int().nonnegative(),
  paidAmount: z.number().int().nonnegative(),
  remainingAmount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  durationSeconds: z.number().int().nonnegative(),
  rateAmount: z.number().int().nonnegative(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  canDelete: z.boolean(),
});

export const payoutRunRecordSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  status: payoutRunStatusSchema,
  currency: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  salariesSectionId: z.string().min(1),
});

export const expenseRecordSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  kind: expenseKindSchema,
  period: expensePeriodSchema.nullable(),
  note: z.string(),
  amountMode: expenseAmountModeSchema,
  amount: z.number().int().nonnegative(),
  paidAmount: z.number().int().nonnegative(),
  remainingAmount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  sourceAmount: z.number().int().nonnegative().nullable(),
  status: expenseStatusSchema,
  startsAt: z.string().datetime().nullable(),
  nextDueAt: z.string().datetime().nullable(),
  occurredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const subscriptionCycleRecordSchema = z.object({
  id: z.string().min(1),
  expenseId: z.string().min(1),
  state: z.enum(["due", "paid"]),
  name: z.string().min(1),
  note: z.string(),
  amount: z.number().int().nonnegative(),
  paidAmount: z.number().int().nonnegative(),
  remainingAmount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  period: expensePeriodSchema,
  amountMode: expenseAmountModeSchema,
  dueAt: z.string().datetime(),
  canRecordPayment: z.boolean(),
});
