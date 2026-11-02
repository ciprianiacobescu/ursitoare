import type { FeatureSpec } from "../app/features.ts";
import { registerEditorPanel } from "../flows/editor-panels.ts";
import { FlowGraphPage } from "../flow-graph/FlowGraphPage.tsx";
import { GraphPanel } from "../flow-graph/GraphPanel.tsx";
import { GRAPH_PANEL } from "../flow-graph/pages.ts";

registerEditorPanel({
  id: GRAPH_PANEL.id,
  title: GRAPH_PANEL.title,
  render: (context) => <GraphPanel context={context} />,
});

export const feature: FeatureSpec = {
  id: "flow-graph",
  path: "/flows/:flowId/graph",
  element: <FlowGraphPage />,
};
