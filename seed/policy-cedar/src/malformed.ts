// Deliberately broken policies. Each must be rejected by parse or by strict validation.
export interface Malformed { id: string; why: string; policy: string; stage: "parse" | "validate" }
const P = (body: string) => `@id("bad")\n${body}`;
export const MALFORMED: Malformed[] = [
  { id: "M1", stage: "parse", why: "syntax error (missing semicolon / unbalanced brace)",
    policy: P(`permit (principal, action == Action::"invoke_tool", resource) when { context.taint.contains("untrusted") `) },
  { id: "M2", stage: "validate", why: "type error: Set<String> compared with String",
    policy: P(`forbid (principal, action == Action::"invoke_tool", resource) when { context.taint == "untrusted" };`) },
  { id: "M3", stage: "validate", why: "undeclared attribute on the principal (roless)",
    policy: P(`permit (principal, action == Action::"start_run", resource) when { principal.roless.contains(Role::"ops-admin") };`) },
  { id: "M4", stage: "validate", why: "optional attribute accessed without a `has` guard (args.amount)",
    policy: P(`forbid (principal, action == Action::"invoke_tool", resource) when { context.args.amount.greaterThan(decimal("10000.0000")) };`) },
  { id: "M5", stage: "validate", why: "decimal compared with an integer literal using `>` (Cedar `>` is Long-only)",
    policy: P(`forbid (principal, action == Action::"invoke_tool", resource) when { context.args has amount && context.args.amount > 10000 };`) },
  { id: "M6", stage: "validate", why: "context attribute that does not exist for this action (tool under invoke_llm)",
    policy: P(`forbid (principal, action == Action::"invoke_llm", resource) when { context.tool.effect == "pay" };`) },
  { id: "M7", stage: "validate", why: "action does not apply to the resource type (activate_flow on a Node)",
    policy: P(`permit (principal, action == Action::"activate_flow", resource == Node::"invoice-intake/pay");`) },
  { id: "M8", stage: "validate", why: "unknown action id",
    policy: P(`permit (principal, action == Action::"invoke_toool", resource);`) },
];
