// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, Ref } from "../format/index.ts";
import type { Taint } from "./labels.ts";

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

export function producedTaint(_node: unknown, _input: Taint, _catalogue: Catalogue): ProducedTaint {
  throw new Error("not implemented");
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
