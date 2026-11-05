import type { FeatureSpec } from "../app/features.ts";
import { RunPage } from "../runs/RunPage.tsx";

export const feature: FeatureSpec = {
  id: "run",
  path: "/runs/:runId",
  element: <RunPage />,
};
