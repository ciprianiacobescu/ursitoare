// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, Flow } from "../format/index.ts";
import type { Taint } from "./labels.ts";

export interface NodeTaint {
  input: Taint;
  output: Taint;
  fields: { [field: string]: Taint };
}

export interface TaintEdge {
  to: string;
  path: string;
  ref: string;
  from: string | null;
  taint: Taint;
  resolved: boolean;
  hook: string | null;
}

export interface TaintAnalysis {
  nodes: { [id: string]: NodeTaint };
  edges: TaintEdge[];
}

export function analyzeTaint(_flow: Flow, _catalogue: Catalogue): TaintAnalysis {
  throw new Error("not implemented");
}
