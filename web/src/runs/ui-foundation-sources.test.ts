import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findCssImports } from "../ui/rules.ts";

const read = (name: string): string => readFileSync(new URL(name, import.meta.url), "utf8");

test("C-f357664d the run sources import no stylesheet and the feature files stay", () => {
  assert.equal(typeof findCssImports, "function");
  for (const name of ["DryRunPanel.tsx", "RunPage.tsx", "../features/80-runs.tsx"]) {
    assert.deepEqual(findCssImports(read(name)), [], name);
  }
  const files = readdirSync(new URL("../features/", import.meta.url));
  for (const expected of [
    "10-home.tsx",
    "15-sign-in.tsx",
    "60-admin-users.tsx",
    "61-admin-roles-teams.tsx",
    "62-admin-group-mappings.tsx",
    "63-admin-audit.tsx",
    "64-admin-tool-servers.tsx",
    "65-admin-grants.tsx",
    "66-admin-policies.tsx",
    "70-flows.tsx",
    "71-flow-editor.tsx",
    "75-flow-graph.tsx",
    "80-runs.tsx",
    "81-run.tsx",
    "index.ts",
  ]) {
    assert.ok(files.includes(expected), `missing ${expected}`);
  }
  assert.deepEqual(
    files.filter((f) => f.endsWith(".css")),
    [],
  );
});
