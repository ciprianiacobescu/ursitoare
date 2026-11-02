import type { FeatureSpec } from "../app/features.ts";
import { FlowEditorPage } from "../flows/FlowEditorPage.tsx";

export const feature: FeatureSpec = {
  id: "flow-editor",
  path: "/flows/:flowId",
  element: <FlowEditorPage />,
};
