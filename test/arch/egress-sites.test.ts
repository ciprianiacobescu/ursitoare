// Architecture test of the egress-site rule: only inventoried files import the gateway.
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkEgressSites } from "./egress-sites.ts";
import { readSnapshot, snapshotOf, type Violation } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

function egressViolation(file: string, line: number, message: string): Violation {
  return { code: "ARCH_EGRESS_SITE", file, line, message };
}

function importedMessage(file: string): string {
  return `${file} imports the gateway; add it to the egress-site inventory in test/arch/egress-sites.test.ts with the policy check it follows`;
}

function missingMessage(file: string): string {
  return `${file} is in the egress-site inventory but imports no gateway; remove it`;
}

const RULE_FIXTURES: Readonly<Record<string, string>> = {
  "src/main.ts": 'import { createGateway } from "./gateway/index.ts";\n',
  "src/tools/rogue.ts":
    'import { createGateway } from "../gateway/index.ts";\nimport type { Gateway } from "../gateway/index.ts";\nexport { bodyDigest } from "../gateway/index.ts";\n',
  "src/api/typed.ts":
    'import type { Gateway } from "../gateway/index.ts";\nexport type { GatewayError } from "../gateway/index.ts";\nimport { type CallTag } from "../gateway/index.ts";\n',
  "src/api/late.ts": 'const m = await import("../gateway/index.ts");\n',
  "src/tools/rogue.test.ts": 'import { createGateway } from "../gateway/index.ts";\n',
  "src/gateway/client.ts": 'import { bodyDigest } from "./index.ts";\n',
  "src/api/other.ts": 'import { bodyDigest } from "../gateway/types.ts";\n',
  "src/credentials/gone.ts": 'import { createPdp } from "../pdp/index.ts";\n',
};

const ALLOWED = ["src/main.ts", "src/credentials/gone.ts", "src/missing.ts"];

test("C-76ead8ea the engine's egress sites are exactly the inventory", () => {
  const expected = [
    egressViolation("src/api/late.ts", 1, importedMessage("src/api/late.ts")),
    egressViolation("src/credentials/gone.ts", 1, missingMessage("src/credentials/gone.ts")),
    egressViolation("src/missing.ts", 1, missingMessage("src/missing.ts")),
    egressViolation("src/tools/rogue.ts", 1, importedMessage("src/tools/rogue.ts")),
    egressViolation("src/tools/rogue.ts", 3, importedMessage("src/tools/rogue.ts")),
  ];

  assert.deepEqual(answer(() => checkEgressSites(snapshotOf(RULE_FIXTURES), ALLOWED)), expected);
  assert.deepEqual(answer(() => checkEgressSites(readSnapshot(), ["src/credentials/vault-call.ts", "src/main.ts"])), []);
});
