import type { BlockDef, Catalogue, Ref } from "../format/index.ts";
import { scanTemplate, valueFields, walkStrings } from "../format/index.ts";
import { describeTool } from "./tools.ts";
import type { Taint } from "./labels.ts";
import { NO_TAINT, joinTaint, relabelExtract } from "./labels.ts";

export interface ProducedTaint {
  output: Taint;
  fields: Readonly<Record<string, Taint>>;
  outcome: Taint;
}

export type TaintOf = (nodeId: string) => ProducedTaint | undefined;

export interface HookTaintScope {
  input: Taint;
  output: ProducedTaint | null;
}

const UNTRUSTED: Taint = Object.freeze(["untrusted"] as const);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function kindOf(node: unknown): string | undefined {
  return isRecord(node) && typeof node.kind === "string" ? node.kind : undefined;
}

function isUntrustedTool(def: BlockDef | undefined): boolean {
  return (
    def === undefined ||
    def.untrusted_result === true ||
    (def.untrusted_fields !== undefined && def.untrusted_fields.length > 0)
  );
}

export function contextTainted(node: unknown, kind: string | undefined): boolean {
  if (
    kind !== "llm.extract" &&
    kind !== "llm.generate" &&
    kind !== "llm.decide" &&
    kind !== "agent"
  ) {
    return false;
  }
  if (!isRecord(node) || !Array.isArray(node.context)) return false;
  for (const entry of node.context) {
    const tier = isRecord(entry) ? entry.tier : undefined;
    if (tier !== "approved") return true;
  }
  return false;
}

function produced(
  output: Taint,
  fields: ReadonlyArray<readonly [string, Taint]>,
  outcome: Taint,
): ProducedTaint {
  return { output, fields: Object.fromEntries(fields), outcome };
}

export function producedTaint(node: unknown, input: Taint, catalogue: Catalogue): ProducedTaint {
  const kind = kindOf(node);
  switch (kind) {
    case "block": {
      const ref = isRecord(node) ? node.uses : undefined;
      const def = describeTool(catalogue, ref);
      if (def === undefined || def.untrusted_result === true) {
        const output = joinTaint(input, UNTRUSTED);
        return produced(output, [], output);
      }
      const fields: Array<[string, Taint]> = [];
      for (const entry of def.untrusted_fields ?? []) {
        if (typeof entry !== "string") continue;
        const name = entry.split(".")[0];
        if (name === undefined || name === "") continue;
        fields.push([name, joinTaint(input, UNTRUSTED)]);
      }
      return produced(input, fields, input);
    }
    case "delegate": {
      const target = isRecord(node) ? node.target : undefined;
      const workflow = isRecord(node) ? node.workflow : undefined;
      const def =
        typeof target === "string" && typeof workflow === "string"
          ? catalogue.delegateTarget(target, workflow)
          : undefined;
      const trusted = def !== undefined && def.untrusted_result === false;
      const output = trusted ? input : joinTaint(input, UNTRUSTED);
      return produced(output, [], output);
    }
    case "llm.extract": {
      const output = relabelExtract(input);
      return produced(output, [], output);
    }
    case "llm.decide":
      return produced(input, [["outcome", NO_TAINT]], NO_TAINT);
    case "agent": {
      const tools = isRecord(node) ? node.tools : undefined;
      let untrusted = !Array.isArray(tools);
      if (Array.isArray(tools)) {
        for (const tool of tools) {
          if (isUntrustedTool(describeTool(catalogue, tool))) {
            untrusted = true;
            break;
          }
        }
      }
      const output = untrusted ? joinTaint(input, UNTRUSTED) : input;
      return produced(output, [], output);
    }
    case "foreach": {
      const uses = isRecord(node) ? node.uses : undefined;
      const def = describeTool(catalogue, uses);
      const trusted = typeof uses === "string" && !isUntrustedTool(def);
      const output = trusted ? input : joinTaint(input, UNTRUSTED);
      return produced(output, [], output);
    }
    case "subflow": {
      const output = joinTaint(input, UNTRUSTED);
      return produced(output, [], output);
    }
    case "code":
    case "llm.generate":
    case "human.approval":
    case "human.form":
    case "switch":
    case "wait":
    case "end":
      return produced(input, [], kind === "human.approval" ? NO_TAINT : input);
    default:
      return produced(UNTRUSTED, [], UNTRUSTED);
  }
}

function fieldTaint(produced: ProducedTaint, path: readonly string[]): Taint {
  const first = path[0];
  if (first !== undefined && Object.hasOwn(produced.fields, first)) {
    return produced.fields[first] ?? UNTRUSTED;
  }
  return produced.output;
}

export function referenceTaint(
  ref: Ref | undefined,
  taintOf: TaintOf,
  hook?: HookTaintScope,
): Taint {
  if (ref === undefined) return UNTRUSTED;
  switch (ref.root) {
    case "inputs":
      return NO_TAINT;
    case "item":
      return UNTRUSTED;
    case "node": {
      const produced = taintOf(ref.id);
      if (produced === undefined) return UNTRUSTED;
      if (ref.field === "outcome") return produced.outcome;
      return fieldTaint(produced, ref.path);
    }
    case "hook": {
      if (hook === undefined) return UNTRUSTED;
      if (ref.scope === "input") return hook.input;
      if (ref.scope === "output") {
        if (hook.output === null) return UNTRUSTED;
        return fieldTaint(hook.output, ref.path);
      }
      return NO_TAINT;
    }
  }
  return UNTRUSTED;
}

export function valueTaint(value: unknown, taintOf: TaintOf, hook?: HookTaintScope): Taint {
  let taint: Taint = NO_TAINT;
  walkStrings(value, "", (text) => {
    for (const seg of scanTemplate(text)) {
      if (seg.type !== "ref") continue;
      const ref = seg.ref;
      taint = joinTaint(taint, ref === undefined ? UNTRUSTED : referenceTaint(ref, taintOf, hook));
    }
  });
  return taint;
}

export function nodeInputTaint(node: unknown, taintOf: TaintOf): Taint {
  const kind = kindOf(node);
  let taint: Taint = contextTainted(node, kind) ? UNTRUSTED : NO_TAINT;
  for (const field of valueFields(node)) {
    taint = joinTaint(taint, valueTaint(field.value, taintOf));
  }
  return taint;
}
