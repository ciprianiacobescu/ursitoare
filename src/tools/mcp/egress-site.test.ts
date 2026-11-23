import assert from "node:assert/strict";
import { test } from "node:test";

import { checkEgressSites } from "../../../test/arch/egress-sites.ts";
import { readSnapshot } from "../../../test/arch/sources.ts";

const THREE = ["src/credentials/vault-call.ts", "src/main.ts", "src/runtimes/invoke/request.ts"];
const FOUR = [...THREE, "src/tools/mcp/discover.ts"];

test("C-dbc74b9d discover ts is the one MCP egress site and the four path inventory is clean", () => {
  const violations = checkEgressSites(readSnapshot(), THREE);
  assert.deepEqual(violations, [
    {
      code: "ARCH_EGRESS_SITE",
      file: "src/tools/mcp/discover.ts",
      line: violations[0]?.line ?? 0,
      message:
        "src/tools/mcp/discover.ts imports the gateway; add it to the egress-site inventory in test/arch/egress-sites.test.ts with the policy check it follows",
    },
  ]);
  assert.deepEqual(checkEgressSites(readSnapshot(), FOUR), []);
});

test("C-2a04f1cb the four path inventory keeps request ts the only runtimes site", () => {
  const violations = checkEgressSites(readSnapshot(), ["src/credentials/vault-call.ts", "src/main.ts"]).filter(
    (v) => v.file.startsWith("src/runtimes/"),
  );
  assert.deepEqual(
    violations.map((v) => [v.code, v.file]),
    [["ARCH_EGRESS_SITE", "src/runtimes/invoke/request.ts"]],
  );
  assert.deepEqual(checkEgressSites(readSnapshot(), FOUR), []);
});
