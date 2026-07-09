import { ORPCError } from "@orpc/server";

export function parseIsoDateTime(value: string, fieldName: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Invalid ${fieldName}.`,
    });
  }

  return parsed;
}
