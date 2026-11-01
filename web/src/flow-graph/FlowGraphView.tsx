// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReactNode } from "react";

import type { GraphView } from "./graph-model.ts";

export interface FlowGraphViewProps {
  view: GraphView;
  canonical: unknown;
  note: string | null;
}

export function FlowGraphView(_props: FlowGraphViewProps): ReactNode {
  throw new Error("not implemented");
}
