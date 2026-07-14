import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";

describe("AgencyTimeEntryProjectLabel", () => {
  it("shows project-client when task-client has no task title", () => {
    const html = renderToStaticMarkup(
      createElement(AgencyTimeEntryProjectLabel, {
        format: "task-client",
        projectId: "proj-1",
        projectName: "Video Production",
        clientName: "THARAA",
        taskTitle: "",
      }),
    );

    expect(html).toContain("Video Production");
    expect(html).toContain("THARAA");
    expect(html).not.toMatch(/>Task</);
  });

  it("shows task title when present", () => {
    const html = renderToStaticMarkup(
      createElement(AgencyTimeEntryProjectLabel, {
        format: "task-client",
        projectId: "proj-1",
        projectName: "Video Production",
        clientName: "THARAA",
        taskTitle: "Editing",
      }),
    );

    expect(html).toContain("Editing");
    expect(html).toContain("THARAA");
  });
});
