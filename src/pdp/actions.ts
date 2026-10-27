// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

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

// The scaffold value of every entry: empty data, with the context cast to its declared type.
function emptySpec<A extends ActionName>(): ActionSpec<ActionContext<A>> {
  return { cedar: "", resources: [], capability: false, context: {} as ActionContext<A> };
}

export const ACTIONS: { readonly [A in ActionName]: ActionSpec<ActionContext<A>> } = {
  activate_flow: emptySpec<"activate_flow">(),
  approve_task: emptySpec<"approve_task">(),
  approve_tool_surface: emptySpec<"approve_tool_surface">(),
  author_flow: emptySpec<"author_flow">(),
  debug_run: emptySpec<"debug_run">(),
  deploy_policy: emptySpec<"deploy_policy">(),
  dry_run_flow: emptySpec<"dry_run_flow">(),
  edit_flow: emptySpec<"edit_flow">(),
  edit_profile: emptySpec<"edit_profile">(),
  invoke_llm: emptySpec<"invoke_llm">(),
  invoke_tool: emptySpec<"invoke_tool">(),
  manage_credentials: emptySpec<"manage_credentials">(),
  manage_tenant: emptySpec<"manage_tenant">(),
  manage_triggers: emptySpec<"manage_triggers">(),
  manage_users_roles: emptySpec<"manage_users_roles">(),
  read_audit: emptySpec<"read_audit">(),
  read_context: emptySpec<"read_context">(),
  read_flow: emptySpec<"read_flow">(),
  read_registry: emptySpec<"read_registry">(),
  read_run: emptySpec<"read_run">(),
  read_self: emptySpec<"read_self">(),
  register_context_source: emptySpec<"register_context_source">(),
  register_tool_server: emptySpec<"register_tool_server">(),
  start_run: emptySpec<"start_run">(),
  test_flow: emptySpec<"test_flow">(),
};

export const ACTION_NAMES: readonly ActionName[] = [];
