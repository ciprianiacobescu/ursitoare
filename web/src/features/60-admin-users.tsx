import type { FeatureSpec } from "../app/features.ts";
import { registerAdminMessages } from "../admin/messages.ts";
import { UsersPage } from "../admin/UsersPage.tsx";

registerAdminMessages();

export const feature: FeatureSpec = {
  id: "admin-users",
  path: "/admin/users",
  navLabel: "Users",
  capability: "manage_users_roles",
  element: <UsersPage />,
};
