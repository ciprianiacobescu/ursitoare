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

const MALFORMED: readonly { readonly name: string; readonly stage: "parse" | "validate"; readonly text: string }[] = [
  {
    name: "M1",
    stage: "parse",
    text: '@id("bad") permit (principal, action == Action::"read", resource) when { context.n > 1 ',
  },
  {
    name: "M2",
    stage: "validate",
    text: '@id("bad") forbid (principal, action == Action::"read", resource) when { context.n == "x" };',
  },
  {
    name: "M3",
    stage: "validate",
    text: '@id("bad") permit (principal, action == Action::"read", resource) when { principal.roless.contains(Role::"admin") };',
  },
  {
    name: "M4",
    stage: "validate",
    text: '@id("bad") forbid (principal, action == Action::"read", resource) when { context.amount.greaterThan(decimal("1.0000")) };',
  },
  {
    name: "M5",
    stage: "validate",
    text: '@id("bad") forbid (principal, action == Action::"read", resource) when { context has amount && context.amount > 10000 };',
  },
  {
    name: "M6",
    stage: "validate",
    text: '@id("bad") forbid (principal, action == Action::"read", resource) when { context.nope == 1 };',
  },
  {
    name: "M7",
    stage: "validate",
    text: '@id("bad") permit (principal, action == Action::"read", resource == User::"alice");',
  },
  {
    name: "M8",
    stage: "validate",
    text: '@id("bad") permit (principal, action == Action::"read", resource == Action::"reed");',
  },
];

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

for (const malformed of MALFORMED) {
  test(`C-50748953 ${malformed.name} malformed policy is refused`, async () => {
    await assert.rejects(
      create({ id: "m-src", layer: "tenant", text: malformed.text }),
      (error: unknown) => {
        assert.ok(error instanceof PdpError, "the rejection is a PdpError");
        assert.equal(error.code, "PDP_POLICY_INVALID");
        assert.equal(error.details["stage"], malformed.stage);
        const expectedIds = malformed.stage === "parse" ? ["m-src"] : ["bad"];
        assert.deepEqual(error.details["ids"], expectedIds);
        return true;
      },
    );
  });
}
