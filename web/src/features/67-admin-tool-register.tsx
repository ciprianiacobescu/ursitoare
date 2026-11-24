import type { FeatureSpec } from "../app/features.ts";
import { registerToolMessages } from "../tools/messages.ts";
import { RegisterPage } from "../tools/RegisterPage.tsx";

registerToolMessages();

export const feature: FeatureSpec = {
  id: "admin-tool-register",
  path: "/admin/tool-servers/new",
  capability: "register_tool_server",
  element: <RegisterPage />,
};
