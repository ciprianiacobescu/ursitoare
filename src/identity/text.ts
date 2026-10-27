import { identityError } from "./errors.ts";

// Module-internal: not exported from index.ts.
export function requireText(value: unknown, max: number): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > max ||
    !value.isWellFormed() ||
    value.includes("\u0000") ||
    value.includes("\n") ||
    value !== value.trim()
  ) {
    throw identityError("IDENTITY_INVALID");
  }
  return value;
}
