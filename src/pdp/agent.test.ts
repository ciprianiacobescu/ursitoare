import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { invokeToolRequest } from "../../test/support/policy-samples.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { createPolicyEngine, type PolicyEngine, type PolicyEngineOptions } from "./policy-engine.ts";
import type { Decision, PolicyRequest, PolicySource } from "./types.ts";

const tempDirs: string[] = [];

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

const PERMIT_SOURCE: PolicySource = {
  id: "t-src",
  layer: "tenant",
  text: '@id("t-all") permit (principal, action, resource);',
};

async function engineWith(tenantPolicies: readonly PolicySource[]): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "pdp-src-"));
  tempDirs.push(srcDir);
  const options: PolicyEngineOptions = {
    srcDir,
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  };
  if (tenantPolicies.length > 0) {
    options.tenantPolicies = tenantPolicies;
  }
  return createPolicyEngine(options);
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function checkOf(
  engine: PolicyEngine,
  request: PolicyRequest,
): Promise<Decision | undefined> {
  let decision: Decision | undefined;
  await assert.doesNotReject(async () => {
    decision = await engine.check(request);
  }, "check");
  return decision;
}

test("C-72275fc6 C-88e72ab4 an agent block is denied on send and pay and allowed on the other combinations", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith([PERMIT_SOURCE]);
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const permitAll = engine;

  for (const effect of ["send", "pay"]) {
    const denied = await checkOf(
      permitAll,
      invokeToolRequest({ effect, taint: [], blockKind: "agent" }),
    );
    assert.ok(denied !== undefined, `no decision for effect ${effect}`);
    assert.equal(denied.decision, "deny", `agent block with effect ${effect} is not denied`);
    assert.deepEqual(
      denied.reasons,
      ["platform-forbid-agent-consequential"],
      `agent block with effect ${effect} has the wrong reasons`,
    );
    assert.deepEqual(denied.errors, [], `agent block with effect ${effect} has errors`);
  }

  for (const effect of ["write", "read"]) {
    const allowed = await checkOf(
      permitAll,
      invokeToolRequest({ effect, taint: [], blockKind: "agent" }),
    );
    assert.ok(allowed !== undefined, `no decision for agent block with effect ${effect}`);
    assert.equal(allowed.decision, "allow", `agent block with effect ${effect} is not allowed`);
    assert.deepEqual(allowed.errors, [], `agent block with effect ${effect} has errors`);
  }

  const codeSend = await checkOf(
    permitAll,
    invokeToolRequest({ effect: "send", taint: [], blockKind: "code" }),
  );
  assert.ok(codeSend !== undefined, "no decision for a code block with effect send");
  assert.equal(codeSend.decision, "allow", "a code block with effect send is not allowed");
  assert.deepEqual(codeSend.errors, [], "a code block with effect send has errors");
});

test("C-64407374 an agent block with untrusted taint and effect send is denied by both forbids", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith([PERMIT_SOURCE]);
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const permitAll = engine;

  const denied = await checkOf(
    permitAll,
    invokeToolRequest({ effect: "send", taint: ["untrusted"], blockKind: "agent" }),
  );
  assert.ok(denied !== undefined, "no decision");
  assert.equal(denied.decision, "deny", "the request is not denied");
  assert.deepEqual(
    denied.reasons,
    ["platform-forbid-agent-consequential", "platform-forbid-untrusted-egress"],
    "the request has the wrong reasons",
  );
  assert.deepEqual(denied.errors, [], "the request has errors");
});
