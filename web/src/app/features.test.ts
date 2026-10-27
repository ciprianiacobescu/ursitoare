/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FeatureError,
  createFeatureRegistry,
  listFeatures,
  navItems,
  registerFeature,
} from "./features.ts";
import type { FeatureErrorCode, FeatureRegistry, FeatureSpec, NavItem } from "./features.ts";

assert.equal(typeof createFeatureRegistry, "function");

function makeRegistry(): FeatureRegistry {
  let registry: FeatureRegistry | undefined;
  assert.doesNotThrow(
    () => {
      registry = createFeatureRegistry();
    },
    "createFeatureRegistry must return a registry",
  );
  assert.ok(registry !== undefined, "createFeatureRegistry returned a registry");
  return registry;
}

function register(registry: FeatureRegistry, spec: FeatureSpec): void {
  assert.doesNotThrow(
    () => {
      registry.register(spec);
    },
    `register(${spec.id}) must succeed`,
  );
}

function list(registry: FeatureRegistry): readonly FeatureSpec[] {
  let features: readonly FeatureSpec[] | undefined;
  assert.doesNotThrow(
    () => {
      features = registry.list();
    },
    "list must return the features",
  );
  assert.ok(features !== undefined, "list returned features");
  return features;
}

function listIds(registry: FeatureRegistry): string[] {
  return list(registry).map((feature) => feature.id);
}

function nav(registry: FeatureRegistry, capabilities?: ReadonlySet<string>): NavItem[] {
  let items: NavItem[] | undefined;
  assert.doesNotThrow(
    () => {
      items = capabilities === undefined ? registry.nav() : registry.nav(capabilities);
    },
    "nav must return the navigation",
  );
  assert.ok(items !== undefined, "nav returned items");
  return items;
}

function refusal(registry: FeatureRegistry, spec: FeatureSpec): unknown {
  try {
    registry.register(spec);
  } catch (error) {
    return error;
  }
  return undefined;
}

test("C-0a8a6d93 the registry keeps registration order and filters the nav by capability", () => {
  const registry = makeRegistry();
  assert.deepEqual(list(registry), [], "a new registry is empty");
  assert.deepEqual(nav(registry), [], "a new registry has no navigation");

  register(registry, { id: "a", path: "/a", navLabel: "A", element: null });
  register(registry, { id: "b", path: "/b", element: null });
  register(registry, { id: "c", path: "/c", navLabel: "C", capability: "flows.read", element: null });
  register(registry, { id: "d", path: "/d/:id", element: null });

  assert.deepEqual(listIds(registry), ["a", "b", "c", "d"]);
  assert.deepEqual(nav(registry), [{ id: "a", path: "/a", label: "A" }]);
  assert.deepEqual(nav(registry, new Set(["flows.read"])), [
    { id: "a", path: "/a", label: "A" },
    { id: "c", path: "/c", label: "C" },
  ]);

  const listed = list(registry) as FeatureSpec[];
  listed.push({ id: "z", path: "/z", element: null });
  assert.deepEqual(listIds(registry), ["a", "b", "c", "d"], "the returned list is a copy");
});

test("C-0a8a6d93 the default registry holds registered features and exposes them by list and nav", () => {
  assert.doesNotThrow(
    () => {
      registerFeature({ id: "default-home", path: "/", navLabel: "Home", element: null });
    },
    "registerFeature must succeed",
  );

  const features = listFeatures();
  assert.ok(
    features.some((feature) => feature.id === "default-home"),
    "listFeatures contains the registered feature",
  );
  assert.deepEqual(navItems(), [{ id: "default-home", path: "/", label: "Home" }]);
});

test("C-5e6db9ca the registry refuses duplicate reserved and invalid features", () => {
  const registry = makeRegistry();
  register(registry, { id: "a", path: "/a", element: null });
  register(registry, { id: "r", path: "/runs/:runId", element: null });

  const cases: { readonly label: string; readonly spec: FeatureSpec; readonly code: FeatureErrorCode }[] = [
    { label: "repeated id", spec: { id: "a", path: "/other", element: null }, code: "FEATURE_DUPLICATE_ID" },
    { label: "path /A after /a", spec: { id: "upper", path: "/A", element: null }, code: "FEATURE_DUPLICATE_PATH" },
    {
      label: "path /runs/:id after /runs/:runId",
      spec: { id: "r2", path: "/runs/:id", element: null },
      code: "FEATURE_DUPLICATE_PATH",
    },
    { label: "path /api/v1", spec: { id: "api", path: "/api/v1", element: null }, code: "FEATURE_PATH_RESERVED" },
    {
      label: "path /auth/oidc/x",
      spec: { id: "oidc", path: "/auth/oidc/x", element: null },
      code: "FEATURE_PATH_RESERVED",
    },
    {
      label: "path /.well-known/x",
      spec: { id: "well-known", path: "/.well-known/x", element: null },
      code: "FEATURE_PATH_RESERVED",
    },
    { label: "path without a slash", spec: { id: "flows", path: "flows", element: null }, code: "FEATURE_INVALID" },
    { label: "path with a trailing slash", spec: { id: "trailing", path: "/a/", element: null }, code: "FEATURE_INVALID" },
    { label: "path with a query", spec: { id: "query", path: "/x?y", element: null }, code: "FEATURE_INVALID" },
    { label: "path with a dot", spec: { id: "dot", path: "/r.json", element: null }, code: "FEATURE_INVALID" },
    { label: "hidden path", spec: { id: "hidden", path: "/.x", element: null }, code: "FEATURE_INVALID" },
    { label: "id with a space", spec: { id: "Bad Id", path: "/bad", element: null }, code: "FEATURE_INVALID" },
    {
      label: "nav label too long",
      spec: { id: "long-label", path: "/long", navLabel: "a".repeat(41), element: null },
      code: "FEATURE_INVALID",
    },
    {
      label: "nav label on a parameter path",
      spec: { id: "parameter", path: "/p/:id", navLabel: "P", element: null },
      code: "FEATURE_INVALID",
    },
    { label: "missing element", spec: { id: "no-element", path: "/no-element", element: undefined }, code: "FEATURE_INVALID" },
  ];

  for (const { label, spec, code } of cases) {
    const error = refusal(registry, spec);
    assert.ok(error instanceof FeatureError, `${label} throws FeatureError`);
    assert.equal(error.code, code, `${label} has the expected code`);
  }

  assert.deepEqual(listIds(registry), ["a", "r"], "a refused feature leaves the registry unchanged");
});

test("C-5752eaaf reserved roots match whole segments only", () => {
  const registry = makeRegistry();
  register(registry, { id: "apis", path: "/apis", element: null });
  register(registry, { id: "healthz", path: "/healthz", element: null });
  register(registry, { id: "auth", path: "/auth", element: null });
  register(registry, { id: "other", path: "/auth/other", element: null });

  assert.deepEqual(listIds(registry), ["apis", "healthz", "auth", "other"]);
});
