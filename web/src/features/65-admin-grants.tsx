import type { FeatureSpec } from "../app/features.ts";
import { registerToolMessages } from "../tools/messages.ts";
import { GrantsPage } from "../tools/GrantsPage.tsx";

registerToolMessages();

export const feature: FeatureSpec = {
  id: "admin-grants",
  path: "/admin/grants",
  navLabel: "Grants",
  capability: "deploy_policy",
  element: <GrantsPage />,
};
