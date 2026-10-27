import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { policySetVersionOf } from "./digest.ts";
import { createPdp } from "./index.ts";
import type { PolicySource } from "./types.ts";

const SCHEMA = "entity User;\naction read appliesTo { principal: User, resource: User };\n";

const B = {
  id: "b-src",
  layer: "tenant",
  text: '@id("t1") permit(principal,action,resource);',
} satisfies PolicySource;

const A = {
  id: "a-src",
  layer: "platform",
  text: '@id("p1") forbid(principal,action,resource);',
} satisfies PolicySource;

const KNOWN_VERSION = "021b0d155aaefe298c2ae73d4b9a844a7f21e5ec8bd5c6c01fab241e1bd0b1b8";

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function create(schema: string, policies: PolicySource[]) {
  return createPdp({
    schema,
    policies,
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

test("C-4240aaaa a known answer", async () => {
  assert.doesNotThrow(() => {
    assert.equal(policySetVersionOf(SCHEMA, [B, A]), KNOWN_VERSION);
    assert.equal(policySetVersionOf(SCHEMA, [A, B]), KNOWN_VERSION);
  });
  await assert.doesNotReject(async () => {
    assert.equal((await create(SCHEMA, [B, A])).policySetVersion, KNOWN_VERSION);
    assert.equal((await create(SCHEMA, [A, B])).policySetVersion, KNOWN_VERSION);
  });
});

test("C-a1580281 any change changes the version", () => {
  assert.doesNotThrow(() => {
    const original = policySetVersionOf(SCHEMA, [A, B]);
    const changedLayer = policySetVersionOf(SCHEMA, [{ ...A, layer: "tenant" }, B]);
    const changedText = policySetVersionOf(SCHEMA, [A, { ...B, text: `${B.text} ` }]);
    const changedSchema = policySetVersionOf(`${SCHEMA}\n`, [A, B]);
    const versions = [original, changedLayer, changedText, changedSchema];
    for (const version of versions) {
      assert.match(version, /^[0-9a-f]{64}$/);
    }
    assert.equal(new Set(versions).size, 4);
  });
});
