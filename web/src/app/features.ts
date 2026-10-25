// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { ReactNode } from "react";

export const RESERVED_ROOTS: readonly (readonly string[])[] = [];

export interface FeatureSpec {
  id: string;
  path: string;
  navLabel?: string;
  capability?: string;
  element: ReactNode;
}

export type Feature = Readonly<FeatureSpec>;

export interface NavItem {
  id: string;
  path: string;
  label: string;
}

export type FeatureErrorCode = "FEATURE_INVALID" | "FEATURE_DUPLICATE_ID" | "FEATURE_DUPLICATE_PATH" | "FEATURE_PATH_RESERVED";

export class FeatureError extends Error {
  readonly code: FeatureErrorCode;
  constructor(_code: FeatureErrorCode, _message: string) {
    super();
    throw new Error("not implemented");
  }
}

export interface FeatureRegistry {
  register(spec: FeatureSpec): void;
  list(): readonly Feature[];
  nav(capabilities?: ReadonlySet<string>): NavItem[];
}

export function createFeatureRegistry(): FeatureRegistry {
  throw new Error("not implemented");
}

export function registerFeature(_spec: FeatureSpec): void {
  throw new Error("not implemented");
}

export function listFeatures(): readonly Feature[] {
  throw new Error("not implemented");
}

export function navItems(_capabilities?: ReadonlySet<string>): NavItem[] {
  throw new Error("not implemented");
}
