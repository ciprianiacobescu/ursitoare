import type { PolicySource } from "./types.ts";

// The platform layer is code, never the database: a tenant policy cannot mask it.
// Task 3.1 ships only the cross-tenant forbid; later tasks of this change extend
// the text (the tests of those tasks fail at red until their policy is added).
const PLATFORM_TEXT = `@id("platform-cross-tenant-forbid")
forbid (principal, action, resource)
when { principal.tenant != resource.tenant };
`;

export const PLATFORM_SOURCE: PolicySource = {
  id: "pdp/platform",
  layer: "platform",
  text: PLATFORM_TEXT,
};

export const PLATFORM_POLICY_IDS: readonly string[] = [];
