import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAgencyMemberProfileStore } from "@/features/member-profile/stores/agency-member-profile";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

type AlertKind = "abnormal_day" | "month_pace" | "quarter_pace" | "waste_spike" | "custom";

export type MemberProfileAlertsViewModel = {
  canManage: boolean;
  loading: boolean;
  pending: boolean;
  countLabel: string | null;
  items: Array<{
    id: string;
    kind: AlertKind;
    kindLabel: string;
    source: "system" | "custom";
    sourceLabel: string;
    title: string;
    body: string;
    note: string;
    sentLabel: string | null;
    severity: "warning" | "danger" | "info";
    canSnooze: boolean;
    expanded: boolean;
  }>;
  dialogOpen: boolean;
  draft: { title: string; note: string };
  setDialogOpen: (open: boolean) => void;
  setDraft: (patch: Partial<{ title: string; note: string }>) => void;
  setExpandedAlertId: (alertId: string | null) => void;
  setNoteDraft: (alertId: string, note: string) => void;
  refetch: () => void;
  submit: () => Promise<void>;
  send: (alertId: string) => Promise<void>;
  remove: (alertId: string) => Promise<void>;
  snooze: (alertId: string) => Promise<void>;
};

function alertSeverity(kind: AlertKind): "warning" | "danger" | "info" {
  switch (kind) {
    case "abnormal_day":
    case "waste_spike":
      return "danger";
    case "month_pace":
    case "quarter_pace":
      return "warning";
    case "custom":
      return "info";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function alertKindLabel(kind: AlertKind): string {
  switch (kind) {
    case "abnormal_day":
      return "Day hours";
    case "month_pace":
      return "Month pace";
    case "quarter_pace":
      return "Quarter pace";
    case "waste_spike":
      return "Waste";
    case "custom":
      return "Custom";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function useMemberProfileAlerts(input: {
  teamId: string;
  subjectUserId: string;
  utcOffsetMinutes: number;
}): MemberProfileAlertsViewModel {
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const store = useAgencyMemberProfileStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraftState] = useState({ title: "", note: "" });
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const alertsQuery = useQuery({
    ...orpc.agencyOps.memberProfile.alerts.list.queryOptions({
      input: {
        teamId: input.teamId,
        userId: input.subjectUserId,
        utcOffsetMinutes: input.utcOffsetMinutes,
      },
    }),
    enabled: Boolean(input.teamId && input.subjectUserId && session.data?.user),
    placeholderData: keepPreviousData,
  });

  async function invalidateAlerts() {
    await queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.memberProfile.alerts.list.key(),
    });
    await alertsQuery.refetch();
  }

  const view = useMemo(() => {
    const data = alertsQuery.data;
    const rawItems = data?.items ?? [];
    const canManage = data?.canManageAlerts ?? false;
    const effectiveExpandedId =
      expandedAlertId ?? (canManage && rawItems.length === 1 ? (rawItems[0]?.id ?? null) : null);
    const items = rawItems.map((item) => {
      const noteDraft = noteDrafts[item.id] ?? item.note ?? "";
      const sentAt = item.sentAt ? new Date(item.sentAt) : null;
      return {
        id: item.id,
        kind: item.kind,
        kindLabel: alertKindLabel(item.kind),
        source: item.source,
        sourceLabel: item.source === "system" ? "Detected" : "Added",
        title: item.title,
        body: item.body,
        note: noteDraft,
        sentLabel:
          sentAt && !Number.isNaN(sentAt.getTime())
            ? `Notified ${sentAt.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}`
            : null,
        severity: alertSeverity(item.kind),
        canSnooze: item.source === "system",
        expanded: effectiveExpandedId === item.id,
      };
    });
    return {
      canManage,
      loading: alertsQuery.isLoading && !data,
      countLabel: items.length > 0 ? String(items.length) : null,
      items,
    };
  }, [alertsQuery.data, alertsQuery.isLoading, expandedAlertId, noteDrafts]);

  return {
    ...view,
    pending: store.alertPending,
    dialogOpen,
    draft,
    setDialogOpen(open) {
      if (open) setDraftState({ title: "", note: "" });
      setDialogOpen(open);
    },
    setDraft(patch) {
      setDraftState((prev) => ({ ...prev, ...patch }));
    },
    setExpandedAlertId,
    setNoteDraft(alertId, note) {
      setNoteDrafts((prev) => ({ ...prev, [alertId]: note }));
    },
    refetch() {
      void alertsQuery.refetch();
    },
    async submit() {
      if (!input.teamId || !draft.title.trim()) return;
      try {
        await store.createAlert({
          teamId: input.teamId,
          userId: input.subjectUserId,
          title: draft.title.trim(),
          note: draft.note.trim() || null,
        });
        toast.success("Alert added");
        setDialogOpen(false);
        setDraftState({ title: "", note: "" });
        await invalidateAlerts();
      } catch {
        toast.error("Couldn't create alert");
      }
    },
    async send(alertId) {
      if (!input.teamId) return;
      const note = noteDrafts[alertId] ?? view.items.find((a) => a.id === alertId)?.note ?? "";
      if (!note.trim()) {
        toast.error("Add a note before notifying");
        return;
      }
      try {
        await store.sendAlert({
          teamId: input.teamId,
          userId: input.subjectUserId,
          alertId,
          note: note.trim(),
        });
        toast.success("Member notified");
        setNoteDrafts((prev) => {
          const next = { ...prev };
          delete next[alertId];
          return next;
        });
        await invalidateAlerts();
      } catch {
        toast.error("Couldn't notify member");
      }
    },
    async remove(alertId) {
      if (!input.teamId) return;
      try {
        await store.removeAlert({
          teamId: input.teamId,
          userId: input.subjectUserId,
          alertId,
        });
        toast.success("Alert dismissed");
        if (expandedAlertId === alertId) setExpandedAlertId(null);
        await invalidateAlerts();
      } catch {
        toast.error("Couldn't dismiss alert");
      }
    },
    async snooze(alertId) {
      if (!input.teamId) return;
      try {
        await store.snoozeAlert({
          teamId: input.teamId,
          userId: input.subjectUserId,
          alertId,
        });
        toast.success("Alert snoozed for this period");
        if (expandedAlertId === alertId) setExpandedAlertId(null);
        await invalidateAlerts();
      } catch {
        toast.error("Couldn't snooze alert");
      }
    },
  };
}
