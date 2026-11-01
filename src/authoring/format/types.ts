// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonSchema = { [key: string]: JsonValue };

export type Effect = "read" | "write" | "send" | "pay";

export type Values = { [name: string]: JsonValue };

export type NodeKind =
  | "block"
  | "code"
  | "llm.extract"
  | "llm.generate"
  | "llm.decide"
  | "agent"
  | "switch"
  | "human.approval"
  | "human.form"
  | "foreach"
  | "subflow"
  | "delegate"
  | "wait"
  | "end";

export const NODE_KINDS: readonly NodeKind[] = [];

export type HookScope = "input" | "output" | "node" | "next" | "from";

export interface HookSelector {
  kind?: NodeKind[];
  effect?: (Effect | "human" | "none")[];
  nodes?: string[];
  tags?: string[];
}

export interface HookWhen {
  from?: HookSelector;
  next?: HookSelector;
  outcome?: string[];
}

export interface CodeHook {
  id: string;
  kind: "code";
  when?: HookWhen;
  input?: Values;
  source: string;
  routes?: string[];
  max_retries?: number;
  allow_effect_retry?: boolean;
}

export interface BlockHook {
  id: string;
  kind: "block";
  when?: HookWhen;
  input?: Values;
  uses: string;
  with: Values;
  on_error?: "fail" | "continue";
}

export type HookDef = CodeHook | BlockHook;

export interface HookRule {
  id: string;
  match: HookSelector;
  pre?: HookDef;
  post?: HookDef;
}

export interface NodeBase {
  tags?: string[];
  pre?: HookDef[];
  post?: HookDef[];
}

export interface ContextSource {
  source: string;
  tier?: string;
  scope?: { tenant?: string; role?: string; step?: string };
  budget?: { max_tokens?: number; max_age?: string };
  on_unanswerable?: string;
}

export interface LlmTuning {
  model_profile?: string;
  profile?: string;
  skills?: string[];
  skill_mode?: "bound" | "catalog";
  context?: ContextSource[];
  context_budget?: { total_tokens: number };
}

type NodeOf<K extends NodeKind, F> = NodeBase & { kind: K } & F;

type LlmFields = LlmTuning & { input: Values; instructions: string };

export type BlockNode = NodeOf<"block", { uses: string; with: Values; next?: string }>;

export type CodeNode = NodeOf<
  "code",
  {
    language: "js";
    source: string;
    input: Values;
    output_schema: JsonSchema;
    next?: string;
  }
>;

export type LlmExtractNode = NodeOf<
  "llm.extract",
  LlmFields & { output_schema: JsonSchema; next?: string }
>;

export type LlmGenerateNode = NodeOf<
  "llm.generate",
  LlmFields & { output_schema: JsonSchema; next?: string }
>;

export type LlmDecideNode = NodeOf<
  "llm.decide",
  LlmFields & { outcomes: string[]; cases: { [outcome: string]: string } }
>;

export type AgentNode = NodeOf<
  "agent",
  LlmTuning & {
    input: Values;
    goal: string;
    tools: string[];
    max_steps: number;
    output_schema: JsonSchema;
    next?: string;
  }
>;

export type SwitchNode = NodeOf<
  "switch",
  { on: string; cases: { [key: string]: string }; default: string }
>;

export type HumanApprovalNode = NodeOf<
  "human.approval",
  {
    assignee_role: string;
    summary: string;
    timeout: string;
    cases: { approved: string; rejected: string; timeout: string };
  }
>;

export type HumanFormNode = NodeOf<
  "human.form",
  {
    assignee_role: string;
    form_schema: JsonSchema;
    timeout: string;
    next?: string;
    on_timeout: string;
  }
>;

export type ForeachNode = NodeOf<
  "foreach",
  {
    items: string;
    uses?: string;
    subflow?: string;
    with: Values;
    max_parallel?: number;
    next?: string;
  }
>;

export type SubflowNode = NodeOf<"subflow", { flow: string; with: Values; next?: string }>;

export type DelegateNode = NodeOf<
  "delegate",
  {
    target: string;
    workflow: string;
    with: Values;
    callback_timeout: string;
    next?: string;
    on_timeout?: string;
  }
>;

export type WaitNode = NodeOf<"wait", { duration: string; next?: string }>;

export type EndNode = NodeOf<"end", { status: "completed" | "failed"; output?: Values }>;

export type FlowNode =
  | BlockNode
  | CodeNode
  | LlmExtractNode
  | LlmGenerateNode
  | LlmDecideNode
  | AgentNode
  | SwitchNode
  | HumanApprovalNode
  | HumanFormNode
  | ForeachNode
  | SubflowNode
  | DelegateNode
  | WaitNode
  | EndNode;

export interface Flow {
  ursitoare: string;
  flow: string;
  version: string;
  description?: string;
  inputs: JsonSchema;
  start: string;
  nodes: { [id: string]: FlowNode };
  hooks?: HookRule[];
  expose?: "mcp";
}

export const FLOW_TOP_LEVEL_FIELDS: readonly (keyof Flow)[] = [];
