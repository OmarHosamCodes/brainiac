import { describe, expect, test } from "bun:test";
import {
  clientContactCompleteness,
  clientContactCompletenessLabel,
} from "./client-contact-completeness";

describe("clientContactCompleteness", () => {
  test("missing when null or empty", () => {
    expect(clientContactCompleteness(null)).toBe("missing");
    expect(clientContactCompleteness({ name: "", email: "  ", phone: "" })).toBe("missing");
  });

  test("partial when some fields filled", () => {
    expect(clientContactCompleteness({ name: "Ada", email: "", phone: "" })).toBe("partial");
    expect(clientContactCompleteness({ name: "", email: "a@b.co", phone: "1" })).toBe("partial");
  });

  test("complete when name email phone present", () => {
    expect(clientContactCompleteness({ name: "Ada", email: "a@b.co", phone: "+1" })).toBe(
      "complete",
    );
  });

  test("labels cover all levels", () => {
    expect(clientContactCompletenessLabel("missing")).toBe("No contact");
    expect(clientContactCompletenessLabel("partial")).toBe("Partial");
    expect(clientContactCompletenessLabel("complete")).toBe("Complete");
  });
});
