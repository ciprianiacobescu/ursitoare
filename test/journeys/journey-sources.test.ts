import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const PYTHON_FILE = "e2e/test_m7_tools.py";
const NODE_FILE = "test/journeys/m7-tools.test.ts";

const PYTHON_REQUIRED: readonly string[] = [
  '@pytest.mark.milestone("M7")',
  "set_viewport_size(",
  "watch_csp(",
  "assert_layout(",
  "assert_accessible(",
  "exact=True",
  "browser.new_context(",
  "def test_carol_sets_up_three_servers_and_alice_dry_runs",
];
const PYTHON_FORBIDDEN: readonly string[] = [
  "pytest.skip",
  "xfail",
  "skipif",
  "time.sleep",
  "page.wait_for_timeout",
];
const NODE_REQUIRED: readonly string[] = [
  "startE2eStack(",
  '"mcp"',
  '"tool-servers"',
  "mcpApi(",
  "toolsApi(",
  "egressApi(",
  "demo-live",
];
const NODE_FORBIDDEN: readonly string[] = [".skip(", ".todo("];

function check(required: readonly string[], forbidden: readonly string[], text: string): string[] {
  const problems: string[] = [];
  for (const token of required) {
    if (!text.includes(token)) problems.push(`missing ${token}`);
  }
  for (const token of forbidden) {
    if (text.includes(token)) problems.push(`forbidden ${token}`);
  }
  return problems;
}

function read(file: string): string {
  let text = "";
  assert.doesNotThrow(() => {
    text = readFileSync(file, "utf8");
  });
  return text;
}

function checkPython(text: string): string[] {
  return check(PYTHON_REQUIRED, PYTHON_FORBIDDEN, text);
}

function checkNode(text: string): string[] {
  return check(NODE_REQUIRED, NODE_FORBIDDEN, text);
}

test("C-a147034b the browser journey source holds the rules", () => {
  const text = read(PYTHON_FILE);
  assert.ok(text.length > 0);
  assert.deepEqual(checkPython(text), []);
});

test("C-a147034b the Node journey source holds the rules", () => {
  const text = read(NODE_FILE);
  assert.ok(text.length > 0);
  assert.deepEqual(checkNode(text), []);
});

test("C-a147034b four mutated copies each give one problem", () => {
  const python = read(PYTHON_FILE);
  const node = read(NODE_FILE);
  assert.ok(python.length > 0 && node.length > 0);
  assert.equal(checkPython(python.replaceAll("watch_csp(", "watch_css(")).length, 1);
  assert.equal(checkPython(`${python}\npytest.skip("later")\n`).length, 1);
  assert.equal(checkNode(node.replaceAll('"mcp"', '"mcq"')).length, 1);
  assert.equal(checkNode(`${node}\ntest.skip("later");\n`).length, 1);
});
