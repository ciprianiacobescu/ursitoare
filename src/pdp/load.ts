import { cedar } from "./cedar.ts";
import { PdpError } from "./errors.ts";
import type { PdpErrorCode } from "./errors.ts";
import type { PolicyLayer, PolicySource } from "./types.ts";

const SOURCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_./-]{0,127}$/;
const POLICY_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const MAX_MESSAGE_IDS = 20;

export interface LoadedPolicySet {
  readonly schema: string;
  readonly policyMap: Readonly<Record<string, string>>;
  readonly actions: readonly string[];
  readonly policies: readonly { readonly id: string; readonly layer: PolicyLayer }[];
}

interface SourceParts {
  readonly source: PolicySource;
  readonly policies: readonly string[];
  readonly templates: readonly string[];
}

function fail(
  code: PdpErrorCode,
  stage: string,
  ids: readonly string[],
  extra: Record<string, string | readonly string[]> = {},
): never {
  const shown = ids.slice(0, MAX_MESSAGE_IDS).join(", ");
  const message = `${code}: ${stage}${shown === "" ? "" : ` ${shown}`}`;
  throw new PdpError(code, message, { stage, ids, ...extra });
}

function optionsInvalid(reason: string): never {
  throw new PdpError("PDP_OPTIONS_INVALID", `PDP_OPTIONS_INVALID: options ${reason}`, {
    reason,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validateOptions(
  schema: unknown,
  policies: unknown,
): { readonly schema: string; readonly policies: PolicySource[] } {
  if (typeof schema !== "string") {
    optionsInvalid("schema");
  }
  if (!Array.isArray(policies)) {
    optionsInvalid("policies");
  }
  const list: readonly unknown[] = policies;
  for (const candidate of list) {
    if (!isRecord(candidate)) {
      optionsInvalid("source_id");
    }
    if (typeof candidate["id"] !== "string" || !SOURCE_ID_PATTERN.test(candidate["id"])) {
      optionsInvalid("source_id");
    }
    if (candidate["layer"] !== "platform" && candidate["layer"] !== "tenant") {
      optionsInvalid("layer");
    }
    if (typeof candidate["text"] !== "string") {
      optionsInvalid("text");
    }
  }
  const sources = list.map((candidate): PolicySource => {
    const record = candidate as Record<string, unknown>;
    return {
      id: record["id"] as string,
      text: record["text"] as string,
      layer: record["layer"] as PolicyLayer,
    };
  });
  return { schema, policies: sources };
}

function duplicateSourceIds(sources: readonly PolicySource[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const source of sources) {
    if (seen.has(source.id)) {
      duplicates.add(source.id);
    }
    seen.add(source.id);
  }
  return [...duplicates].sort();
}

function loadSchema(schema: string): { readonly actions: readonly string[] } {
  const parsed = cedar.checkParseSchema(schema);
  if (parsed.type !== "success") {
    fail("PDP_SCHEMA_INVALID", "schema", []);
  }
  const converted = cedar.schemaToJson(schema);
  if (converted.type !== "success") {
    fail("PDP_SCHEMA_INVALID", "schema", []);
  }
  if (Object.keys(converted.json).some((name) => name !== "")) {
    fail("PDP_SCHEMA_INVALID", "schema", [], { reason: "namespace" });
  }
  const root = converted.json[""];
  const actions = root === undefined ? [] : Object.keys(root.actions).sort();
  return { actions };
}

function parseSources(sources: readonly PolicySource[]): SourceParts[] {
  const parsed: SourceParts[] = [];
  const failed: string[] = [];
  for (const source of sources) {
    const parts = cedar.policySetTextToParts(source.text);
    if (parts.type !== "success") {
      failed.push(source.id);
      continue;
    }
    parsed.push({ source, policies: parts.policies, templates: parts.policy_templates });
  }
  if (failed.length > 0) {
    fail("PDP_POLICY_INVALID", "parse", [...new Set(failed)].sort());
  }
  const templated = parsed
    .filter((entry) => entry.templates.length > 0)
    .map((entry) => entry.source.id);
  if (templated.length > 0) {
    fail("PDP_POLICY_INVALID", "template", [...new Set(templated)].sort());
  }
  return parsed;
}

function policyIds(parsed: readonly SourceParts[]): {
  readonly byId: Map<string, { text: string; layer: PolicyLayer }>;
  readonly duplicates: string[];
} {
  const byId = new Map<string, { text: string; layer: PolicyLayer }>();
  const duplicates = new Set<string>();
  const missing = new Set<string>();
  for (const entry of parsed) {
    for (const text of entry.policies) {
      const json = cedar.policyToJson(text);
      if (json.type !== "success") {
        missing.add(entry.source.id);
        continue;
      }
      const id = json.json.annotations?.["id"];
      if (typeof id !== "string" || !POLICY_ID_PATTERN.test(id)) {
        missing.add(entry.source.id);
        continue;
      }
      if (byId.has(id)) {
        duplicates.add(id);
      } else {
        byId.set(id, { text, layer: entry.source.layer });
      }
    }
  }
  if (missing.size > 0) {
    fail("PDP_POLICY_INVALID", "id", [...missing].sort());
  }
  return { byId, duplicates: [...duplicates].sort() };
}

function strictValidate(schema: string, policyMap: Record<string, string>): void {
  const validation = cedar.validate({
    validationSettings: { mode: "strict" },
    schema,
    policies: { staticPolicies: policyMap },
  });
  const allIds = Object.keys(policyMap).sort();
  if (validation.type === "failure") {
    fail("PDP_POLICY_INVALID", "validate", allIds);
  }
  if (
    validation.validationErrors.length > 0 ||
    validation.validationWarnings.length > 0 ||
    validation.otherWarnings.length > 0
  ) {
    const ids = new Set<string>();
    for (const entry of validation.validationErrors) {
      ids.add(entry.policyId);
    }
    for (const entry of validation.validationWarnings) {
      ids.add(entry.policyId);
    }
    fail("PDP_POLICY_INVALID", "validate", ids.size > 0 ? [...ids].sort() : allIds);
  }
}

export function loadPolicySet(opts: { schema: unknown; policies: unknown }): LoadedPolicySet {
  const { schema, policies: sources } = validateOptions(opts.schema, opts.policies);

  const repeatedSources = duplicateSourceIds(sources);
  if (repeatedSources.length > 0) {
    fail("PDP_DUPLICATE_ID", "source", repeatedSources);
  }

  const { actions } = loadSchema(schema);
  const parsed = parseSources(sources);

  const { byId, duplicates } = policyIds(parsed);
  if (duplicates.length > 0) {
    fail("PDP_DUPLICATE_ID", "policy", duplicates);
  }

  const policyMap: Record<string, string> = {};
  for (const [id, entry] of byId) {
    policyMap[id] = entry.text;
  }
  strictValidate(schema, policyMap);

  const policies = [...byId.entries()]
    .map(([id, entry]) => ({ id, layer: entry.layer }))
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));

  return { schema, policyMap, actions, policies };
}
