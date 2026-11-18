import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import { findBannedImports, findCssImports, findPaletteUtilities } from "./rules.ts";

const SRC = fileURLToPath(new URL("..", import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")) out.push(path);
  }
  return out.sort();
}

const TASK_FILES = [
  "kit/data/DataTable.tsx",
  "kit/data/Field.tsx",
  "kit/data/Form.tsx",
  "kit/data/SchemaForm.tsx",
  "auth/AccountMenu.tsx",
  "auth/SignInPage.tsx",
  "admin/AuditPage.tsx",
  "admin/MappingsPage.tsx",
  "admin/TeamsPage.tsx",
  "admin/UsersPage.tsx",
  "flows/FlowEditorPage.tsx",
  "flows/FlowsPage.tsx",
  "flow-graph/FlowGraphView.tsx",
  "runs/DryRunPanel.tsx",
  "runs/TestRunPanel.tsx",
  "runs/RunsPage.tsx",
  "runs/RunPage.tsx",
  "tools/GrantsPage.tsx",
  "tools/PoliciesPage.tsx",
  "tools/ServersPage.tsx",
];

test("C-d3240b20 the real tree has one stylesheet import and no banned or palette hit", () => {
  assert.equal(typeof findCssImports, "function");
  const files = walk(SRC);
  assert.ok(files.length >= 100, `found ${files.length} files`);
  const cssHits: string[] = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const hit of findCssImports(source)) cssHits.push(`${file.slice(SRC.length)}: ${hit.text}`);
    assert.deepEqual(findBannedImports(source), [], `banned import in ${file}`);
    assert.deepEqual(findPaletteUtilities(source), [], `palette utility in ${file}`);
  }
  assert.deepEqual(cssHits, ['main.tsx: import "./styles/app.css";']);
});

test("C-d3240b20 rules.ts scans itself clean and 20 files keep no stylesheet import", () => {
  const own = readFileSync(join(SRC, "ui/rules.ts"), "utf8");
  assert.deepEqual(findCssImports(own), []);
  assert.deepEqual(findBannedImports(own), []);
  assert.deepEqual(findPaletteUtilities(own), []);
  const left: string[] = [];
  for (const rel of TASK_FILES) {
    for (const hit of findCssImports(readFileSync(join(SRC, rel), "utf8"))) left.push(`${rel}: ${hit.text}`);
  }
  assert.deepEqual(left, []);
});
