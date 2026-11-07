import type { Catalogue, Flow, Taint } from "../../../src/authoring/index.ts";
import { analyzeTaint, nodeInputTaint, producedTaint as sharedProducedTaint, successorFields } from "../../../src/authoring/index.ts";
import type { ProducedTaint } from "../../../src/authoring/index.ts";
import { taintIncludes } from "../../../src/authoring/taint/labels.ts";

export interface InclusionReport {
  paths: number;
  checked: string[];
  cut: string[];
  violations: string[];
}

function successorIds(flow: Flow, node: unknown): string[] {
  const out: string[] = [];
  for (const field of successorFields(node)) {
    const id = field.id;
    if (typeof id === "string" && Object.hasOwn(flow.nodes, id) && !out.includes(id)) out.push(id);
  }
  return out;
}

export function flowPaths(flow: Flow, max: number): string[][] {
  const paths: string[][] = [];
  if (typeof flow.start !== "string" || !Object.hasOwn(flow.nodes, flow.start)) return paths;
  const walk = (path: string[]): void => {
    if (paths.length >= max) return;
    const last = path[path.length - 1] as string;
    const next = successorIds(flow, flow.nodes[last]).filter((id) => !path.includes(id));
    if (next.length === 0) {
      paths.push(path);
      return;
    }
    for (const id of next) walk([...path, id]);
  };
  walk([flow.start]);
  return paths;
}

const show = (taint: Taint): string => taint.join(",");

export function inclusionReport(
  flow: Flow,
  catalogue: Catalogue,
  produced: typeof sharedProducedTaint = sharedProducedTaint,
): InclusionReport {
  const analysis = analyzeTaint(flow, catalogue);
  const paths = flowPaths(flow, 256);
  const checked = new Set<string>();
  const cut = new Set<string>();
  const violations: string[] = [];
  for (const path of paths) {
    const seen = new Map<string, ProducedTaint>();
    const label = path.join(" >> ");
    for (const id of path) {
      const node = flow.nodes[id];
      if ((node as { kind?: unknown } | undefined)?.kind === "foreach") {
        cut.add(id);
        break;
      }
      const input = nodeInputTaint(node, (nodeId) => seen.get(nodeId));
      const out = produced(node, input, catalogue);
      seen.set(id, out);
      checked.add(id);
      const stat = analysis.nodes[id];
      if (stat === undefined) continue;
      if (!taintIncludes(stat.input, input)) {
        violations.push(`${label} at ${id}: input static [${show(stat.input)}] runtime [${show(input)}]`);
      }
      if (!taintIncludes(stat.output, out.output)) {
        violations.push(`${label} at ${id}: output static [${show(stat.output)}] runtime [${show(out.output)}]`);
      }
      for (const [name, value] of Object.entries(out.fields)) {
        const s = Object.hasOwn(stat.fields, name) ? stat.fields[name] : undefined;
        if (s === undefined) {
          violations.push(`${label} at ${id}: field ${name} static absent runtime [${show(value)}]`);
        } else if (!taintIncludes(s, value)) {
          violations.push(`${label} at ${id}: field ${name} static [${show(s)}] runtime [${show(value)}]`);
        }
      }
    }
  }
  return {
    paths: paths.length,
    checked: [...checked].sort(),
    cut: [...cut].sort(),
    violations,
  };
}
