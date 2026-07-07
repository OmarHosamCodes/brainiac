import { ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";

import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { formatTenureHours, tenureStatusClass, tenureStatusLabel } from "@/lib/tenure-utils";

type TenureMemberSummary = {
  userId: string;
  userName: string;
  userEmail: string;
  awaitingFirstEntry: boolean;
  netTenureLabel: string;
  currentQuarter: {
    loggedHours: number;
    requiredHours: number;
    status: string;
  } | null;
};

type AgencySettingsTenureRosterProps = {
  members: TenureMemberSummary[];
  policyEnabled: boolean;
  onSelect: (userId: string) => void;
};

export function AgencySettingsTenureRoster({
  members,
  policyEnabled,
  onSelect,
}: AgencySettingsTenureRosterProps) {
  if (!policyEnabled) {
    return (
      <section>
        <div className="py-10 text-center">
          <Users className="mx-auto size-6 text-muted" />
          <p className="mt-3 text-sm font-bold text-highlighted">Tenure tracking is off</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">
            Set a policy effective date and enable tracking to start measuring agency tenure.
          </p>
        </div>
      </section>
    );
  }

  if (members.length === 0) {
    return (
      <section>
        <div className="py-10 text-center text-sm text-muted">No team members to display.</div>
      </section>
    );
  }

  return (
    <section>
      <div className="hidden border-b border-default pb-2 text-[11px] font-semibold text-muted sm:grid sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_2rem] sm:gap-3">
        <span>Member</span>
        <span>Net tenure</span>
        <span className="text-right">This quarter</span>
        <span>Status</span>
        <span className="sr-only">Open</span>
      </div>

      <ul className="divide-y divide-default">
        {members.map((member) => (
          <li key={member.userId}>
            <button
              type="button"
              className={cn(
                "group grid w-full gap-2 px-1 py-3 text-left transition-colors hover:bg-elevated/50 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_2rem] sm:items-center sm:gap-3",
                agencyFocusRingClass,
              )}
              onClick={() => onSelect(member.userId)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-highlighted">
                  {member.userName}
                </span>
                <span className="block truncate text-xs text-muted">{member.userEmail}</span>
              </span>
              <span className="font-mono text-sm tabular-nums text-highlighted">
                {member.awaitingFirstEntry ? (
                  <span className="text-muted">Awaiting first entry</span>
                ) : (
                  member.netTenureLabel
                )}
              </span>
              <span className="font-mono text-sm tabular-nums text-muted sm:text-right">
                {member.currentQuarter ? (
                  <>
                    {formatTenureHours(member.currentQuarter.loggedHours)} /{" "}
                    {formatTenureHours(member.currentQuarter.requiredHours)} h
                  </>
                ) : (
                  "—"
                )}
              </span>
              <span>
                {member.currentQuarter ? (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      tenureStatusClass(member.currentQuarter.status),
                    )}
                  >
                    {tenureStatusLabel(member.currentQuarter.status)}
                  </span>
                ) : member.awaitingFirstEntry ? (
                  <span className="text-xs font-bold text-muted">Awaiting entry</span>
                ) : (
                  <span className="text-xs font-bold text-muted">—</span>
                )}
              </span>
              <span
                className="hidden justify-self-end text-muted transition-colors group-hover:text-highlighted sm:inline-flex"
                aria-hidden="true"
              >
                <ChevronRight className="size-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
