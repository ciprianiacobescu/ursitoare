import type { BlockDef, Catalogue, Ref } from "../format/index.ts";
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

export function referenceTaint(
  _ref: Ref | undefined,
  _taintOf: TaintOf,
  _hook?: HookTaintScope,
): Taint {
  throw new Error("not implemented");
}

export function valueTaint(_value: unknown, _taintOf: TaintOf, _hook?: HookTaintScope): Taint {
  throw new Error("not implemented");
}

export function nodeInputTaint(_node: unknown, _taintOf: TaintOf): Taint {
  throw new Error("not implemented");
}
