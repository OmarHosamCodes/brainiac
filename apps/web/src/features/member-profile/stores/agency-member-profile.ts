import { create } from "zustand";

import { orpcClient } from "@/lib/orpc";

type LeaveType = "pto" | "sick" | "team_holiday" | "other";

type HrProfilePatch = {
  employeeCode?: string | null;
  status?: "active" | "inactive";
  employmentType?: "full_time" | "part_time" | "contractor" | "intern" | null;
  workModel?: "onsite" | "hybrid" | "remote" | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  address?: string | null;
  linkedinUrl?: string | null;
  xUrl?: string | null;
  instagramUrl?: string | null;
  ptoAllowanceDays?: number;
  sickAllowanceDays?: number;
  otherAllowanceDays?: number;
};

type AgencyMemberProfileStore = {
  leavePending: boolean;
  reviewPending: boolean;
  hrPending: boolean;
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
  upsertHrProfile: (
    input: {
      teamId: string;
      userId: string;
    } & HrProfilePatch,
  ) => Promise<void>;
};

export const useAgencyMemberProfileStore = create<AgencyMemberProfileStore>((set) => ({
  leavePending: false,
  reviewPending: false,
  hrPending: false,
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
}));
