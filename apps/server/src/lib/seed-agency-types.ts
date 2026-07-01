export type SeedUserKey = "founder" | "ops" | "analyst" | "designer" | "dev";

export type SeedActor = {
  id: string;
  name: string;
  email: string;
};

export type MemberRecord = {
  userId: string;
  userName: string;
  userEmail: string;
  role: "owner" | "editor" | "viewer";
};

export type SeedContext = {
  now: Date;
  teamId: string;
  teamName: string;
  members: MemberRecord[];
  actors: Map<SeedUserKey, SeedActor>;
};
