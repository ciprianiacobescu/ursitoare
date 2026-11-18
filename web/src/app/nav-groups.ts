// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CapabilityState } from "../kit/capabilities.ts";
import type { NavItem } from "./features.ts";

export type NavGroupId = "home" | "build" | "admin" | "more";

export interface NavGroup {
  id: NavGroupId;
  label: string | null;
  items: NavItem[];
}

export const NAV_GROUP_OF: Readonly<Record<string, NavGroupId>> = {};

export const NAV_GROUP_LABELS: Readonly<Record<NavGroupId, string | null>> = {
  home: null,
  build: null,
  admin: null,
  more: null,
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
