import type { FeatureSpec } from "../app/features.ts";
import { registerToolMessages } from "../tools/messages.ts";
import { PoliciesPage } from "../tools/PoliciesPage.tsx";

registerToolMessages();

export const feature: FeatureSpec = {
  id: "admin-policies",
  path: "/admin/policies",
  navLabel: "Policies",
  capability: "deploy_policy",
  element: <PoliciesPage />,
};
