import { createHash } from "node:crypto";

import type { Catalogue, Flow, HookPlacement } from "../authoring/index.ts";
import {
  augmentedSuccessors,
  hookPlacements,
  hookValueFields,
  stableStringify,
  valueFields,
} from "../authoring/index.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function reachable(
  adjacency: ReadonlyMap<string, readonly string[]>,
  start: string,
  target: string,
  excluded: string | null,
): boolean {
  if (start === excluded) return false;
  if (start === target) return true;
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const next of adjacency.get(id) ?? []) {
      if (next === excluded || seen.has(next)) continue;
      if (next === target) return true;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

function hookPayload(placement: HookPlacement): Record<string, unknown> {
  const hook = placement.hook as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {
    phase: placement.phase,
    label: placement.label,
    kind: hook.kind,
  };
  if (hook.kind === "block") {
    if (hook.uses !== undefined) out.uses = hook.uses;
  } else {
    out.source = sha256Hex(typeof hook.source === "string" ? hook.source : String(hook.source ?? ""));
  }
  for (const { field, value } of hookValueFields(hook)) out[field] = value;
  for (const field of ["when", "routes", "max_retries", "allow_effect_retry", "on_error"]) {
    if (hook[field] !== undefined) out[field] = hook[field];
  }
  return out;
}

export function nodeFingerprint(
  flow: Flow,
  nodeId: string,
  catalogue: Catalogue,
): string | null {
  try {
    const doc: unknown = flow;
    if (!isRecord(doc)) return null;
    const nodes = doc.nodes;
    if (!isRecord(nodes) || !Object.hasOwn(nodes, nodeId)) return null;
    const node = nodes[nodeId];
    if (!isRecord(node)) return null;

    const adjacency = augmentedSuccessors(flow, catalogue);

    const predecessors: string[] = [];
    for (const [id, targets] of adjacency) {
      if (targets.includes(nodeId)) predecessors.push(id);
    }
    predecessors.sort();

    const start = typeof doc.start === "string" ? doc.start : "";
    const reachableFromStart = start !== "" && reachable(adjacency, start, nodeId, null);
    const approvals: { id: string; assignee_role: string | null }[] = [];
    if (reachableFromStart) {
      const approvalIds = Object.keys(nodes)
        .filter((id) => id !== nodeId && isRecord(nodes[id]) && nodes[id].kind === "human.approval")
        .sort();
      for (const id of approvalIds) {
        if (reachable(adjacency, start, nodeId, id)) continue;
        const approval = nodes[id] as Record<string, unknown>;
        approvals.push({
          id,
          assignee_role: typeof approval.assignee_role === "string" ? approval.assignee_role : null,
        });
      }
    }

    const values = valueFields(node)
      .map(({ field, value }) => [field, value] as [string, unknown])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    const placements = hookPlacements(flow, nodeId, catalogue);
    const hooks = [...placements.pre, ...placements.post].map(hookPayload);

    const payload = {
      v: 1,
      kind: typeof node.kind === "string" ? node.kind : null,
      uses: typeof node.uses === "string" ? node.uses : null,
      values,
      predecessors,
      approvals,
      hooks,
    };

    return `nf1_${sha256Hex(stableStringify(payload))}`;
  } catch {
    return null;
  }
}
