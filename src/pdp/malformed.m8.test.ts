import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { PdpError, createPdp } from "./index.ts";
import type { PolicySource } from "./types.ts";

const SCHEMA = `entity Role;
entity User in [Role];
entity Tool { effect: String };
entity Doc { owner: User, locked: Bool };
action read, write, send appliesTo {
  principal: User, resource: Doc, context: { n: Long, tool: Tool, amount?: decimal } };
`;

// The M8 text of design.md § Test plan: an undeclared action in the action scope.
const M8_DESIGN = '@id("bad") permit (principal, action == Action::"reed", resource);';

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function create(source: PolicySource) {
  return createPdp({
    schema: SCHEMA,
    policies: [source],
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

test("C-50748953 the M8 policy of the design names an undeclared action in the action scope", async () => {
  await assert.rejects(
    create({ id: "m-src", layer: "tenant", text: M8_DESIGN }),
    (error: unknown) => {
      assert.ok(error instanceof PdpError, "the rejection is a PdpError");
      assert.equal(error.code, "PDP_POLICY_INVALID");
      assert.equal(error.details["stage"], "validate");
      assert.deepEqual(error.details["ids"], ["bad"]);
      assert.match(error.message, /^PDP_POLICY_INVALID: validate bad$/);
      return true;
    },
  );
});

test("C-50748953 the undeclared action of the design M8 is a policy fault not a parse fault", async () => {
  await assert.rejects(
    create({ id: "m-src", layer: "tenant", text: M8_DESIGN }),
    (error: unknown) => {
      assert.ok(error instanceof PdpError, "the rejection is a PdpError");
      assert.equal(error.code, "PDP_POLICY_INVALID");
      assert.notEqual(error.details["stage"], "parse");
      assert.notDeepEqual(error.details["ids"], ["m-src"]);
      assert.deepEqual(error.details["ids"], ["bad"]);
      return true;
    },
  );
});
