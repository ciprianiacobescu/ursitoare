import assert from "node:assert/strict";
import { test } from "node:test";

import { checkEgressSites } from "../../test/arch/egress-sites.ts";
import { readSnapshot } from "../../test/arch/sources.ts";

assert.equal(typeof checkEgressSites, "function");

test("C-0c230dcb the credentials module is one inventoried egress site", () => {
  const violations = checkEgressSites(readSnapshot(), ["src/main.ts"]).filter((v) =>
    v.file.startsWith("src/credentials/"),
  );
  assert.deepEqual(violations, [
    {
      code: "ARCH_EGRESS_SITE",
      file: "src/credentials/vault-call.ts",
      line: violations[0]?.line ?? 0,
      message:
        "src/credentials/vault-call.ts imports the gateway; add it to the egress-site inventory in test/arch/egress-sites.test.ts with the policy check it follows",
    },
  ]);
  assert.deepEqual(checkEgressSites(readSnapshot(), ["src/credentials/vault-call.ts", "src/main.ts"]), []);
});
