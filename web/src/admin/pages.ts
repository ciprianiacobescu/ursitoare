// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DataTableSpec } from "../kit/data/data-table.ts";

export interface AdminPage {
  id: string;
  file: string;
  path: string;
  navLabel: string;
  capability: "manage_users_roles" | "read_audit";
}

export const ADMIN_PAGES: readonly AdminPage[] = [];

export type AdminTables = Readonly<
  Record<"users" | "roles" | "teams" | "mappings" | "audit", DataTableSpec>
>;

export const ADMIN_TABLES: AdminTables = {
  users: { caption: "", columns: [] },
  roles: { caption: "", columns: [] },
  teams: { caption: "", columns: [] },
  mappings: { caption: "", columns: [] },
  audit: { caption: "", columns: [] },
};

export interface FeatureLiterals {
  id: string;
  path: string;
  navLabel: string;
  capability: string;
}

export function featureLiterals(_source: string): FeatureLiterals | null {
  throw new Error("not implemented");
}
