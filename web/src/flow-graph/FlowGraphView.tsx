import { useId, useState } from "react";
import type { ReactNode } from "react";

import { drawEdges, drawNodes, viewBox } from "./drawing.ts";
import { chooseNode, nodeDetailRows } from "./graph-model.ts";
import type { GraphView } from "./graph-model.ts";
import { hookOverlay, hookRoutePaths, hookSectionView } from "./hook-overlay.ts";
import "./flow-graph.css";
import "./hook-overlay.css";

export interface FlowGraphViewProps {
  view: GraphView;
  canonical: unknown;
  note: string | null;
}

const DETAILS_HINT = "Select a node in the list or in the drawing to see its fields.";
const FLOW_RULES_NOTE =
  "Flow rules are listed, not drawn: the graph cannot tell which nodes they match.";

export function FlowGraphView(props: FlowGraphViewProps): ReactNode {
  const { view, canonical, note } = props;
  const [selected, setSelected] = useState<string | null>(null);
  const detailsId = useId();
  const detailsHeadingId = useId();
  const layout = view.state === "ready" ? view.layout : null;
  const section = hookSectionView(canonical, layout);
  const hookPaths =
    layout === null ? [] : hookRoutePaths(hookOverlay(canonical, layout).routes, layout);

  const choose = (id: string): void => {
    if (layout === null) return;
    setSelected((current) => chooseNode(layout, current, id));
  };

  const selectedNode =
    layout === null ? undefined : layout.nodes.find((node) => node.id === selected);

  return (
    <div className="flow-graph">
      <p role="status">{view.message}</p>
      {note === null ? null : <p className="flow-graph-note">{note}</p>}
      {layout === null ? null : (
        <>
          <svg
            className="flow-graph-svg"
            viewBox={viewBox(layout)}
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <marker
                id="flow-graph-arrow"
                className="flow-graph-arrow"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M 0 0 L 10 5 L 0 10 Z" />
              </marker>
            </defs>
            <g className="flow-graph-body">
              {drawEdges(layout).map((edge) => (
                <g key={edge.key}>
                  <path className={edge.className} d={edge.d} markerEnd="url(#flow-graph-arrow)" />
                  {edge.label === null ? null : (
                    <text
                      className="flow-graph-edge-label"
                      x={edge.labelX}
                      y={edge.labelY}
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              ))}
              {hookPaths.map((path) => (
                <path key={path.key} className={path.className} d={path.d} />
              ))}
              {drawNodes(layout, selected).map((node) => (
                <g
                  key={node.id}
                  className="flow-graph-node-group"
                  onClick={() => {
                    choose(node.id);
                  }}
                >
                  <rect
                    className={node.className}
                    x={node.x}
                    y={node.y}
                    width={node.width}
                    height={node.height}
                    rx="6"
                  />
                  <text
                    className="flow-graph-title"
                    x={node.textX}
                    y={node.titleY}
                    textAnchor="middle"
                  >
                    {node.title}
                  </text>
                  <text
                    className="flow-graph-kind"
                    x={node.textX}
                    y={node.subtitleY}
                    textAnchor="middle"
                  >
                    {node.subtitle}
                  </text>
                </g>
              ))}
            </g>
          </svg>
          <h3>Nodes</h3>
          <ul className="flow-graph-list" aria-label="Nodes">
            {view.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={selected === item.id}
                  aria-controls={detailsId}
                  onClick={() => {
                    choose(item.id);
                  }}
                >
                  {item.label}
                </button>{" "}
                <span>{item.summary}</span>
              </li>
            ))}
          </ul>
          {section === null ? null : (
            <>
              {section.hooks.length === 0 ? null : (
                <>
                  <h3>Hooks</h3>
                  <ul className="flow-graph-list" aria-label="Hooks">
                    {section.hooks.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </>
              )}
              {section.routes.length === 0 ? null : (
                <>
                  <h3>Hook routes</h3>
                  <ul className="flow-graph-list" aria-label="Hook routes">
                    {section.routes.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                </>
              )}
              {section.missing === null ? null : <p>{section.missing}</p>}
              {section.rules.length === 0 ? null : (
                <>
                  <h3>Flow rules</h3>
                  <ul className="flow-graph-list" aria-label="Flow rules">
                    {section.rules.map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                  <p>{FLOW_RULES_NOTE}</p>
                </>
              )}
            </>
          )}
          <section className="flow-graph-details" id={detailsId} aria-labelledby={detailsHeadingId}>
            <h3 id={detailsHeadingId}>Node details</h3>
            {selectedNode === undefined ? (
              <p>{DETAILS_HINT}</p>
            ) : (
              <dl>
                {nodeDetailRows(canonical, selectedNode).map((row) => (
                  <div key={row.name}>
                    <dt>{row.name}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </>
      )}
    </div>
  );
}
