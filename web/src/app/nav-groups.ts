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

const GROUP_ORDER: readonly NavGroupId[] = ["home", "build", "admin", "more"];

export function navGroups(items: readonly NavItem[]): NavGroup[] {
  const buckets: Record<NavGroupId, NavItem[]> = { home: [], build: [], admin: [], more: [] };
  for (const item of items) {
    const id = Object.hasOwn(NAV_GROUP_OF, item.id) ? NAV_GROUP_OF[item.id] : undefined;
    buckets[id ?? "more"].push(item);
  }
  const groups: NavGroup[] = [];
  for (const id of GROUP_ORDER) {
    if (buckets[id].length > 0) groups.push({ id, label: NAV_GROUP_LABELS[id], items: buckets[id] });
  }
  return groups;
}

export function shellLayout(widthPx: number): "sidebar" | "collapsed" {
  return widthPx >= 1024 ? "sidebar" : "collapsed";
}

export function navPlacement(_state: CapabilityState | null): "sidebar" | "inline" {
  throw new Error("not implemented");
}
