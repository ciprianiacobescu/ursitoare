import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  createPolicyEngine,
  defaultSrcDir,
  entityRef,
  tenantEntity,
  userEntity,
} from "../pdp/index.ts";
import type {
  Entity,
  PolicyEngine,
  PolicyRequest,
  PrincipalEntity,
} from "../pdp/index.ts";

const RUN_PERMIT_IDS = [
  "runs-debug-author-owner-team",
  "runs-list",
  "runs-read-initiator",
  "runs-read-owner-team",
] as const;

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function principalWith(
  tenantId: string,
  userId: string,
  roles: readonly string[],
  teams: readonly string[],
): PrincipalEntity {
  return { tenantId, userId, kind: "human", roles, teams };
}

function runEntity(): Entity {
  return {
    uid: { type: "Run", id: "tenant_a/run-1" },
    attrs: {
      tenant: "tenant_a",
      owner_team: entityRef("Team", "tenant_a/finance"),
      initiator: entityRef("User", "tenant_a/u_erin"),
    },
    parents: [],
  };
}

function requestFor(
  principal: PrincipalEntity,
  action: string,
  resource: Entity,
): PolicyRequest {
  const user = userEntity(principal);
  return {
    principal: user.uid,
    action,
    resource: resource.uid,
    context: {},
    entities: [user, resource],
  };
}

async function defaultEngine(): Promise<PolicyEngine> {
  return createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock: fixedClock("2026-10-31T00:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

async function outcome(engine: PolicyEngine, request: PolicyRequest): Promise<string> {
  const decision = await engine.check(request);
  assert.deepEqual(decision.errors, [], `errors for ${request.action}`);
  return decision.decision;
}

const ALICE = principalWith("tenant_a", "alice", ["author"], ["finance"]);
const BOB = principalWith("tenant_a", "bob", ["approver"], ["finance"]);
const ERIN = principalWith("tenant_a", "erin", ["author"], ["ops"]);
const DAVE = principalWith("tenant_a", "dave", ["author"], ["ops"]);
const CAROL = principalWith("tenant_a", "carol", ["tenant_admin"], []);
const MALLORY = principalWith("tenant_b", "mallory", ["author"], ["finance"]);

const PRINCIPALS = [ALICE, BOB, ERIN, DAVE, CAROL, MALLORY] as const;

test("C-489dbbf9 read and debug on a run follow the owner team and initiator", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await defaultEngine();
  }, "createPolicyEngine over the default sources");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;
  const run = runEntity();

  const expectedRead: Record<string, string> = {
    alice: "allow",
    bob: "allow",
    erin: "allow",
    dave: "deny",
    carol: "deny",
    mallory: "deny",
  };
  const expectedDebug: Record<string, string> = {
    alice: "allow",
    bob: "deny",
    erin: "deny",
    dave: "deny",
    carol: "deny",
    mallory: "deny",
  };

  for (const principal of PRINCIPALS) {
    assert.equal(
      await outcome(pdp, requestFor(principal, "read_run", run)),
      expectedRead[principal.userId],
      `read_run on the Run for ${principal.userId}`,
    );
    assert.equal(
      await outcome(pdp, requestFor(principal, "debug_run", run)),
      expectedDebug[principal.userId],
      `debug_run on the Run for ${principal.userId}`,
    );
  }
});

test("C-489dbbf9 the tenant list is readable and debug is denied for everyone", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await defaultEngine();
  }, "createPolicyEngine over the default sources");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;
  const tenant = tenantEntity("tenant_a");

  for (const principal of PRINCIPALS) {
    assert.equal(
      await outcome(pdp, requestFor(principal, "read_run", tenant)),
      principal.tenantId === "tenant_a" ? "allow" : "deny",
      `read_run on the Tenant for ${principal.userId}`,
    );
    assert.equal(
      await outcome(pdp, requestFor(principal, "debug_run", tenant)),
      "deny",
      `debug_run on the Tenant for ${principal.userId}`,
    );
  }

  const ids = pdp.policies.map((policy) => policy.id);
  assert.deepEqual(
    ids.filter((id) => id.startsWith("runs-")).sort(),
    [...RUN_PERMIT_IDS],
  );
});
