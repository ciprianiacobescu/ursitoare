import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { RESERVED_ROOTS } from "../../src/api/index.ts";
import { REPO_ROOT, snapshotOf } from "./sources.ts";
import type { Snapshot, Violation } from "./sources.ts";
import { checkFeaturePaths, isReservedPath, routesOutsideReservedRoots } from "./web-routes.ts";

assert.equal(typeof isReservedPath, "function");
assert.equal(typeof routesOutsideReservedRoots, "function");
assert.equal(typeof checkFeaturePaths, "function");

const RESERVED_MESSAGE =
  "is under a reserved root: pick a web route outside /api, /auth, /.well-known, /hooks, /callbacks, /mcp and /health";
const UNKNOWN_MESSAGE =
  "the path of feature must be a string literal so the reserved-root test can read it";

function reserved(path: string): boolean {
  let result: boolean | undefined;
  assert.doesNotThrow(
    () => {
      result = isReservedPath(path);
    },
    `isReservedPath(${JSON.stringify(path)}) must not throw`,
  );
  assert.ok(result !== undefined, `isReservedPath(${JSON.stringify(path)}) must return a value`);
  return result;
}

function routesOutside(routes: readonly { method: string; url: string }[]): string[] {
  let result: string[] | undefined;
  assert.doesNotThrow(
    () => {
      result = routesOutsideReservedRoots(routes);
    },
    "routesOutsideReservedRoots must not throw",
  );
  assert.ok(result !== undefined, "routesOutsideReservedRoots must return a list");
  return result;
}

function featureViolations(snapshot: Snapshot): Violation[] {
  let result: Violation[] | undefined;
  assert.doesNotThrow(
    () => {
      result = checkFeaturePaths(snapshot);
    },
    "checkFeaturePaths must not throw",
  );
  assert.ok(Array.isArray(result), `checkFeaturePaths must return a list, got ${JSON.stringify(result)}`);
  return [...result].sort(
    (a, b) =>
      (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || a.line - b.line || (a.code < b.code ? -1 : 1),
  );
}

test("C-c2ccaff5 isReservedPath refuses every API and service root", () => {
  const reservedPaths = [
    "/api",
    "/api/v1/x",
    "/API/x",
    "/auth/oidc/login",
    "/auth/other",
    "/.well-known/x",
    "/hooks/abc",
    "/callbacks/delegate/1",
    "/mcp",
    "/mcp/x",
    "/health",
  ];
  for (const path of reservedPaths) {
    assert.equal(reserved(path), true, `isReservedPath(${JSON.stringify(path)})`);
  }

  const freePaths = ["/", "/flows", "/apis", "/authors", "/healthy", "/t/abc", "/runs/:id"];
  for (const path of freePaths) {
    assert.equal(reserved(path), false, `isReservedPath(${JSON.stringify(path)})`);
  }
});

test("C-79dbbb47 routesOutsideReservedRoots lists only public routes outside the roots", () => {
  const routes = [
    { method: "GET", url: "/api/v1/me" },
    { method: "GET", url: "/health" },
    { method: "POST", url: "/hooks/:id" },
    { method: "GET", url: "/*" },
    { method: "GET", url: "/flows" },
    { method: "POST", url: "/runs" },
  ];

  assert.deepEqual(routesOutside(routes), ["GET /flows", "POST /runs"]);
  assert.deepEqual(routesOutside([]), []);
});

test("C-b5956c2d checkFeaturePaths reads feature paths and reserves the service roots", () => {
  const snapshot = snapshotOf({
    "web/src/features/10-home.tsx": [
      'import type { FeatureSpec } from "../app/features.ts";',
      "",
      "export const feature = {",
      '  path: "/",',
      "} satisfies FeatureSpec;",
    ].join("\n"),
    "web/src/features/20-a.tsx": [
      'import type { FeatureSpec } from "../app/features.ts";',
      "",
      "export const feature: FeatureSpec = {",
      '  path: "/api/flows",',
      "};",
    ].join("\n"),
    "web/src/features/30-b.tsx": [
      'import type { FeatureSpec } from "../app/features.ts";',
      "",
      "export const feature = {",
      '  path: "/health",',
      "} as FeatureSpec;",
    ].join("\n"),
    "web/src/features/40-c.tsx": [
      'const base = "";',
      "export const feature: FeatureSpec = {",
      '  path: base + "/x",',
      "};",
    ].join("\n"),
    "web/src/features/readme.md": 'export const feature = { path: "/api" };\n',
  });

  assert.deepEqual(featureViolations(snapshot), [
    {
      code: "ARCH_WEB_PATH_RESERVED",
      file: "web/src/features/20-a.tsx",
      line: 4,
      message: `feature path /api/flows ${RESERVED_MESSAGE}`,
    },
    {
      code: "ARCH_WEB_PATH_RESERVED",
      file: "web/src/features/30-b.tsx",
      line: 4,
      message: `feature path /health ${RESERVED_MESSAGE}`,
    },
    {
      code: "ARCH_WEB_PATH_UNKNOWN",
      file: "web/src/features/40-c.tsx",
      line: 3,
      message: UNKNOWN_MESSAGE,
    },
  ]);

  const featuresDir = join(REPO_ROOT, "web", "src", "features");
  assert.ok(existsSync(featuresDir), "web/src/features exists");
  const realSnapshot: Snapshot = {
    files: readdirSync(featuresDir)
      .filter((name) => name.endsWith(".tsx"))
      .sort()
      .map((name) => ({
        path: `web/src/features/${name}`,
        text: readFileSync(join(featuresDir, name), "utf8"),
      })),
    srcDirs: [],
  };
  assert.deepEqual(featureViolations(realSnapshot), [], "the real web features use only web paths");

  for (const root of RESERVED_ROOTS) {
    const path = "/" + root.join("/");
    assert.equal(reserved(path), true, `RESERVED_ROOTS entry ${JSON.stringify(root)} is reserved`);
  }
});
