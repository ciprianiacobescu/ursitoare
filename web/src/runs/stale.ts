const STALE_TEXT =
  "This version was validated by an older validator. Validate it again from the flow's version page, then run it.";

export function staleVersionText(details: unknown): string | null {
  if (typeof details !== "object" || details === null) return null;
  const record = details as Record<string, unknown>;
  if (record["reason"] === "version_not_runnable" && record["cause"] === "validation_stale") {
    return STALE_TEXT;
  }
  return null;
}
