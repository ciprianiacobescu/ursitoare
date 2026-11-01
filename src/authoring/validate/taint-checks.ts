/**
 * L3 taint decisions (design D6). Every decision comes from `analyzeTaint` and `flowCapabilities`;
 * this file only maps U23's edges onto sinks and codes.
 */

import { escapePointer } from "../format/index.ts";
import type { Catalogue, Flow } from "../format/index.ts";
import { analyzeTaint, capabilityEvidence } from "../taint/index.ts";
import type { CapabilitySite } from "../taint/index.ts";
import { isObj } from "./jsonschema.ts";
import type { Sink } from "./sink.ts";

const FIX = "pass it through an llm.extract node first";

function tools(sites: CapabilitySite[]): string {
  return [...new Set(sites.map((site) => site.tool).filter((tool) => tool !== ""))].sort().join(", ");
}

function consequential(catalogue: Catalogue, ref: unknown): boolean {
  if (typeof ref !== "string") return false;
  const block = catalogue.block(ref);
  return block !== undefined && block.effect !== "read";
}

/**
 * Run the taint checks. `refErrorPaths` holds the paths that already carry an `L3_REF_*` or
 * `L3_ITEM_OUTSIDE_FOREACH` error.
 */
export function checkTaint(flow: Flow, catalogue: Catalogue, refErrorPaths: ReadonlySet<string>, s: Sink): void {
  const analysis = analyzeTaint(flow, catalogue);
  const nodes: unknown = flow.nodes;
  for (const edge of analysis.edges) {
    if (edge.hook !== null || !edge.resolved || !edge.taint.includes("untrusted")) continue;
    if (refErrorPaths.has(edge.path)) continue;
    const node = isObj(nodes) ? nodes[edge.to] : undefined;
    if (!isObj(node)) continue;
    const from = edge.from ?? "foreach items";
    const withPrefix = `/nodes/${escapePointer(edge.to)}/with/`;
    const inputPrefix = `/nodes/${escapePointer(edge.to)}/input/`;
    const describe = `untrusted data from ${from} reaches ${edge.to} through ${edge.ref}`;
    if (
      (node.kind === "block" || (node.kind === "foreach" && node.uses !== undefined)) &&
      edge.path.startsWith(withPrefix)
    ) {
      if (consequential(catalogue, node.uses)) {
        s.err(
          "L3",
          "L3_TAINT_TO_CONSEQUENTIAL",
          edge.to,
          edge.path,
          `${describe}, a block with side effects; ${FIX}`,
        );
      }
    } else if (node.kind === "agent" && edge.path.startsWith(inputPrefix)) {
      const list = Array.isArray(node.tools) ? node.tools : [];
      if (list.some((tool) => consequential(catalogue, tool))) {
        s.err(
          "L3",
          "L3_TAINT_TO_AGENT_WITH_EFFECTS",
          edge.to,
          edge.path,
          `${describe}, an agent with side-effecting tools; ${FIX}`,
        );
      }
    } else if (
      (node.kind === "subflow" || node.kind === "delegate" || (node.kind === "foreach" && node.subflow !== undefined)) &&
      edge.path.startsWith(withPrefix)
    ) {
      s.warn(
        "L3",
        "W_TAINT_TO_OPAQUE_CALL",
        edge.to,
        edge.path,
        `${describe}, a call whose effects cannot be checked; ${FIX}`,
      );
    }
  }

  const evidence = capabilityEvidence(flow, catalogue);
  if (evidence.reads_untrusted.length > 0 && evidence.reads_private.length > 0 && evidence.has_send_or_pay.length > 0) {
    s.warn(
      "L3",
      "W_LETHAL_TRIFECTA",
      null,
      "/nodes",
      `flow reads untrusted content (${tools(evidence.reads_untrusted)}), reads private data (${tools(evidence.reads_private)}) and can send or pay (${tools(evidence.has_send_or_pay)})`,
    );
  }
}
