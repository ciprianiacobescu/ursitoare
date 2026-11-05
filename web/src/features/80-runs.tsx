import type { FeatureSpec } from "../app/features.ts";
import { registerEditorPanel } from "../flows/editor-panels.ts";
import { RunsPage } from "../runs/RunsPage.tsx";
import { TestRunPanel } from "../runs/TestRunPanel.tsx";
import { registerRunMessages } from "../runs/messages.ts";
import { TEST_RUN_PANEL } from "../runs/pages.ts";

registerRunMessages();

registerEditorPanel({
  id: TEST_RUN_PANEL.id,
  title: TEST_RUN_PANEL.title,
  render: (context) => <TestRunPanel context={context} />,
});

export const feature: FeatureSpec = {
  id: "runs",
  path: "/runs",
  navLabel: "Runs",
  capability: "read_run",
  element: <RunsPage />,
};
