import { ChevronDown } from "lucide-react";

import type { MemberProfileAlertsViewModel } from "@/features/member-profile/hooks/use-member-profile-alerts";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyWorkCountBadgeClass,
  agencyWorkMetaClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import { Collapsible, CollapsibleContent } from "@/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Skeleton } from "@/ui/skeleton";
import { Textarea } from "@/ui/textarea";

const profilePanelClass = "rounded-xl border border-border bg-card";

function alertSeverityDotClass(severity: "warning" | "danger" | "info") {
  switch (severity) {
    case "danger":
      return "bg-destructive";
    case "warning":
      return "bg-warning";
    case "info":
      return "bg-muted-foreground/50";
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

type Props = {
  alerts: MemberProfileAlertsViewModel;
};

export function MemberProfileAlertsPanel({ alerts }: Props) {
  return (
    <>
      <section className={cn(profilePanelClass, "p-4")} aria-labelledby="member-profile-alerts">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id="member-profile-alerts" className={agencyWorkTitleClass}>
              Alerts
            </h2>
            {alerts.countLabel ? (
              <span className={agencyWorkCountBadgeClass} aria-label="Open alert count">
                {alerts.countLabel}
              </span>
            ) : null}
          </div>
          {alerts.canManage ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(agencyFocusRingClass, "shrink-0")}
              onClick={() => alerts.setDialogOpen(true)}
            >
              Add
            </Button>
          ) : null}
        </div>

        {alerts.loading ? (
          <div className="mt-3 space-y-3" aria-busy="true" aria-label="Loading alerts">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : alerts.items.length === 0 ? (
          <div className="mt-3 space-y-1">
            <p className="text-sm text-foreground">All clear</p>
            <p className={agencyWorkMetaClass}>
              {alerts.canManage
                ? "Pace and hours look fine. Add an alert when something needs a note."
                : "No open alerts for this member."}
            </p>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {alerts.items.map((alert) => {
              const rowId = `member-alert-${alert.id}`;
              const noteId = `member-alert-note-${alert.id}`;
              const heading = (
                <>
                  <p className="text-sm font-medium text-pretty text-foreground">{alert.title}</p>
                  <p className={cn(agencyWorkMetaClass, "mt-0.5 text-pretty")}>
                    <span className="text-foreground/70">{alert.kindLabel}</span>
                    <span aria-hidden> · </span>
                    {alert.sourceLabel}
                    {alert.sentLabel ? (
                      <>
                        <span aria-hidden> · </span>
                        {alert.sentLabel}
                      </>
                    ) : null}
                  </p>
                </>
              );
              const periodBody = alert.canOpenPeriod ? (
                <button
                  type="button"
                  className={cn(
                    agencyWorkMetaClass,
                    "mt-1 block w-full rounded-md text-start text-pretty underline-offset-2",
                    "text-foreground/85 underline decoration-foreground/30",
                    agencyFocusRingClass,
                    "hover:text-foreground hover:decoration-foreground/55",
                    "motion-reduce:transition-none",
                  )}
                  aria-label={`Show activity for: ${alert.body}`}
                  onClick={() => alerts.openPeriod(alert.id)}
                >
                  {alert.body}
                </button>
              ) : (
                <p className={cn(agencyWorkMetaClass, "mt-1 text-pretty")}>{alert.body}</p>
              );

              return (
                <li key={alert.id} className="py-3 first:pt-2">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rounded-full",
                        alertSeverityDotClass(alert.severity),
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      {alerts.canManage ? (
                        <Collapsible
                          open={alert.expanded}
                          onOpenChange={(open) => alerts.setExpandedAlertId(open ? alert.id : null)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              id={rowId}
                              className={cn(
                                "min-w-0 flex-1 rounded-md text-start transition-colors",
                                agencyFocusRingClass,
                                "hover:bg-muted/40 focus-visible:bg-muted/40",
                                "motion-reduce:transition-none",
                              )}
                              aria-expanded={alert.expanded}
                              aria-controls={`${rowId}-panel`}
                              onClick={() =>
                                alerts.setExpandedAlertId(alert.expanded ? null : alert.id)
                              }
                            >
                              {heading}
                            </button>
                            <ChevronDown
                              className={cn(
                                "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out",
                                "motion-reduce:transition-none",
                                alert.expanded && "rotate-180",
                              )}
                              aria-hidden
                            />
                          </div>
                          {periodBody}
                          <CollapsibleContent id={`${rowId}-panel`} className="mt-3">
                            <div className="space-y-2.5 rounded-lg bg-muted/35 p-2.5">
                              <Label htmlFor={noteId} className={agencyFormLabelClass}>
                                Note to member
                              </Label>
                              <Textarea
                                id={noteId}
                                value={alert.note}
                                placeholder="What should they change or know?"
                                rows={2}
                                className="min-h-16 resize-none bg-background"
                                onChange={(event) =>
                                  alerts.setNoteDraft(alert.id, event.target.value)
                                }
                              />
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  type="button"
                                  size="sm"
                                  className={agencyFocusRingClass}
                                  disabled={alerts.pending || !alert.note.trim()}
                                  onClick={() => void alerts.send(alert.id)}
                                >
                                  Notify
                                </Button>
                                {alert.canSnooze ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className={agencyFocusRingClass}
                                    disabled={alerts.pending}
                                    onClick={() => void alerts.snooze(alert.id)}
                                  >
                                    Snooze
                                  </Button>
                                ) : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className={agencyFocusRingClass}
                                  disabled={alerts.pending}
                                  onClick={() => void alerts.remove(alert.id)}
                                >
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <div>
                          {heading}
                          {periodBody}
                          {alert.note.trim() ? (
                            <p className={cn(agencyWorkMetaClass, "mt-2 text-pretty")}>
                              Note: {alert.note}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={alerts.dialogOpen} onOpenChange={alerts.setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add alert</DialogTitle>
            <DialogDescription>
              Put something on the record for this member. Notify them when you are ready.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={agencyFormFieldClass}>
              <Label htmlFor="member-alert-title" className={agencyFormLabelClass}>
                Title
              </Label>
              <Input
                id="member-alert-title"
                value={alerts.draft.title}
                onChange={(e) => alerts.setDraft({ title: e.target.value })}
                placeholder="Follow up on capacity"
                autoFocus
              />
            </div>
            <div className={agencyFormFieldClass}>
              <Label htmlFor="member-alert-note" className={agencyFormLabelClass}>
                Note
              </Label>
              <Textarea
                id="member-alert-note"
                value={alerts.draft.note}
                onChange={(e) => alerts.setDraft({ note: e.target.value })}
                rows={3}
                placeholder="Optional — what should they know?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => alerts.setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={alerts.pending || !alerts.draft.title.trim()}
              onClick={() => void alerts.submit()}
            >
              Add alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
