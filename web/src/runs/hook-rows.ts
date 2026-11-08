import type { StepView } from "./types.ts";

const LABEL_PATTERN = /^(pre|post):(rule\.)?[a-z][a-z0-9_]{0,127}$/;
const NODE_ID_PATTERN = /^[a-z][a-z0-9_]{0,127}$/;
const REF_PATTERN = /^[0-9a-f]{64}$/;
const IDEM_KEY_PATTERN = /^ik1_[0-9a-f]{64}$/;
const MAX_ENTRIES = 64;
const MAX_TOOL_LENGTH = 256;

const NOTE = "This step's hook trace could not be read.";

const ACTIONS: readonly HookEntryView["action"][] = [
  "continue",
  "skip",
  "redirect",
  "retry",
  "fail",
];
const MUTATED: readonly HookEntryView["mutated"][] = ["input", "output"];

export interface HookEntryView {
  label: string;
  kind: "code" | "block";
  fused: boolean;
  attempt: number;
  state: "completed" | "failed";
  action: "continue" | "skip" | "redirect" | "retry" | "fail" | null;
  mutated: "input" | "output" | null;
  to: string | null;
  error: { code: string; message: string } | null;
  tool: string | null;
  idemKey: string | null;
}

export interface StepHooksView {
  inputOriginalRef: string | null;
  entries: HookEntryView[];
}

export interface HookRowView {
  label: string;
  text: string;
  details: readonly { term: string; value: string }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableRef(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && REF_PATTERN.test(value));
}

function isNullableNodeId(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && NODE_ID_PATTERN.test(value));
}

function isNullableText(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length >= 1 && value.length <= MAX_TOOL_LENGTH);
}

function parseError(value: unknown): { code: string; message: string } | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const code = value["code"];
  const message = value["message"];
  if (typeof code !== "string" || typeof message !== "string") return undefined;
  return { code, message };
}

function parseEntry(raw: unknown): HookEntryView | undefined {
  if (!isRecord(raw)) return undefined;
  const label = raw["label"];
  const kind = raw["kind"];
  const fused = raw["fused"];
  const attempt = raw["attempt"];
  const state = raw["state"];
  const action = raw["action"];
  const mutated = raw["mutated"];
  const to = raw["to"];
  const error = raw["error"];
  const tool = raw["tool"];
  const idemKey = raw["idemKey"];

  if (typeof label !== "string" || !LABEL_PATTERN.test(label)) return undefined;
  if (kind !== "code" && kind !== "block") return undefined;
  if (typeof fused !== "boolean") return undefined;
  if (typeof attempt !== "number" || !Number.isInteger(attempt) || attempt < 1) return undefined;
  if (state !== "completed" && state !== "failed") return undefined;
  if (action !== null && !ACTIONS.includes(action as HookEntryView["action"])) return undefined;
  if (mutated !== null && !MUTATED.includes(mutated as HookEntryView["mutated"])) return undefined;
  if (!isNullableNodeId(to)) return undefined;
  const parsedError = parseError(error);
  if (parsedError === undefined) return undefined;
  if (!isNullableText(tool)) return undefined;
  if (idemKey !== null && (typeof idemKey !== "string" || !IDEM_KEY_PATTERN.test(idemKey))) {
    return undefined;
  }

  return {
    label,
    kind,
    fused,
    attempt,
    state,
    action: action as HookEntryView["action"],
    mutated: mutated as HookEntryView["mutated"],
    to,
    error: parsedError,
    tool,
    idemKey,
  };
}

export function parseStepHooks(raw: unknown): StepHooksView | null | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) return null;
  const inputOriginalRef = raw["inputOriginalRef"];
  const entries = raw["entries"];
  if (!isNullableRef(inputOriginalRef)) return null;
  if (!Array.isArray(entries) || entries.length > MAX_ENTRIES) return null;
  const parsedEntries: HookEntryView[] = [];
  for (const entry of entries) {
    const parsed = parseEntry(entry);
    if (parsed === undefined) return null;
    parsedEntries.push(parsed);
  }
  return { inputOriginalRef, entries: parsedEntries };
}

function entryText(entry: HookEntryView): string {
  let text = `${entry.label} · ${entry.kind}${entry.fused ? " (fused)" : ""} · ${entry.state}`;
  if (entry.action !== null) text += ` · ${entry.action}`;
  if (entry.to !== null) text += ` → ${entry.to}`;
  return text;
}

function entryDetails(entry: HookEntryView): readonly { term: string; value: string }[] {
  const details: { term: string; value: string }[] = [
    { term: "Attempt", value: String(entry.attempt) },
    { term: "Mutated", value: entry.mutated ?? "none" },
    { term: "Tool", value: entry.tool ?? "none" },
    { term: "Idempotency key", value: entry.idemKey ?? "none" },
  ];
  if (entry.error !== null) {
    details.push({ term: "Error", value: `${entry.error.code}: ${entry.error.message}` });
  }
  return details;
}

export function hookRows(step: StepView): HookRowView[] {
  const hooks = step.hooks;
  if (hooks === undefined || hooks === null) return [];
  return hooks.entries.map((entry) => ({
    label: entry.label,
    text: entryText(entry),
    details: entryDetails(entry),
  }));
}

export function hookTraceNote(step: StepView): string | null {
  return step.hooks === null ? NOTE : null;
}
