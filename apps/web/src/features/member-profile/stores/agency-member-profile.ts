import { create } from "zustand";

import { orpcClient } from "@/lib/orpc";

type LeaveType = "pto" | "sick" | "team_holiday" | "other";

type HrProfilePatch = {
  status?: "active" | "inactive";
  departmentId?: string | null;
  employmentType?: "full_time" | "part_time" | "contractor" | "intern" | null;
  workModel?: "onsite" | "hybrid" | "remote" | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  address?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
  instagramUrl?: string | null;
  offAllowanceDays?: number;
  leaveAllowancePeriod?: "year" | "quarter" | "month";
};

type AgencyMemberProfileStore = {
  leavePending: boolean;
  reviewPending: boolean;
  hrPending: boolean;
  alertPending: boolean;
  error: string | null;
  createLeave: (input: {
    teamId: string;
    userId: string | null;
    startDate: string;
    endDate: string;
    type: LeaveType;
    reason?: string | null;
  }) => Promise<void>;
  deleteLeave: (input: { teamId: string; leaveId: string }) => Promise<void>;
  createReview: (input: {
    teamId: string;
    subjectUserId: string;
    reviewDate: string;
    body: string;
  }) => Promise<void>;
  upsertHrProfile: (
    input: {
      teamId: string;
      userId: string;
    } & HrProfilePatch,
  ) => Promise<void>;
  createAlert: (input: {
    teamId: string;
    userId: string;
    title: string;
    body?: string;
    note?: string | null;
  }) => Promise<void>;
  sendAlert: (input: {
    teamId: string;
    userId: string;
    alertId: string;
    note?: string;
  }) => Promise<void>;
  removeAlert: (input: { teamId: string; userId: string; alertId: string }) => Promise<void>;
  snoozeAlert: (input: {
    teamId: string;
    userId: string;
    alertId: string;
    snoozedUntil?: string;
  }) => Promise<void>;
};

async function runAlertMutation(
  set: (partial: Partial<AgencyMemberProfileStore>) => void,
  fallback: string,
  run: () => Promise<unknown>,
) {
  set({ alertPending: true, error: null });
  try {
    await run();
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : fallback,
    });
    throw error;
  } finally {
    set({ alertPending: false });
  }
}

export const useAgencyMemberProfileStore = create<AgencyMemberProfileStore>((set) => ({
  leavePending: false,
  reviewPending: false,
  hrPending: false,
  alertPending: false,
  error: null,
  async createLeave(input) {
    set({ leavePending: true, error: null });
    try {
      await orpcClient.agencyOps.memberProfile.leave.create(input);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Couldn't save off day",
      });
      throw error;
    } finally {
      set({ leavePending: false });
    }
  },
  async deleteLeave(input) {
    set({ leavePending: true, error: null });
    try {
      await orpcClient.agencyOps.memberProfile.leave.delete(input);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Couldn't remove off day",
      });
      throw error;
    } finally {
      set({ leavePending: false });
    }
  },
  async createReview(input) {
    set({ reviewPending: true, error: null });
    try {
      await orpcClient.agencyOps.memberProfile.review.create(input);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Couldn't save review",
      });
      throw error;
    } finally {
      set({ reviewPending: false });
    }
  },
  async upsertHrProfile(input) {
    set({ hrPending: true, error: null });
    try {
      await orpcClient.agencyOps.memberProfile.hrProfile.upsert(input);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Couldn't save profile",
      });
      throw error;
    } finally {
      set({ hrPending: false });
    }
  },
  async createAlert(input) {
    await runAlertMutation(set, "Couldn't create alert", () =>
      orpcClient.agencyOps.memberProfile.alerts.create(input),
    );
  },
  async sendAlert(input) {
    await runAlertMutation(set, "Couldn't send alert", () =>
      orpcClient.agencyOps.memberProfile.alerts.send(input),
    );
  },
  async removeAlert(input) {
    await runAlertMutation(set, "Couldn't remove alert", () =>
      orpcClient.agencyOps.memberProfile.alerts.remove(input),
    );
  },
  async snoozeAlert(input) {
    await runAlertMutation(set, "Couldn't snooze alert", () =>
      orpcClient.agencyOps.memberProfile.alerts.snooze(input),
    );
  },
}));
