import { create } from "zustand";

import { orpcClient } from "@/lib/orpc";

type LeaveType = "pto" | "sick" | "team_holiday" | "other";

type AgencyMemberProfileStore = {
  leavePending: boolean;
  reviewPending: boolean;
  error: string | null;
  createLeave: (input: {
    teamId: string;
    userId: string | null;
    startDate: string;
    endDate: string;
    type: LeaveType;
    reason?: string | null;
  }) => Promise<void>;
  createReview: (input: {
    teamId: string;
    subjectUserId: string;
    reviewDate: string;
    body: string;
  }) => Promise<void>;
};

export const useAgencyMemberProfileStore = create<AgencyMemberProfileStore>((set) => ({
  leavePending: false,
  reviewPending: false,
  error: null,
  async createLeave(input) {
    set({ leavePending: true, error: null });
    try {
      await orpcClient.agencyOps.memberProfile.leave.create(input);
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Couldn't save leave",
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
}));
