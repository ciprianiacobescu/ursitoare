// The graph page, the editor panel and their texts (design.md decisions 1 and 10).

import type { VersionRow } from "../flows/versions.ts";

export interface GraphPage {
  id: string;
  file: string;
  path: string;
  navLabel: string | null;
  capability: string | null;
}

const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_ID_MAX_LENGTH = 64;

export const GRAPH_PAGE: GraphPage = {
  id: "flow-graph",
  file: "75-flow-graph.tsx",
  path: "/flows/:flowId/graph",
  navLabel: null,
  capability: null,
};

export const GRAPH_PANEL: { id: string; title: string } = { id: "graph", title: "Graph" };

export function graphPath(flowId: string): string {
  if (
    typeof flowId !== "string" ||
    flowId.length > FLOW_ID_MAX_LENGTH ||
    !FLOW_ID_PATTERN.test(flowId)
  ) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  return `/flows/${flowId}/graph`;
}

export function needsDocument(version: VersionRow | null, canonical: unknown): boolean {
  return version !== null && (canonical === null || canonical === undefined);
}

export function versionNote(version: number | null): string {
  return version === null ? "No version saved yet." : `Showing version ${version}.`;
}
