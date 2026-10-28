import type { PolicySource } from "./types.ts";

// The platform layer is code, never the database: a tenant policy cannot mask it.
// Tasks 3.1 and 3.2 ship the cross-tenant forbid and the untrusted-egress forbid;
// later tasks of this change extend the text (their tests fail at red until then).
const PLATFORM_TEXT = `@id("platform-cross-tenant-forbid")
forbid (principal, action, resource)
when { principal.tenant != resource.tenant };

@id("platform-forbid-untrusted-egress")
forbid (principal, action == Action::"invoke_tool", resource)
when { context.taint.contains("untrusted") && ["write", "send", "pay"].contains(context.tool.effect) };
`;

export const PLATFORM_SOURCE: PolicySource = {
  id: "pdp/platform",
  layer: "platform",
  text: PLATFORM_TEXT,
};

export const PLATFORM_POLICY_IDS: readonly string[] = [];
