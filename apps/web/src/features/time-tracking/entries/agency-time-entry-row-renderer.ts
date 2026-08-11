import type { ReactNode } from "react";

import type { CollapsedEntryGroup } from "@/features/time-tracking/group-time-entries";

export type AgencyTimeEntryGroupRowRenderer = (input: {
  group: CollapsedEntryGroup;
  groupExpandKey: string;
  omitBottomBorder: boolean;
}) => ReactNode;
