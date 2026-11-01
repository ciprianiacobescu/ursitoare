/**
 * The L1 schema of a flow document (design D3): the seed's format v0 schema with a wider role id,
 * and the v0.2 members (`expose`, `hooks`, `tags`, `pre`, `post`, LLM tuning) accepted by shape only.
 */

type Schema = Record<string, unknown>;

const ref = (name: string): Schema => ({ $ref: `#/$defs/${name}` });

const objectArray: Schema = { type: "array", items: { type: "object" } };
const uniqueStrings: Schema = { type: "array", uniqueItems: true, items: ref("nonEmptyString") };

const COMMON: Schema = {
  tags: uniqueStrings,
  pre: objectArray,
  post: objectArray,
};

const TUNING: Schema = {
  profile: ref("nonEmptyString"),
  skills: uniqueStrings,
  skill_mode: { enum: ["bound", "catalog"] },
  context: objectArray,
  context_budget: { type: "object" },
};

function variant(
  kind: string,
  required: string[],
  properties: Schema,
  options: { tuning?: boolean; extra?: Schema } = {},
): Schema {
  return {
    type: "object",
    required: ["kind", ...required],
    additionalProperties: false,
    properties: {
      kind: { const: kind },
      ...properties,
      ...COMMON,
      ...(options.tuning === true ? TUNING : {}),
    },
    ...options.extra,
  };
}

const NODE_KINDS_BY_DEF: Array<[string, string]> = [
  ["n_block", "block"],
  ["n_code", "code"],
  ["n_llm_extract", "llm.extract"],
  ["n_llm_generate", "llm.generate"],
  ["n_llm_decide", "llm.decide"],
  ["n_agent", "agent"],
  ["n_switch", "switch"],
  ["n_human_approval", "human.approval"],
  ["n_human_form", "human.form"],
  ["n_foreach", "foreach"],
  ["n_subflow", "subflow"],
  ["n_delegate", "delegate"],
  ["n_wait", "wait"],
  ["n_end", "end"],
];

export const FLOW_SCHEMA: Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://ursitoare.dev/schema/flow.v0.schema.json",
  title: "Ursitoare flow, format v0 (ursitoare: 0.1)",
  type: "object",
  required: ["ursitoare", "flow", "version", "inputs", "start", "nodes"],
  additionalProperties: false,
  properties: {
    ursitoare: { const: "0.1" },
    flow: { type: "string", pattern: "^[a-z][a-z0-9]*(-[a-z0-9]+)*$" },
    version: {
      type: "string",
      pattern:
        "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\\+[0-9A-Za-z.-]+)?$",
    },
    description: { type: "string" },
    inputs: ref("objectSchema"),
    start: ref("nodeId"),
    nodes: {
      type: "object",
      minProperties: 1,
      propertyNames: ref("nodeId"),
      additionalProperties: ref("node"),
    },
    expose: { const: "mcp" },
    hooks: objectArray,
  },
  $defs: {
    nodeId: { type: "string", pattern: "^[a-z][a-z0-9_]*$" },
    identifier: { type: "string", pattern: "^[A-Za-z_][A-Za-z0-9_]*$" },
    blockRef: { type: "string", pattern: "^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+@[0-9]+$" },
    flowRef: { type: "string", pattern: "^[a-z][a-z0-9]*(-[a-z0-9]+)*@[0-9]+$" },
    duration: {
      type: "string",
      pattern:
        "^P(?=[0-9]|T[0-9])([0-9]+(\\.[0-9]+)?Y)?([0-9]+(\\.[0-9]+)?M)?([0-9]+(\\.[0-9]+)?W)?([0-9]+(\\.[0-9]+)?D)?(T(?=[0-9])([0-9]+(\\.[0-9]+)?H)?([0-9]+(\\.[0-9]+)?M)?([0-9]+(\\.[0-9]+)?S)?)?$",
    },
    singleRef: { type: "string", pattern: "^\\$\\{\\{[^{}]+\\}\\}$" },
    objectSchema: {
      type: "object",
      required: ["type"],
      properties: { type: { const: "object" } },
    },
    valueMap: { type: "object", propertyNames: ref("identifier") },
    nonEmptyString: { type: "string", minLength: 1 },
    role: { type: "string", pattern: "^[a-z][a-z0-9_]{0,31}$" },
    modelProfile: { type: "string", pattern: "^[a-z][a-z0-9_-]*$" },
    node: {
      type: "object",
      required: ["kind"],
      properties: { kind: { type: "string" } },
      discriminator: { propertyName: "kind" },
      oneOf: NODE_KINDS_BY_DEF.map(([name]) => ref(name)),
    },
    n_block: variant("block", ["uses", "with"], {
      uses: ref("blockRef"),
      with: ref("valueMap"),
      next: ref("nodeId"),
    }),
    n_code: variant("code", ["language", "source", "input", "output_schema"], {
      language: { const: "js" },
      source: ref("nonEmptyString"),
      input: ref("valueMap"),
      output_schema: ref("objectSchema"),
      next: ref("nodeId"),
    }),
    n_llm_extract: variant(
      "llm.extract",
      ["input", "instructions", "output_schema"],
      {
        input: ref("valueMap"),
        instructions: ref("nonEmptyString"),
        output_schema: ref("objectSchema"),
        model_profile: ref("modelProfile"),
        next: ref("nodeId"),
      },
      { tuning: true },
    ),
    n_llm_generate: variant(
      "llm.generate",
      ["input", "instructions", "output_schema"],
      {
        input: ref("valueMap"),
        instructions: ref("nonEmptyString"),
        output_schema: ref("objectSchema"),
        model_profile: ref("modelProfile"),
        next: ref("nodeId"),
      },
      { tuning: true },
    ),
    n_llm_decide: variant(
      "llm.decide",
      ["input", "instructions", "outcomes", "cases"],
      {
        input: ref("valueMap"),
        instructions: ref("nonEmptyString"),
        outcomes: { type: "array", minItems: 2, uniqueItems: true, items: ref("nonEmptyString") },
        cases: { type: "object", minProperties: 2, additionalProperties: ref("nodeId") },
        model_profile: ref("modelProfile"),
      },
      { tuning: true },
    ),
    n_agent: variant(
      "agent",
      ["input", "goal", "tools", "max_steps", "output_schema"],
      {
        input: ref("valueMap"),
        goal: ref("nonEmptyString"),
        tools: { type: "array", minItems: 1, uniqueItems: true, items: ref("blockRef") },
        max_steps: { type: "integer", minimum: 1, maximum: 50 },
        output_schema: ref("objectSchema"),
        model_profile: ref("modelProfile"),
        next: ref("nodeId"),
      },
      { tuning: true },
    ),
    n_switch: variant("switch", ["on", "cases", "default"], {
      on: ref("singleRef"),
      cases: { type: "object", minProperties: 1, additionalProperties: ref("nodeId") },
      default: ref("nodeId"),
    }),
    n_human_approval: variant("human.approval", ["assignee_role", "summary", "timeout", "cases"], {
      assignee_role: ref("role"),
      summary: ref("nonEmptyString"),
      timeout: ref("duration"),
      cases: {
        type: "object",
        required: ["approved", "rejected", "timeout"],
        additionalProperties: false,
        properties: {
          approved: ref("nodeId"),
          rejected: ref("nodeId"),
          timeout: ref("nodeId"),
        },
      },
    }),
    n_human_form: variant(
      "human.form",
      ["assignee_role", "form_schema", "timeout", "on_timeout"],
      {
        assignee_role: ref("role"),
        form_schema: ref("objectSchema"),
        timeout: ref("duration"),
        next: ref("nodeId"),
        on_timeout: ref("nodeId"),
      },
    ),
    n_foreach: variant(
      "foreach",
      ["items", "with"],
      {
        items: ref("singleRef"),
        uses: ref("blockRef"),
        subflow: ref("flowRef"),
        with: ref("valueMap"),
        max_parallel: { type: "integer", minimum: 1 },
        next: ref("nodeId"),
      },
      {
        extra: {
          anyOf: [{ required: ["uses"] }, { required: ["subflow"] }],
          not: { required: ["uses", "subflow"] },
        },
      },
    ),
    n_subflow: variant("subflow", ["flow", "with"], {
      flow: ref("flowRef"),
      with: ref("valueMap"),
      next: ref("nodeId"),
    }),
    n_delegate: variant("delegate", ["target", "workflow", "with", "callback_timeout"], {
      target: ref("nonEmptyString"),
      workflow: ref("nonEmptyString"),
      with: ref("valueMap"),
      callback_timeout: ref("duration"),
      next: ref("nodeId"),
      on_timeout: ref("nodeId"),
    }),
    n_wait: variant("wait", ["duration"], {
      duration: ref("duration"),
      next: ref("nodeId"),
    }),
    n_end: variant("end", ["status"], {
      status: { enum: ["completed", "failed"] },
      output: ref("valueMap"),
    }),
  },
};
