import { useState } from "react";
import { toast } from "sonner";

import {
  moneyBillGroupPartyId,
  moneyBillGroupPartyType,
  type MoneyBillObligationLine,
  type MoneyBillPendingAdjustmentItem,
  type MoneyBillPersonGroup,
} from "@/features/billing/money-bill-obligation-rows";
import {
  moneyBillsCanRefundObligation,
  moneyBillsDefaultAdjustTab,
  moneyBillsPaymentCanSubmit,
  moneyBillsPickAdjustLine,
  parseMoneyBillPaymentAmount,
} from "@/features/billing/money-bills-rows";
import {
  moneyExpenseAmountError,
  parseMoneyExpenseAmount,
} from "@/features/billing/money-expense-form";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpcClient } from "@/lib/orpc";

type MoneyAdjustTarget = {
  partyType: "client" | "member";
  partyId: string;
  partyTitle: string;
  line: MoneyBillObligationLine;
  lines: MoneyBillObligationLine[];
  pendingAdjustmentId?: string;
};

type MoneySettleAction = "pay" | "partial" | "refund";
type MoneyPendingAdjustKind = "discount" | "surcharge" | "debt";
type MoneyAdjustTab = MoneySettleAction | "adjustments";

export function useAgencyMoneyBillAdjust(input: {
  teamId: string;
  isInvoiceMutationPending: boolean;
  composeActionPending: boolean;
  setComposeActionPending: (value: boolean) => void;
  setPendingActionInvoiceId: (id: string | null) => void;
  invalidateMoneyComposeQueries: () => Promise<void>;
}) {
  const {
    teamId,
    isInvoiceMutationPending,
    composeActionPending,
    setComposeActionPending,
    setPendingActionInvoiceId,
    invalidateMoneyComposeQueries,
  } = input;

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<MoneyAdjustTarget | null>(null);
  const [adjustTab, setAdjustTab] = useState<MoneyAdjustTab>("pay");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustKind, setAdjustKind] = useState<MoneyPendingAdjustKind>("discount");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSubmitted, setAdjustSubmitted] = useState(false);

  function onOpenAdjustLine(
    group: MoneyBillPersonGroup,
    line: MoneyBillObligationLine,
    options?: { tab?: MoneyAdjustTab; pending?: MoneyBillPendingAdjustmentItem },
  ) {
    const partyId = moneyBillGroupPartyId(group);
    if (!partyId) return;
    setAdjustTarget({
      partyType: moneyBillGroupPartyType(group),
      partyId,
      partyTitle: group.title,
      line,
      lines: group.lines,
      pendingAdjustmentId: options?.pending?.id,
    });
    setAdjustTab(options?.tab ?? moneyBillsDefaultAdjustTab(line));
    if (options?.pending) {
      setAdjustAmount((options.pending.amount / 100).toFixed(2));
      setAdjustKind(options.pending.kind);
      setAdjustNote(options.pending.note);
    } else if (options?.tab === "adjustments") {
      setAdjustAmount("");
      setAdjustKind("discount");
      setAdjustNote("");
    } else {
      setAdjustAmount((line.openCents / 100).toFixed(2));
      setAdjustKind("discount");
      setAdjustNote("");
    }
    setAdjustSubmitted(false);
    setAdjustOpen(true);
  }

  function onOpenAdjust(group: MoneyBillPersonGroup) {
    const line = moneyBillsPickAdjustLine(group.lines);
    if (!line) return;
    onOpenAdjustLine(group, line);
  }

  function onAddAdjustment(group: MoneyBillPersonGroup) {
    const line = moneyBillsPickAdjustLine(group.lines) ?? group.lines[0];
    if (!line) return;
    onOpenAdjustLine(group, line, { tab: "adjustments" });
  }

  function onEditPendingAdjustment(
    group: MoneyBillPersonGroup,
    pending: MoneyBillPendingAdjustmentItem,
  ) {
    const line =
      group.lines.find((item) => item.id === pending.obligationId) ??
      moneyBillsPickAdjustLine(group.lines) ??
      group.lines[0];
    if (!line) return;
    onOpenAdjustLine(group, line, { tab: "adjustments", pending });
  }

  async function onDeletePendingAdjustment(id: string) {
    setComposeActionPending(true);
    try {
      await orpcClient.agencyOps.pendingAdjustments.remove({ teamId, id });
      await invalidateMoneyComposeQueries();
      toast.success("Adjustment removed");
    } catch (error) {
      toast.error("Couldn't remove adjustment", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setComposeActionPending(false);
    }
  }

  function onAdjustObligationChange(obligationId: string) {
    if (!adjustTarget) return;
    const line = adjustTarget.lines.find((item) => item.id === obligationId);
    if (!line) return;
    setAdjustTarget({ ...adjustTarget, line });
    if (adjustTab !== "adjustments") {
      setAdjustAmount((line.openCents / 100).toFixed(2));
    }
  }

  function onAdjustOpenChange(open: boolean) {
    setAdjustOpen(open);
    if (!open) {
      setAdjustTarget(null);
      setAdjustTab("pay");
      setAdjustAmount("");
      setAdjustKind("discount");
      setAdjustNote("");
      setAdjustSubmitted(false);
    }
  }

  async function onSettle(payload: { action: MoneySettleAction; amount: number }) {
    if (!adjustTarget) return;
    const { line, partyType, partyId } = adjustTarget;
    setComposeActionPending(true);
    setPendingActionInvoiceId(line.id);
    try {
      await orpcClient.agencyOps.money.settle({
        teamId,
        partyType,
        obligationId: line.id,
        action: payload.action,
        amount: payload.amount,
        periodStart: line.periodStart,
        periodEnd: line.periodEnd,
        clientId: partyType === "client" ? partyId : undefined,
        userId: partyType === "member" ? partyId : undefined,
      });
      await invalidateMoneyComposeQueries();
      const isClient = partyType === "client";
      const label =
        payload.action === "pay"
          ? isClient
            ? "Collection recorded"
            : "Payment recorded"
          : payload.action === "partial"
            ? isClient
              ? "Partial collection recorded"
              : "Partial payment recorded"
            : isClient
              ? "Collection reversed"
              : "Refund recorded";
      toast.success(label);
      onAdjustOpenChange(false);
    } catch (error) {
      toast.error("Couldn't settle obligation", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setComposeActionPending(false);
      setPendingActionInvoiceId(null);
    }
  }

  async function onUpsertPendingAdjustment(payload: {
    kind: MoneyPendingAdjustKind;
    amount: number;
    note: string;
  }) {
    if (!adjustTarget) return;
    setComposeActionPending(true);
    try {
      await orpcClient.agencyOps.pendingAdjustments.upsert({
        teamId,
        id: adjustTarget.pendingAdjustmentId,
        partyType: adjustTarget.partyType,
        partyId: adjustTarget.partyId,
        kind: payload.kind,
        amount: payload.amount,
        note: payload.note || undefined,
        periodStart: adjustTarget.line.periodStart,
        periodEnd: adjustTarget.line.periodEnd,
        obligationId: adjustTarget.line.id,
      });
      await invalidateMoneyComposeQueries();
      toast.success("Adjustment saved");
      onAdjustOpenChange(false);
    } catch (error) {
      toast.error("Couldn't save adjustment", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setComposeActionPending(false);
    }
  }

  async function onAdjustSubmit() {
    if (!adjustTarget) return;
    setAdjustSubmitted(true);
    switch (adjustTab) {
      case "pay": {
        await onSettle({ action: "pay", amount: adjustTarget.line.openCents });
        return;
      }
      case "partial": {
        const amount = parseMoneyBillPaymentAmount(adjustAmount, adjustTarget.line.openCents);
        if (amount === null) return;
        await onSettle({ action: "partial", amount });
        return;
      }
      case "refund": {
        await onSettle({ action: "refund", amount: 0 });
        return;
      }
      case "adjustments": {
        const amount = parseMoneyExpenseAmount(adjustAmount);
        if (amount === null) return;
        await onUpsertPendingAdjustment({
          kind: adjustKind,
          amount,
          note: adjustNote,
        });
        return;
      }
      default: {
        const _exhaustive: never = adjustTab;
        void _exhaustive;
      }
    }
  }

  const adjustCanSubmit = (() => {
    if (!adjustTarget || composeActionPending || isInvoiceMutationPending) return false;
    switch (adjustTab) {
      case "pay":
        return adjustTarget.line.openCents > 0;
      case "partial":
        return moneyBillsPaymentCanSubmit(adjustAmount, adjustTarget.line.openCents);
      case "refund":
        return moneyBillsCanRefundObligation(
          adjustTarget.line.obligationKind,
          adjustTarget.line.receivedAmount,
        );
      case "adjustments":
        return parseMoneyExpenseAmount(adjustAmount) !== null;
      default: {
        const _exhaustive: never = adjustTab;
        return _exhaustive;
      }
    }
  })();
  const adjustAmountError =
    adjustSubmitted && adjustTarget && (adjustTab === "partial" || adjustTab === "adjustments")
      ? adjustTab === "partial"
        ? moneyBillsPaymentCanSubmit(adjustAmount, adjustTarget.line.openCents)
          ? null
          : `Enter an amount greater than zero and no more than ${adjustTarget.line.openLabel}.`
        : moneyExpenseAmountError(adjustAmount)
      : null;

  return {
    onOpenAdjust,
    onOpenAdjustLine,
    onAddAdjustment,
    onEditPendingAdjustment,
    onDeletePendingAdjustment,
    adjust: {
      open: adjustOpen,
      onOpenChange: onAdjustOpenChange,
      partyType: adjustTarget?.partyType ?? "client",
      partyTitle: adjustTarget?.partyTitle ?? "",
      lineSubtitle: adjustTarget?.line.subtitle ?? "",
      statusLabel: adjustTarget?.line.statusLabel ?? "",
      isReady: adjustTarget?.line.obligationKind === "ready",
      canRefund: adjustTarget
        ? moneyBillsCanRefundObligation(
            adjustTarget.line.obligationKind,
            adjustTarget.line.receivedAmount,
          )
        : false,
      remainingLabel: adjustTarget?.line.openLabel ?? "",
      currency: adjustTarget?.line.currency ?? "USD",
      obligationId: adjustTarget?.line.id ?? "",
      obligationOptions: (adjustTarget?.lines ?? []).map((line) => ({
        id: line.id,
        label: line.subtitle,
      })),
      onObligationIdChange: onAdjustObligationChange,
      tab: adjustTab,
      onTabChange: setAdjustTab,
      amount: adjustAmount,
      onAmountChange: setAdjustAmount,
      kind: adjustKind,
      onKindChange: setAdjustKind,
      note: adjustNote,
      onNoteChange: setAdjustNote,
      amountError: adjustAmountError,
      canSubmit: adjustCanSubmit,
      isPending: composeActionPending || isInvoiceMutationPending,
      onSubmit: () => void onAdjustSubmit(),
      onSettle,
      onUpsertPendingAdjustment,
    },
  };
}
