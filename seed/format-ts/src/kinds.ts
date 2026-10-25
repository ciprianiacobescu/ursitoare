/**
 * The single table that drives both the in-sandbox builder (src/prelude.js) and the printer (src/print.ts).
 *
 * `fields` are format-v0 field names in output order. In TypeScript each field is spelled camelCase
 * (`output_schema` -> `outputSchema`). Successor fields (`next`, `cases`) are not listed in `fields`
 * except `default` / `on_timeout`, which are plain node-id options.
 */
export type Succ = "next" | "cases" | "none";

export interface KindSpec {
  /** builder method name on `f` */
  method: string;
  /** node kind in the document */
  kind: string;
  /** fields supplied as positional arguments after the id, in order; if absent the 2nd argument is an options object */
  positional?: string[];
  /** every named field of the kind, in output order (excludes `next` and `cases`) */
  fields: string[];
  /** which successor mechanism the kind uses: `next` (default sequencing applies), `cases` (f.cases) or none */
  succ: Succ;
  /** fields whose value is a node id (a handle is accepted and replaced by its id) */
  idFields: string[];
  /** fields that hold values (references allowed), mirrors format/src/refs.ts valueFields */
  valueFields: string[];
}

export const KIND_SPECS: KindSpec[] = [
  { method: "block", kind: "block", positional: ["uses", "with"], fields: ["uses", "with"], succ: "next", idFields: [], valueFields: ["with"] },
  { method: "code", kind: "code", fields: ["language", "input", "source", "output_schema"], succ: "next", idFields: [], valueFields: ["input"] },
  { method: "llmExtract", kind: "llm.extract", fields: ["input", "instructions", "output_schema", "model_profile"], succ: "next", idFields: [], valueFields: ["input"] },
  { method: "llmGenerate", kind: "llm.generate", fields: ["input", "instructions", "output_schema", "model_profile"], succ: "next", idFields: [], valueFields: ["input"] },
  { method: "llmDecide", kind: "llm.decide", fields: ["input", "instructions", "outcomes", "model_profile"], succ: "cases", idFields: [], valueFields: ["input"] },
  { method: "agent", kind: "agent", fields: ["input", "goal", "tools", "max_steps", "output_schema", "model_profile"], succ: "next", idFields: [], valueFields: ["input"] },
  { method: "switch", kind: "switch", fields: ["on", "default"], succ: "cases", idFields: ["default"], valueFields: ["on"] },
  { method: "humanApproval", kind: "human.approval", fields: ["assignee_role", "summary", "timeout"], succ: "cases", idFields: [], valueFields: ["summary"] },
  { method: "humanForm", kind: "human.form", fields: ["assignee_role", "form_schema", "timeout", "on_timeout"], succ: "next", idFields: ["on_timeout"], valueFields: [] },
  { method: "foreach", kind: "foreach", fields: ["items", "uses", "subflow", "with", "max_parallel"], succ: "next", idFields: [], valueFields: ["items", "with"] },
  { method: "subflow", kind: "subflow", positional: ["flow", "with"], fields: ["flow", "with"], succ: "next", idFields: [], valueFields: ["with"] },
  { method: "delegate", kind: "delegate", fields: ["target", "workflow", "with", "callback_timeout", "on_timeout"], succ: "next", idFields: ["on_timeout"], valueFields: ["with"] },
  { method: "wait", kind: "wait", fields: ["duration"], succ: "next", idFields: [], valueFields: [] },
  { method: "end", kind: "end", fields: ["status", "output"], succ: "none", idFields: [], valueFields: ["output"] },
];

export const BY_KIND = new Map(KIND_SPECS.map((s) => [s.kind, s]));
export const BY_METHOD = new Map(KIND_SPECS.map((s) => [s.method, s]));

export const snakeToCamel = (s: string): string => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
export const camelToSnake = (s: string): string => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

/** Top-level meta keys of `flow({...})`, in document order, as TypeScript spells them. */
export const META_KEYS = ["id", "version", "description", "inputs"] as const;
