import type { PolicySource } from "./types.ts";

// The platform layer is code, never the database: a tenant policy cannot mask it.
const PLATFORM_TEXT = `@id("platform-cross-tenant-forbid")
forbid (principal, action, resource)
when { principal.tenant != resource.tenant };

@id("platform-forbid-untrusted-egress")
forbid (principal, action == Action::"invoke_tool", resource)
when { context.taint.contains("untrusted") && ["write", "send", "pay"].contains(context.tool.effect) };

@id("platform-forbid-agent-consequential")
forbid (principal, action == Action::"invoke_tool", resource)
when { resource.kind == "agent" && ["send", "pay"].contains(context.tool.effect) };

@id("platform-read-self")
permit (principal, action == Action::"read_self", resource);
`;

export const PLATFORM_SOURCE: PolicySource = {
  id: "pdp/platform",
  layer: "platform",
  text: PLATFORM_TEXT,
};

export const PLATFORM_POLICY_IDS: readonly string[] = [
  "platform-cross-tenant-forbid",
  "platform-forbid-agent-consequential",
  "platform-forbid-untrusted-egress",
  "platform-read-self",
];
