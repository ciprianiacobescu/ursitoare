import type { FeatureSpec } from "../app/features.ts";
import { registerAdminMessages } from "../admin/messages.ts";
import { AuditPage } from "../admin/AuditPage.tsx";

registerAdminMessages();

export const feature: FeatureSpec = {
  id: "admin-audit",
  path: "/admin/audit",
  navLabel: "Audit log",
  capability: "read_audit",
  element: <AuditPage />,
};
