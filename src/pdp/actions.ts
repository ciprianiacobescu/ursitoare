import type {
  ActivateFlowContext,
  ApproveTaskContext,
  InvokeLlmContext,
  InvokeToolContext,
  StartRunContext,
} from "./contexts.ts";

export type ActionName =
  | "activate_flow"
  | "approve_task"
  | "approve_tool_surface"
  | "author_flow"
  | "debug_run"
  | "deploy_policy"
  | "dry_run_flow"
  | "edit_flow"
  | "edit_profile"
  | "invoke_llm"
  | "invoke_tool"
  | "manage_credentials"
  | "manage_tenant"
  | "manage_triggers"
  | "manage_users_roles"
  | "read_audit"
  | "read_context"
  | "read_flow"
  | "read_registry"
  | "read_run"
  | "read_self"
  | "register_context_source"
  | "register_tool_server"
  | "start_run"
  | "test_flow";

export type ResourceType = "Tenant" | "Flow" | "Run" | "Task" | "Block";

export interface ContextsWithFields {
  activate_flow: ActivateFlowContext;
  approve_task: ApproveTaskContext;
  invoke_llm: InvokeLlmContext;
  invoke_tool: InvokeToolContext;
  start_run: StartRunContext;
}

export type ActionContext<A extends ActionName> = A extends keyof ContextsWithFields
  ? ContextsWithFields[A]
  : Record<string, never>;

export interface ActionSpec<C> {
  readonly cedar: string;
  readonly resources: readonly ResourceType[];
  readonly capability: boolean;
  readonly context: C;
}

function defineAction<A extends ActionName>(
  name: A,
  resources: readonly ResourceType[],
  cedarContext: string,
  capability: boolean,
): ActionSpec<ActionContext<A>> {
  const resourceText =
    resources.length === 1 ? String(resources[0]) : `[${resources.join(", ")}]`;
  return {
    cedar: `action ${name} appliesTo { principal: User, resource: ${resourceText}, context: ${cedarContext} };`,
    resources,
    capability,
    context: {} as ActionContext<A>,
  };
}

export const ACTIONS: { readonly [A in ActionName]: ActionSpec<ActionContext<A>> } = {
  activate_flow: defineAction(
    "activate_flow",
    ["Flow"],
    "{ flow_capabilities: FlowCapabilities, review_profile: String }",
    false,
  ),
  approve_task: defineAction(
    "approve_task",
    ["Task"],
    "{ run_initiator: User, taint: Set<String> }",
    false,
  ),
  approve_tool_surface: defineAction("approve_tool_surface", ["Tenant"], "{}", true),
  author_flow: defineAction("author_flow", ["Tenant"], "{}", true),
  debug_run: defineAction("debug_run", ["Tenant", "Run"], "{}", true),
  deploy_policy: defineAction("deploy_policy", ["Tenant"], "{}", true),
  dry_run_flow: defineAction("dry_run_flow", ["Tenant", "Flow"], "{}", true),
  edit_flow: defineAction("edit_flow", ["Tenant", "Flow"], "{}", true),
  edit_profile: defineAction("edit_profile", ["Tenant"], "{}", true),
  invoke_llm: defineAction(
    "invoke_llm",
    ["Tenant", "Block"],
    "{ args: LlmArgs, taint: Set<String>, provider: String, region: String, run_initiator?: User }",
    false,
  ),
  invoke_tool: defineAction(
    "invoke_tool",
    ["Block"],
    "{ tool: Tool, args: ToolArgs, taint: Set<String>, run_initiator: User, sod_excluded: Set<User>, approvals: Set<Approval>, approvers_by_role: ApproversByRole, node_fingerprint: String }",
    false,
  ),
  manage_credentials: defineAction("manage_credentials", ["Tenant"], "{}", true),
  manage_tenant: defineAction("manage_tenant", ["Tenant"], "{}", true),
  manage_triggers: defineAction("manage_triggers", ["Tenant"], "{}", true),
  manage_users_roles: defineAction("manage_users_roles", ["Tenant"], "{}", true),
  read_audit: defineAction("read_audit", ["Tenant"], "{}", true),
  read_context: defineAction("read_context", ["Tenant"], "{}", true),
  read_flow: defineAction("read_flow", ["Tenant", "Flow"], "{}", true),
  read_registry: defineAction("read_registry", ["Tenant"], "{}", true),
  read_run: defineAction("read_run", ["Tenant", "Run"], "{}", true),
  read_self: defineAction("read_self", ["Tenant"], "{}", true),
  register_context_source: defineAction("register_context_source", ["Tenant"], "{}", true),
  register_tool_server: defineAction("register_tool_server", ["Tenant"], "{}", true),
  start_run: defineAction(
    "start_run",
    ["Tenant", "Flow"],
    "{ trigger_type?: String }",
    true,
  ),
  test_flow: defineAction("test_flow", ["Tenant", "Flow"], "{}", true),
};

export const ACTION_NAMES: readonly ActionName[] = Object.keys(ACTIONS) as ActionName[];
