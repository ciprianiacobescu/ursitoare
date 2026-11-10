import { cedar } from "./cedar.ts";

/** The `@id` annotations of the static policies in `text`, or `null` when the text does not parse. */
export function policyIdsOf(text: string): string[] | null {
  const parts = cedar.policySetTextToParts(text);
  if (parts.type !== "success") return null;
  const ids: string[] = [];
  for (const policy of parts.policies) {
    const json = cedar.policyToJson(policy);
    if (json.type !== "success") continue;
    const id = json.json.annotations?.["id"];
    if (typeof id === "string") ids.push(id);
  }
  return ids;
}
