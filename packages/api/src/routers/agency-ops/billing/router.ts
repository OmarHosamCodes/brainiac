import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import {
  listMemberRates,
  upsertMemberRate,
  listInvoices,
  getInvoiceSummary,
  createInvoice,
  updateInvoiceStatus,
  recordInvoicePayment,
  listPeriodBillActivity,
  listBudgetsStub,
} from "./service";
import {
  createPayoutLine,
  createPayoutLineFromMember,
  ensurePayoutPeriod,
  getPayoutRun,
  getPayoutSummary,
  listPayoutLines,
  recordPayoutPayment,
  updatePayoutLineStatus,
} from "./payout-service";
import {
  createExpense,
  listExpenses,
  recordExpensePayment,
  removeExpense,
  updateExpense,
} from "./expense-service";
import { getMoneySettings, upsertMoneySettings } from "./money-settings-service";
import { getPeriodScoreboard } from "./money-scoreboard-service";
import { previewMoneyFormula } from "./money-formula-preview-service";
import { syncFormulaPayoutLines } from "./money-formula-payout-sync";
import {
  moneyCalcOptionsSchema,
  moneyFormulaTokenSchema,
  moneyRulesSchema,
  moneySettingsRecordSchema,
} from "./money-formula-schemas";
import {
  deletePendingAdjustment,
  listPendingAdjustments,
  upsertPendingAdjustment,
} from "./money-pending-adjustment-service";
import {
  exportMoneyDocuments,
  listPeriodMoneyObligations,
  settleMoneyObligation,
} from "./money-export-service";

const invoiceStatusSchema = z.enum(["draft", "sent", "partial", "paid", "refunded"]);
const invoiceBillStatusSchema = z.enum(["outstanding", "partial", "paid", "refunded"]);
const payoutLineStatusSchema = z.enum(["draft", "partial", "paid"]);
const payoutBillStatusSchema = z.enum(["outstanding", "partial", "paid"]);
const payoutRunStatusSchema = z.enum(["draft", "paying", "paid"]);
const payoutSectionKeySchema = z.enum([
  "salaries",
  "team_loss",
  "device_comp",
  "paid_vacation",
  "debt_discount",
  "charity",
  "pbc",
]);
const payoutBillsPartySchema = z.enum(["team", "adjustments", "all"]);
const expenseKindSchema = z.enum(["one_time", "subscription"]);
const expensePeriodSchema = z.enum(["weekly", "monthly", "quarterly", "yearly"]);
const expenseStatusSchema = z.enum(["due", "partial", "paid"]);
const moneyPartyTypeSchema = z.enum(["client", "member"]);
const moneyPendingKindSchema = z.enum(["discount", "surcharge", "debt"]);
const moneySettleActionSchema = z.enum(["pay", "partial", "refund"]);
const moneyExportModeSchema = z.enum(["combine", "split"]);
const moneyObligationKindSchema = z.enum(["ready", "invoice", "payout"]);

const moneyPendingAdjustmentRecordSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  partyType: moneyPartyTypeSchema,
  partyId: z.string().min(1),
  periodStart: z.string().datetime().nullable(),
  periodEnd: z.string().datetime().nullable(),
  kind: moneyPendingKindSchema,
  amountCents: z.number().int().positive(),
  note: z.string(),
  createdByUserId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const moneyClientObligationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("invoice"),
    id: z.string().min(1),
    clientId: z.string().min(1),
    clientName: z.string().min(1),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    isCarry: z.boolean(),
    amountCents: z.number().int().nonnegative(),
    receivedCents: z.number().int().nonnegative(),
    remainingCents: z.number().int().nonnegative(),
    wasteCents: z.number().int().nonnegative(),
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
    amountCents: z.number().int().nonnegative(),
    receivedCents: z.literal(0),
    remainingCents: z.number().int().nonnegative(),
    wasteCents: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
    number: z.null(),
  }),
]);

const moneyMemberObligationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("payout"),
    id: z.string().min(1),
    userId: z.string().min(1),
    userName: z.string().min(1),
    userAvatar: z.string().nullable(),
    periodStart: z.string().datetime(),
    periodEnd: z.string().datetime(),
    isCarry: z.boolean(),
    amountCents: z.number().int().nonnegative(),
    paidCents: z.number().int().nonnegative(),
    remainingCents: z.number().int().nonnegative(),
    wasteCents: z.number().int().nonnegative(),
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
    amountCents: z.number().int().nonnegative(),
    paidCents: z.literal(0),
    remainingCents: z.number().int().nonnegative(),
    wasteCents: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
  }),
]);

const invoiceRecordSchema = z.object({
  id: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  number: z.string().min(1),
  status: invoiceStatusSchema,
  billStatus: invoiceBillStatusSchema,
  amountCents: z.number().int().nonnegative(),
  receivedCents: z.number().int().nonnegative(),
  remainingCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  issuedAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
});

const payoutLineRecordSchema = z.object({
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
  amountCents: z.number().int().nonnegative(),
  paidCents: z.number().int().nonnegative(),
  remainingCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  durationSeconds: z.number().int().nonnegative(),
  rateCents: z.number().int().nonnegative(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});

const payoutRunRecordSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  status: payoutRunStatusSchema,
  currency: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  salariesSectionId: z.string().min(1),
});

const expenseRecordSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  kind: expenseKindSchema,
  period: expensePeriodSchema.nullable(),
  note: z.string(),
  amountCents: z.number().int().nonnegative(),
  paidCents: z.number().int().nonnegative(),
  remainingCents: z.number().int().nonnegative(),
  currency: z.string().min(1),
  status: expenseStatusSchema,
  nextDueAt: z.string().datetime().nullable(),
  occurredAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const billingRouter = {
  budgets: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(
              z.object({
                projectId: z.string().min(1),
                currency: z.string().min(1),
                hoursBudget: z.number().nonnegative().nullable(),
                costBudgetCents: z.number().int().nonnegative().nullable(),
                hoursLogged: z.number().nonnegative(),
                costLoggedCents: z.number().int().nonnegative(),
                periodStart: z.string().datetime().nullable(),
                periodEnd: z.string().datetime().nullable(),
              }),
            ),
          })
          .parse(await listBudgetsStub(context.session.user.id, input));
      }),
  },

  rates: {
    list: protectedProProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return z
        .object({
          items: z.array(
            z.object({
              userId: z.string().min(1),
              userName: z.string().min(1),
              userEmail: z.email(),
              costRateCents: z.number().int().nonnegative().nullable(),
              billableRateCents: z.number().int().nonnegative().nullable(),
              currency: z.string().min(1),
              effectiveFrom: z.string().datetime().nullable(),
            }),
          ),
        })
        .parse(await listMemberRates(context.session.user.id, input));
    }),
    upsert: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          userId: z.string().min(1),
          costRateCents: z.number().int().nonnegative().nullable().optional(),
          billableRateCents: z.number().int().nonnegative().nullable().optional(),
          currency: z.string().length(3).optional(),
          effectiveFrom: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            userId: z.string().min(1),
            userName: z.string().min(1),
            userEmail: z.email(),
            costRateCents: z.number().int().nonnegative().nullable(),
            billableRateCents: z.number().int().nonnegative().nullable(),
            currency: z.string().min(1),
            effectiveFrom: z.string().datetime().nullable(),
          })
          .parse(await upsertMemberRate(context.session.user.id, input));
      }),
  },

  invoices: {
    summary: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime().optional(),
          periodEnd: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            draftCount: z.number().int().nonnegative(),
            sentCount: z.number().int().nonnegative(),
            partialCount: z.number().int().nonnegative(),
            paidCount: z.number().int().nonnegative(),
            refundedCount: z.number().int().nonnegative(),
            outstandingCents: z.number().int().nonnegative(),
            currency: z.string().min(1),
            outstandingByCurrency: z.record(z.string(), z.number().int().nonnegative()),
            billedCents: z.number().int().nonnegative(),
            receivedCents: z.number().int().nonnegative(),
            remainingCents: z.number().int().nonnegative(),
          })
          .parse(await getInvoiceSummary(context.session.user.id, input));
      }),
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          status: invoiceStatusSchema.optional(),
          billStatus: invoiceBillStatusSchema.optional(),
          periodStart: z.string().datetime().optional(),
          periodEnd: z.string().datetime().optional(),
          search: z.string().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(invoiceRecordSchema),
          })
          .parse(await listInvoices(context.session.user.id, input));
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return invoiceRecordSchema.parse(await createInvoice(context.session.user.id, input));
      }),
    updateStatus: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          invoiceId: z.string().min(1),
          status: z.enum(["sent", "paid", "refunded"]),
        }),
      )
      .handler(async ({ context, input }) => {
        return invoiceRecordSchema.parse(await updateInvoiceStatus(context.session.user.id, input));
      }),
    recordPayment: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          invoiceId: z.string().min(1),
          amountCents: z.number().int().positive(),
        }),
      )
      .handler(async ({ context, input }) => {
        return invoiceRecordSchema.parse(
          await recordInvoicePayment(context.session.user.id, input),
        );
      }),
    periodActivity: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          search: z.string().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            clients: z.array(
              z.object({
                clientId: z.string().min(1),
                clientName: z.string().min(1),
                durationSeconds: z.number().int().nonnegative(),
                billableCents: z.number().int().nonnegative(),
                wasteCents: z.number().int().nonnegative(),
              }),
            ),
            members: z.array(
              z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userAvatar: z.string().nullable(),
                durationSeconds: z.number().int().nonnegative(),
                payableCents: z.number().int().nonnegative(),
                wasteCents: z.number().int().nonnegative(),
              }),
            ),
          })
          .parse(await listPeriodBillActivity(context.session.user.id, input));
      }),
  },

  payouts: {
    ensurePeriod: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutRunRecordSchema.parse(
          await ensurePayoutPeriod(context.session.user.id, input),
        );
      }),
    summary: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            salariesDueCents: z.number().int().nonnegative(),
            salariesPaidCents: z.number().int().nonnegative(),
            salariesRemainingCents: z.number().int().nonnegative(),
            currency: z.string().min(1),
          })
          .parse(await getPayoutSummary(context.session.user.id, input));
      }),
    getRun: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            id: z.string().min(1),
            teamId: z.string().min(1),
            status: payoutRunStatusSchema,
            currency: z.string().min(1),
            periodStart: z.string().datetime(),
            periodEnd: z.string().datetime(),
            salariesSectionId: z.string().min(1),
            sections: z.array(
              z.object({
                id: z.string().min(1),
                key: payoutSectionKeySchema,
                title: z.string().min(1),
                sortOrder: z.number().int().nonnegative(),
                lineCount: z.number().int().nonnegative(),
                dueCents: z.number().int().nonnegative(),
                paidCents: z.number().int().nonnegative(),
                remainingCents: z.number().int().nonnegative(),
              }),
            ),
          })
          .parse(await getPayoutRun(context.session.user.id, input));
      }),
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          billStatus: payoutBillStatusSchema.optional(),
          search: z.string().optional(),
          sectionKey: payoutSectionKeySchema.optional(),
          billsParty: payoutBillsPartySchema.optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(payoutLineRecordSchema),
          })
          .parse(await listPayoutLines(context.session.user.id, input));
      }),
    createLine: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          sectionKey: payoutSectionKeySchema,
          payeeUserId: z.string().min(1).nullable().optional(),
          label: z.string().min(1),
          amountCents: z.number().int().positive(),
          currency: z.string().length(3).optional(),
          cohortKey: z.string().nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutLineRecordSchema.parse(await createPayoutLine(context.session.user.id, input));
      }),
    createFromMember: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          userId: z.string().min(1),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutLineRecordSchema.parse(
          await createPayoutLineFromMember(context.session.user.id, input),
        );
      }),
    recordPayment: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          lineId: z.string().min(1),
          amountCents: z.number().int().positive(),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutLineRecordSchema.parse(
          await recordPayoutPayment(context.session.user.id, input),
        );
      }),
    updateStatus: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          lineId: z.string().min(1),
          status: z.enum(["paid", "draft"]),
        }),
      )
      .handler(async ({ context, input }) => {
        return payoutLineRecordSchema.parse(
          await updatePayoutLineStatus(context.session.user.id, input),
        );
      }),
    syncFormulaLines: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          refreshSnapshot: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            upserted: z.number().int().nonnegative(),
            skipped: z.number().int().nonnegative(),
          })
          .parse(await syncFormulaPayoutLines(context.session.user.id, input));
      }),
  },

  expenses: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime().optional(),
          periodEnd: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(expenseRecordSchema),
          })
          .parse(await listExpenses(context.session.user.id, input));
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          name: z.string().min(1),
          kind: expenseKindSchema,
          period: expensePeriodSchema.nullable().optional(),
          note: z.string().optional(),
          amountCents: z.number().int().positive(),
          currency: z.string().length(3).optional(),
          nextDueAt: z.string().datetime().nullable().optional(),
          occurredAt: z.string().datetime().nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return expenseRecordSchema.parse(await createExpense(context.session.user.id, input));
      }),
    update: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          expenseId: z.string().min(1),
          name: z.string().min(1).optional(),
          note: z.string().optional(),
          amountCents: z.number().int().positive().optional(),
          currency: z.string().length(3).optional(),
          period: expensePeriodSchema.nullable().optional(),
          nextDueAt: z.string().datetime().nullable().optional(),
          occurredAt: z.string().datetime().nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return expenseRecordSchema.parse(await updateExpense(context.session.user.id, input));
      }),
    recordPayment: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          expenseId: z.string().min(1),
          amountCents: z.number().int().positive(),
        }),
      )
      .handler(async ({ context, input }) => {
        return expenseRecordSchema.parse(
          await recordExpensePayment(context.session.user.id, input),
        );
      }),
    remove: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          expenseId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ id: z.string().min(1) })
          .parse(await removeExpense(context.session.user.id, input));
      }),
  },

  periodObligations: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          search: z.string().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            clients: z.array(moneyClientObligationSchema),
            members: z.array(moneyMemberObligationSchema),
            pendingAdjustments: z.array(moneyPendingAdjustmentRecordSchema),
          })
          .parse(await listPeriodMoneyObligations(context.session.user.id, input));
      }),
  },

  pendingAdjustments: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          partyType: moneyPartyTypeSchema.optional(),
          partyId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(moneyPendingAdjustmentRecordSchema),
          })
          .parse(await listPendingAdjustments(context.session.user.id, input));
      }),
    upsert: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          id: z.string().min(1).optional(),
          partyType: moneyPartyTypeSchema,
          partyId: z.string().min(1),
          kind: moneyPendingKindSchema,
          amountCents: z.number().int().positive(),
          note: z.string().optional(),
          periodStart: z.string().datetime().optional(),
          periodEnd: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return moneyPendingAdjustmentRecordSchema.parse(
          await upsertPendingAdjustment(context.session.user.id, input),
        );
      }),
    remove: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          id: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ id: z.string().min(1) })
          .parse(await deletePendingAdjustment(context.session.user.id, input));
      }),
  },

  money: {
    periodScoreboard: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            currency: z.string().min(1),
            totalIncomeCents: z.number().int(),
            receivedCents: z.number().int().nonnegative(),
            remainingCents: z.number().int().nonnegative(),
            salariesCents: z.number().int().nonnegative(),
            expensesCents: z.number().int().nonnegative(),
            debtDiscountCents: z.number().int().nonnegative(),
            paidVacationCents: z.number().int().nonnegative(),
            teamProfitCents: z.number().int(),
            profitLossShareCents: z.number().int(),
            roi: z.number(),
            deviceCompensationCents: z.number().int().nonnegative(),
            charityCents: z.number().int().nonnegative(),
            pbcCents: z.number().int().nonnegative(),
          })
          .parse(await getPeriodScoreboard(context.session.user.id, input));
      }),
    settle: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          partyType: moneyPartyTypeSchema,
          obligationId: z.string().min(1),
          action: moneySettleActionSchema,
          amountCents: z.number().int().nonnegative(),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          clientId: z.string().min(1).optional(),
          userId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            documentId: z.string().min(1),
            kind: z.enum(["invoice", "payout"]),
          })
          .parse(await settleMoneyObligation(context.session.user.id, input));
      }),
    exportDocuments: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          partyType: moneyPartyTypeSchema,
          partyId: z.string().min(1),
          mode: moneyExportModeSchema,
          selections: z
            .array(
              z.object({
                obligationId: z.string().min(1),
                periodStart: z.string().datetime(),
                periodEnd: z.string().datetime(),
                kind: moneyObligationKindSchema,
                amountCents: z.number().int().nonnegative(),
              }),
            )
            .min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            documents: z.array(
              z.object({
                id: z.string().min(1),
                kind: z.enum(["invoice", "payout"]),
              }),
            ),
          })
          .parse(await exportMoneyDocuments(context.session.user.id, input));
      }),
  },

  moneySettings: {
    get: protectedProProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return moneySettingsRecordSchema.parse(
        await getMoneySettings(context.session.user.id, input),
      );
    }),
    upsert: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          rules: moneyRulesSchema,
          calcOptions: moneyCalcOptionsSchema,
        }),
      )
      .handler(async ({ context, input }) => {
        return moneySettingsRecordSchema.parse(
          await upsertMoneySettings(context.session.user.id, input),
        );
      }),
    preview: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          tokens: z.array(moneyFormulaTokenSchema).min(1),
          output: z.enum(["cents", "ratio", "hours"]),
          memberUserId: z.string().min(1).nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            value: z.number().nullable(),
            error: z.string().nullable(),
          })
          .parse(await previewMoneyFormula(context.session.user.id, input));
      }),
  },
};
