import type { FeatureSpec } from "../app/features.ts";
import { FlowsPage } from "../flows/FlowsPage.tsx";

export const feature: FeatureSpec = {
  id: "flows",
  path: "/flows",
  navLabel: "Flows",
  capability: "read_flow",
  element: <FlowsPage />,
};
