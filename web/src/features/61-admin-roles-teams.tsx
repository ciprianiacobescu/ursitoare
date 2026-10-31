import type { FeatureSpec } from "../app/features.ts";
import { registerAdminMessages } from "../admin/messages.ts";
import { TeamsPage } from "../admin/TeamsPage.tsx";

registerAdminMessages();

export const feature: FeatureSpec = {
  id: "admin-roles-teams",
  path: "/admin/roles-and-teams",
  navLabel: "Roles and teams",
  capability: "manage_users_roles",
  element: <TeamsPage />,
};
