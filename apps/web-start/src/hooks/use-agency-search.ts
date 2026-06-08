import { z } from "zod";

export const agencySectionSchema = z
  .enum(["time", "projects", "clients", "reports", "resourcing", "billing", "settings"])
  .catch("time");

export const agencySearchSchema = z.object({
  section: agencySectionSchema.optional().catch("time"),
  project: z.string().optional().catch(undefined),
});

export type AgencySection = z.infer<typeof agencySectionSchema>;
export type AgencySearch = z.infer<typeof agencySearchSchema>;

export function parseAgencySearch(search: Record<string, unknown>): AgencySearch {
  const parsed = agencySearchSchema.parse(search);

  return {
    section: parsed.section ?? "time",
    project: parsed.section === "projects" ? parsed.project : undefined,
  };
}
