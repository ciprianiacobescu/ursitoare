import type { FeatureSpec } from "../app/features.ts";
import { registerToolMessages } from "../tools/messages.ts";
import { ServersPage } from "../tools/ServersPage.tsx";

registerToolMessages();

export const feature: FeatureSpec = {
  id: "admin-tool-servers",
  path: "/admin/tool-servers",
  navLabel: "Tool servers",
  capability: "register_tool_server",
  element: <ServersPage />,
};
