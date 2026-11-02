// Drawing model for the saved flow graph (design.md decision 7).

import { clip } from "../admin/shared.ts";
import { kindText } from "./graph-model.ts";
import { GRAPH_GEOMETRY } from "./layout.ts";
import type { GraphLayout } from "./layout.ts";

export interface DrawNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  textX: number;
  titleY: number;
  subtitleY: number;
  title: string;
  subtitle: string;
  className: string;
}

export interface DrawEdge {
  key: string;
  d: string;
  className: string;
  label: string | null;
  labelX: number;
  labelY: number;
}

export function viewBox(layout: GraphLayout): string {
  return `0 0 ${layout.width} ${layout.height}`;
}

function nodeClassNames(start: boolean, selected: boolean, known: boolean, reachable: boolean): string {
  const names = ["flow-graph-node"];
  if (start) names.push("flow-graph-node--start");
  if (selected) names.push("flow-graph-node--selected");
  if (!known) names.push("flow-graph-node--unknown");
  if (!reachable) names.push("flow-graph-node--unreachable");
  return names.join(" ");
}

export function drawNodes(layout: GraphLayout, selected: string | null): DrawNode[] {
  return layout.nodes.map((node) => ({
    id: node.id,
    x: node.x,
    y: node.y,
    width: GRAPH_GEOMETRY.nodeWidth,
    height: GRAPH_GEOMETRY.nodeHeight,
    textX: node.x + GRAPH_GEOMETRY.nodeWidth / 2,
    titleY: node.y + 20,
    subtitleY: node.y + 38,
    title: clip(node.id, 22),
    subtitle: kindText(node),
    className: nodeClassNames(node.start, node.id === selected, node.known, node.reachable),
  }));
}

export function drawEdges(layout: GraphLayout): DrawEdge[] {
  return layout.edges.map((edge) => ({
    key: `${edge.from}>${edge.to}`,
    d: `M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`,
    className: edge.upward ? "flow-graph-edge flow-graph-edge--upward" : "flow-graph-edge",
    label: edge.label === null ? null : clip(edge.label, 24),
    labelX: edge.labelX,
    labelY: edge.labelY,
  }));
}
