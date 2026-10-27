// Feature registry (openspec change add-web-shell, task 6.2): routes and navigation in one place.
import type { ReactNode } from "react";

export const RESERVED_ROOTS: readonly (readonly string[])[] = [
  ["api"],
  ["health"],
  ["auth", "oidc"],
  [".well-known"],
  ["hooks"],
  ["callbacks"],
  ["mcp"],
];

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
  constructor(code: FeatureErrorCode, message: string) {
    super(message);
    this.name = "FeatureError";
    this.code = code;
  }
}

export interface FeatureRegistry {
  register(spec: FeatureSpec): void;
  list(): readonly Feature[];
  nav(capabilities?: ReadonlySet<string>): NavItem[];
}

const ID_PATTERN = /^[a-z][a-z0-9-]{0,39}$/;
const SEGMENT_PATTERN = /^[A-Za-z0-9_~-]+$/;
const PARAM_PATTERN = /^:[A-Za-z_][A-Za-z0-9_]*$/;
const CAPABILITY_PATTERN = /^[a-z][a-z0-9_.:-]{0,63}$/;

interface ParsedPath {
  readonly normalized: string;
  readonly dynamic: boolean;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function isReserved(segments: readonly string[]): boolean {
  const lower = segments.map((segment) => segment.toLowerCase());
  return RESERVED_ROOTS.some((root) => root.every((part, index) => lower[index] === part));
}

function parsePath(path: string): ParsedPath | "reserved" | undefined {
  if (!path.startsWith("/")) {
    return undefined;
  }

  const reservedSegments = path.split("/").filter((segment) => segment !== "");
  if (isReserved(reservedSegments)) {
    return "reserved";
  }

  if (path === "/") {
    return { normalized: "/", dynamic: false };
  }

  const parts = path.slice(1).split("/");
  const wildcard = parts[parts.length - 1] === "*";
  if (wildcard) {
    parts.pop();
  }
  if (!wildcard && parts.length === 0) {
    return undefined;
  }
  if (parts.some((part) => part === "")) {
    return undefined;
  }

  let dynamic = wildcard;
  const normalizedParts: string[] = [];
  for (const part of parts) {
    if (PARAM_PATTERN.test(part)) {
      dynamic = true;
      normalizedParts.push(":");
      continue;
    }
    if (!SEGMENT_PATTERN.test(part)) {
      return undefined;
    }
    normalizedParts.push(part.toLowerCase());
  }

  const normalized = normalizedParts.length === 0 ? "/*" : `/${normalizedParts.join("/")}${wildcard ? "/*" : ""}`;
  return { normalized, dynamic };
}

interface ValidatedFeature {
  readonly feature: Feature;
  readonly normalizedPath: string;
}

function validateFeature(spec: FeatureSpec): ValidatedFeature {
  if (typeof spec.id !== "string" || !ID_PATTERN.test(spec.id)) {
    throw new FeatureError("FEATURE_INVALID", `invalid feature id: ${String(spec.id)}`);
  }

  const parsed = typeof spec.path === "string" ? parsePath(spec.path) : undefined;
  if (parsed === "reserved") {
    throw new FeatureError("FEATURE_PATH_RESERVED", `feature path is reserved: ${spec.path}`);
  }
  if (parsed === undefined) {
    throw new FeatureError("FEATURE_INVALID", `invalid feature path: ${String(spec.path)}`);
  }

  if (spec.navLabel !== undefined) {
    if (
      typeof spec.navLabel !== "string" ||
      spec.navLabel.length < 1 ||
      spec.navLabel.length > 40 ||
      hasControlCharacter(spec.navLabel) ||
      parsed.dynamic
    ) {
      throw new FeatureError("FEATURE_INVALID", `invalid nav label for feature: ${spec.id}`);
    }
  }

  if (spec.capability !== undefined && (typeof spec.capability !== "string" || !CAPABILITY_PATTERN.test(spec.capability))) {
    throw new FeatureError("FEATURE_INVALID", `invalid capability for feature: ${spec.id}`);
  }

  if (spec.element === undefined) {
    throw new FeatureError("FEATURE_INVALID", `feature element is undefined: ${spec.id}`);
  }

  return { feature: { ...spec }, normalizedPath: parsed.normalized };
}

export function createFeatureRegistry(): FeatureRegistry {
  const features: Feature[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();

  return {
    register(spec: FeatureSpec): void {
      const { feature, normalizedPath } = validateFeature(spec);
      if (ids.has(feature.id)) {
        throw new FeatureError("FEATURE_DUPLICATE_ID", `duplicate feature id: ${feature.id}`);
      }
      if (paths.has(normalizedPath)) {
        throw new FeatureError("FEATURE_DUPLICATE_PATH", `duplicate feature path: ${feature.path}`);
      }
      ids.add(feature.id);
      paths.add(normalizedPath);
      features.push(feature);
    },
    list(): readonly Feature[] {
      return features.slice();
    },
    nav(capabilities: ReadonlySet<string> = new Set()): NavItem[] {
      const items: NavItem[] = [];
      for (const feature of features) {
        if (feature.navLabel === undefined) {
          continue;
        }
        if (feature.capability !== undefined && !capabilities.has(feature.capability)) {
          continue;
        }
        items.push({ id: feature.id, path: feature.path, label: feature.navLabel });
      }
      return items;
    },
  };
}

const defaultRegistry = createFeatureRegistry();

export function registerFeature(spec: FeatureSpec): void {
  defaultRegistry.register(spec);
}

export function listFeatures(): readonly Feature[] {
  return defaultRegistry.list();
}

export function navItems(capabilities?: ReadonlySet<string>): NavItem[] {
  return capabilities === undefined ? defaultRegistry.nav() : defaultRegistry.nav(capabilities);
}
