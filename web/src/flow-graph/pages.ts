// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { VersionRow } from "../flows/versions.ts";

export interface GraphPage {
  id: string;
  file: string;
  path: string;
  navLabel: string | null;
  capability: string | null;
}

export const GRAPH_PAGE: GraphPage = {
  id: "",
  file: "",
  path: "",
  navLabel: null,
  capability: null,
};

export const GRAPH_PANEL: { id: string; title: string } = { id: "", title: "" };

export function graphPath(_flowId: string): string {
  throw new Error("not implemented");
}

export function needsDocument(_version: VersionRow | null, _canonical: unknown): boolean {
  throw new Error("not implemented");
}

export function versionNote(_version: number | null): string {
  throw new Error("not implemented");
}
