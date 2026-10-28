import { ACTIONS, ACTION_NAMES } from "./actions.ts";
import { PdpError } from "./errors.ts";

export type ToolArgType = "String" | "Long" | "Bool" | "decimal" | "Set<String>";

const TOOL_ARG_TYPES: readonly ToolArgType[] = ["String", "Long", "Bool", "decimal", "Set<String>"];
const TOOL_ARG_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const RESERVED_TOOL_ARGS = new Set<string>(["url", "url_host"]);
const MAX_TOOL_ARG_NAMES = 256;

function toolArgsError(): PdpError {
  return new PdpError("PDP_OPTIONS_INVALID", "tool arguments are invalid", { reason: "tool_args" });
}

function formatToolArgs(toolArgs: Readonly<Record<string, ToolArgType>> | undefined): string {
  const entries: [string, ToolArgType][] = [
    ["url", "String"],
    ["url_host", "String"],
  ];
  if (toolArgs !== undefined) {
    if (toolArgs === null || typeof toolArgs !== "object" || Array.isArray(toolArgs)) {
      throw toolArgsError();
    }
    const names = Object.keys(toolArgs);
    if (names.length > MAX_TOOL_ARG_NAMES) {
      throw toolArgsError();
    }
    for (const name of names) {
      if (!TOOL_ARG_NAME_PATTERN.test(name) || RESERVED_TOOL_ARGS.has(name)) {
        throw toolArgsError();
      }
      const type = toolArgs[name];
      if (type === undefined || !TOOL_ARG_TYPES.includes(type)) {
        throw toolArgsError();
      }
      entries.push([name, type]);
    }
  }
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const attributes = entries.map(([name, type]) => `"${name}"?: ${type}`).join(", ");
  return `type ToolArgs = { ${attributes} };`;
}

const SCHEMA_ENTITIES = [
  "entity Role { tenant: String };",
  "entity Team { tenant: String };",
  "entity Tenant { tenant: String };",
  "entity User in [Role, Team] { tenant: String, kind: String, roles: Set<Role>, teams: Set<Team> };",
  "entity Flow { tenant: String, owner_team: Team, reviewed: Bool };",
  "entity Run { tenant: String, owner_team: Team, initiator: User };",
  "entity Task { tenant: String, run: Run };",
  "entity Tool { tenant: String, effect: String };",
  "entity Block { tenant: String, kind: String, flow: Flow };",
  "type Approval = { approver: User, role: Role };",
  "type ApproversByRole = { tenant_admin?: Set<User>, author?: Set<User>, approver?: Set<User>, auditor?: Set<User> };",
];

const SCHEMA_TYPES_AFTER_TOOL_ARGS = [
  "type LlmArgs = { model_profile?: String, tools?: Set<String> };",
  "type FlowCapabilities = { reads_untrusted: Bool, reads_private: Bool, has_send_or_pay: Bool };",
];

export function buildSchema(opts?: { toolArgs?: Readonly<Record<string, ToolArgType>> }): string {
  const toolArgsLine = formatToolArgs(opts?.toolArgs);
  const lines = [...SCHEMA_ENTITIES, toolArgsLine, ...SCHEMA_TYPES_AFTER_TOOL_ARGS, ""];
  for (const name of ACTION_NAMES) {
    lines.push(ACTIONS[name].cedar);
  }
  return `${lines.join("\n")}\n`;
}
