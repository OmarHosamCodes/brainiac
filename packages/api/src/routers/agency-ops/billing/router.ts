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
  createPayoutLineFromMember,
  ensurePayoutPeriod,
  listPayoutLines,
  recordPayoutPayment,
  updatePayoutLineStatus,
} from "./payout-service";

const invoiceStatusSchema = z.enum(["draft", "sent", "partial", "paid", "refunded"]);
const invoiceBillStatusSchema = z.enum(["outstanding", "partial", "paid", "refunded"]);
const payoutLineStatusSchema = z.enum(["draft", "partial", "paid"]);
const payoutBillStatusSchema = z.enum(["outstanding", "partial", "paid"]);
const payoutRunStatusSchema = z.enum(["draft", "paying", "paid"]);

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
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
  label: z.string(),
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
              }),
            ),
            members: z.array(
              z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userAvatar: z.string().nullable(),
                durationSeconds: z.number().int().nonnegative(),
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
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          billStatus: payoutBillStatusSchema.optional(),
          search: z.string().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(payoutLineRecordSchema),
          })
          .parse(await listPayoutLines(context.session.user.id, input));
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
  },
};
