/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const SERVERS_PAGE = new URL("./ServersPage.tsx", import.meta.url);
const BROWSER_TEST = new URL("../../../e2e/test_server_list_reload.py", import.meta.url);

function read(url: URL): string {
  return readFileSync(url, "utf8");
}

test("C-44e0e2c0 the server list is rebuilt on reload after approve replace and discovery", () => {
  const page = read(SERVERS_PAGE);
  const start = page.indexOf("const servers = useMemo(");
  assert.ok(start >= 0, "ServersPage builds the server list with useMemo");
  const end = page.indexOf("\n  );", start);
  assert.ok(end > start, "the server list useMemo ends");
  const block = page.slice(start, end);
  const deps = /,\s*\[([^\]]*)\]\s*,?\s*$/.exec(block);
  const rebuiltOnKey = deps !== null && (deps[1] ?? "").trim() !== "";
  const reloadedExplicitly = /servers\.(?:reset|load)\(/.test(page);
  assert.ok(
    rebuiltOnKey || reloadedExplicitly,
    "the server list is rebuilt or reloaded after an action succeeds",
  );

  const browser = read(BROWSER_TEST);
  assert.ok(
    browser.includes('@pytest.mark.l4("C-44e0e2c0")'),
    "the browser test carries the criterion",
  );
  for (const action of ["Approve surface", "Replace document", "Discover tools"]) {
    assert.ok(browser.includes(action), `the browser test covers ${action}`);
  }
  assert.ok(browser.includes("Tool servers"), "the browser test reads the server list");
});
