// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DataTableSpec } from "../kit/data/data-table.ts";

export interface AdminPage {
  id: string;
  file: string;
  path: string;
  navLabel: string;
  capability: "manage_users_roles" | "read_audit";
}

export const ADMIN_PAGES: readonly AdminPage[] = [
  {
    id: "admin-users",
    file: "60-admin-users.tsx",
    path: "/admin/users",
    navLabel: "Users",
    capability: "manage_users_roles",
  },
  {
    id: "admin-roles-teams",
    file: "61-admin-roles-teams.tsx",
    path: "/admin/roles-and-teams",
    navLabel: "Roles and teams",
    capability: "manage_users_roles",
  },
  {
    id: "admin-group-mappings",
    file: "62-admin-group-mappings.tsx",
    path: "/admin/group-mappings",
    navLabel: "Group mappings",
    capability: "manage_users_roles",
  },
  {
    id: "admin-audit",
    file: "63-admin-audit.tsx",
    path: "/admin/audit",
    navLabel: "Audit log",
    capability: "read_audit",
  },
];

export type AdminTables = Readonly<
  Record<"users" | "roles" | "teams" | "mappings" | "audit", DataTableSpec>
>;

export const ADMIN_TABLES: AdminTables = {
  users: {
    caption: "Users",
    columns: [
      { key: "name", header: "Name", rowHeader: true },
      { key: "email", header: "Email" },
      { key: "state", header: "State" },
      { key: "rolesTeams", header: "Roles and teams" },
      { key: "actions", header: "Actions" },
    ],
    emptyTitle: "No users yet",
    emptyDescription: "People appear here after they first sign in.",
  },
  roles: {
    caption: "Roles",
    columns: [{ key: "role", header: "Role", rowHeader: true }],
    emptyTitle: "No roles",
  },
  teams: {
    caption: "Teams",
    columns: [
      { key: "team", header: "Team", rowHeader: true },
      { key: "actions", header: "Actions" },
    ],
    emptyTitle: "No teams yet",
  },
  mappings: {
    caption: "Group mappings",
    columns: [
      { key: "group", header: "Group", rowHeader: true },
      { key: "grants", header: "Grants" },
      { key: "issuer", header: "Issuer" },
      { key: "reviewedBy", header: "Reviewed by" },
      { key: "actions", header: "Actions" },
    ],
    emptyTitle: "No group mappings",
    emptyDescription: "Map a group so its members get access when they sign in.",
  },
  audit: {
    caption: "Audit events",
    columns: [
      { key: "seq", header: "Number", rowHeader: true },
      { key: "time", header: "Time (UTC)" },
      { key: "type", header: "Type" },
      { key: "actor", header: "Actor" },
      { key: "target", header: "Target" },
      { key: "details", header: "Details" },
    ],
    emptyTitle: "No events",
  },
};

export interface FeatureLiterals {
  id: string;
  path: string;
  navLabel: string;
  capability: string;
}

const FEATURE_MARKER = "export const feature";
const FIELD_PATTERN = /\b(id|path|navLabel|capability):\s*"([^"\\]*)"/g;

export function featureLiterals(source: string): FeatureLiterals | null {
  const marker = source.indexOf(FEATURE_MARKER);
  if (marker < 0) {
    return null;
  }

  const fields = new Map<string, string>();
  for (const match of source.slice(marker).matchAll(FIELD_PATTERN)) {
    const key = match[1];
    const value = match[2];
    if (key !== undefined && value !== undefined && !fields.has(key)) {
      fields.set(key, value);
    }
  }

  const id = fields.get("id");
  const path = fields.get("path");
  const navLabel = fields.get("navLabel");
  const capability = fields.get("capability");
  if (id === undefined || path === undefined || navLabel === undefined || capability === undefined) {
    return null;
  }
  return { id, path, navLabel, capability };
}
