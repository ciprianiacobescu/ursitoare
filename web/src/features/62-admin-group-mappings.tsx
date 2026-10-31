import type { FeatureSpec } from "../app/features.ts";
import { registerAdminMessages } from "../admin/messages.ts";
import { MappingsPage } from "../admin/MappingsPage.tsx";

registerAdminMessages();

export const feature: FeatureSpec = {
  id: "admin-group-mappings",
  path: "/admin/group-mappings",
  navLabel: "Group mappings",
  capability: "manage_users_roles",
  element: <MappingsPage />,
};
