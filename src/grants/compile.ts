import type { PolicySource, ToolArgType } from "../pdp/index.ts";
import { GrantsError } from "./types.ts";
import type { ArgConstraint, GrantRecord } from "./types.ts";

const IDENTIFIER = {
  tenant: /^[A-Za-z0-9_-]{1,64}$/,
  role: /^[a-z][a-z0-9_]{0,31}$/,
  user: /^[A-Za-z0-9_-]{1,64}$/,
  flow: /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/,
  node: /^[a-z][a-z0-9_]*$/,
  arg: /^[a-z][a-z0-9_]{0,63}$/,
  tool: /^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$/,
  fingerprint: /^nf1_[0-9a-f]{64}$/,
  id: /^grant_[A-Za-z0-9-]{1,64}$/,
} as const;

const MAX_FLOW_LENGTH = 64;
const MAX_TOOL_LENGTH = 128;
const MAX_STRING_LENGTH = 256;
const MAX_DECIMAL = 922337203685477;

type IdentifierField = keyof typeof IDENTIFIER;

function invalid(details: Record<string, string>): never {
  throw new GrantsError("GRANTS_INVALID", details);
}

function checkIdentifier(field: IdentifierField, value: unknown, maxLength?: number): string {
  if (
    typeof value !== "string" ||
    !IDENTIFIER[field].test(value) ||
    (maxLength !== undefined && value.length > maxLength)
  ) {
    invalid({ reason: "identifier", field });
  }
  return value;
}

function checkValueString(value: string): void {
  if (value.length > MAX_STRING_LENGTH) invalid({ reason: "value_invalid" });
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code > 0x7e || character === '"' || character === "\\") {
      invalid({ reason: "value_invalid" });
    }
  }
}

function longLiteral(value: number): string {
  if (!Number.isSafeInteger(value)) invalid({ reason: "number_range" });
  return String(value);
}

function decimalLiteral(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) > MAX_DECIMAL) {
    invalid({ reason: "number_range" });
  }
  const text = value.toFixed(4);
  if (Number(text) !== value) invalid({ reason: "decimal_precision" });
  return `decimal("${text}")`;
}

function numberKind(
  declared: ToolArgType | undefined,
  value: number,
): "Long" | "decimal" {
  if (declared === "decimal") return "decimal";
  if (declared === "Long" && Number.isInteger(value)) return "Long";
  return Number.isSafeInteger(value) ? "Long" : "decimal";
}

function writeConstraint(
  constraint: ArgConstraint,
  argTypes: Readonly<Record<string, ToolArgType>>,
): string {
  const base = `context.args["${constraint.arg}"]`;
  const value = constraint.value;

  if (typeof value === "string") {
    checkValueString(value);
    if (constraint.op !== "eq") invalid({ reason: "arg_type" });
    return `context.args has "${constraint.arg}" && ${base} == "${value}"`;
  }

  if (typeof value === "boolean") {
    if (constraint.op !== "eq") invalid({ reason: "arg_type" });
    return `context.args has "${constraint.arg}" && ${base} == ${value ? "true" : "false"}`;
  }

  if (typeof value !== "number") invalid({ reason: "arg_type" });

  if (numberKind(argTypes[constraint.arg], value) === "Long") {
    const literal = longLiteral(value);
    if (constraint.op === "eq") {
      return `context.args has "${constraint.arg}" && ${base} == ${literal}`;
    }
    if (constraint.op === "lte") {
      return `context.args has "${constraint.arg}" && ${base} <= ${literal}`;
    }
    return `context.args has "${constraint.arg}" && ${base} >= ${literal}`;
  }

  const literal = decimalLiteral(value);
  if (constraint.op === "eq") {
    return `context.args has "${constraint.arg}" && ${base} == ${literal}`;
  }
  if (constraint.op === "lte") {
    return `context.args has "${constraint.arg}" && ${base}.lessThanOrEqual(${literal})`;
  }
  return `context.args has "${constraint.arg}" && ${base}.greaterThanOrEqual(${literal})`;
}

function checkIdentifiers(tenantId: string, grant: GrantRecord): void {
  checkIdentifier("tenant", tenantId);
  checkIdentifier("id", grant.id);

  if (grant.subject.kind === "role") {
    checkIdentifier("role", grant.subject.role);
  } else {
    checkIdentifier("user", grant.subject.userId);
  }

  checkIdentifier("tool", grant.tool, MAX_TOOL_LENGTH);

  if (grant.scope.kind === "node") {
    checkIdentifier("flow", grant.scope.flowId, MAX_FLOW_LENGTH);
    checkIdentifier("node", grant.scope.nodeId);
    for (const fingerprint of grant.fingerprints) {
      checkIdentifier("fingerprint", fingerprint);
    }
    if (grant.fingerprints.length === 0) invalid({ reason: "no_fingerprint" });
  }

  for (const constraint of grant.args) {
    checkIdentifier("arg", constraint.arg);
  }
}

export function compileGrant(
  tenantId: string,
  grant: GrantRecord,
  argTypes: Readonly<Record<string, ToolArgType>>,
): PolicySource | null {
  if (grant.state === "revoked") return null;

  checkIdentifiers(tenantId, grant);

  const principal =
    grant.subject.kind === "role"
      ? `principal in Role::"${grant.subject.role}"`
      : `principal == User::"${tenantId}/${grant.subject.userId}"`;

  const resource =
    grant.scope.kind === "node"
      ? `resource == Block::"${tenantId}/${grant.scope.flowId}/${grant.scope.nodeId}"`
      : "resource is Block";

  const parts = [`context.tool == Tool::"${tenantId}/${grant.tool}"`];
  if (grant.scope.kind === "node") {
    const fingerprints = grant.fingerprints.map((fingerprint) => `"${fingerprint}"`).join(", ");
    parts.push(`[${fingerprints}].contains(context.node_fingerprint)`);
  }
  for (const constraint of grant.args) {
    parts.push(writeConstraint(constraint, argTypes));
  }

  const text = [
    `@id("${grant.id}")`,
    `permit (${principal}, action == Action::"invoke_tool", ${resource})`,
    `when { ${parts.join(" && ")} };`,
  ].join("\n");

  return { id: `grants/${grant.id}`, layer: "tenant", text };
}

function compareIds(left: GrantRecord, right: GrantRecord): number {
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function compileGrants(
  tenantId: string,
  grants: readonly GrantRecord[],
  argTypes: Readonly<Record<string, ToolArgType>>,
): PolicySource[] {
  const sources: PolicySource[] = [];
  for (const grant of [...grants].sort(compareIds)) {
    const source = compileGrant(tenantId, grant, argTypes);
    if (source !== null) sources.push(source);
  }
  return sources;
}
