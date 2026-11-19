// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CapabilityState } from "../kit/capabilities.ts";
import type { NavItem } from "./features.ts";

export type NavGroupId = "home" | "build" | "admin" | "more";

export interface NavGroup {
  id: NavGroupId;
  label: string | null;
  items: NavItem[];
}

export const NAV_GROUP_OF: Readonly<Record<string, NavGroupId>> = {
  home: "home",
  flows: "build",
  runs: "build",
  "admin-users": "admin",
  "admin-roles-teams": "admin",
  "admin-group-mappings": "admin",
  "admin-audit": "admin",
  "admin-tool-servers": "admin",
  "admin-grants": "admin",
  "admin-policies": "admin",
};

export const NAV_GROUP_LABELS: Readonly<Record<NavGroupId, string | null>> = {
  home: null,
  build: "Build",
  admin: "Admin",
  more: "More",
};

export function navGroups(_items: readonly NavItem[]): NavGroup[] {
  return [];
}

export function shellLayout(_widthPx: number): "sidebar" | "collapsed" {
  return "collapsed";
}

export function navPlacement(_state: CapabilityState | null): "sidebar" | "inline" {
  throw new Error("not implemented");
}
