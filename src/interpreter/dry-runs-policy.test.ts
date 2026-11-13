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

const DRY_RUN_POLICY_IDS = [
  "dry-run-flow-author-owner-team",
  "dry-run-flow-capability",
] as const;

const INTERPRETER_POLICY_IDS = [
  "interpreter-test-flow-author-owner-team",
  "interpreter-test-flow-capability",
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

function flowEntity(): Entity {
  return {
    uid: { type: "Flow", id: "tenant_a/pay-once" },
    attrs: {
      tenant: "tenant_a",
      owner_team: entityRef("Team", "tenant_a/finance"),
      reviewed: false,
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
    clock: fixedClock("2026-11-11T10:00:00Z"),
    ids: sequentialIds(0),
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
const DAVE = principalWith("tenant_a", "dave", ["author"], ["ops"]);
const CAROL = principalWith("tenant_a", "carol", ["tenant_admin"], []);
const MALLORY = principalWith("tenant_b", "mallory", ["author"], ["finance"]);

const PRINCIPALS = [ALICE, BOB, DAVE, CAROL, MALLORY] as const;

test("C-e792e555 dry_run_flow is granted to authors of the owner team", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await defaultEngine();
  }, "createPolicyEngine over the default sources");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  const flow = flowEntity();
  const expectedOnFlow: Record<string, string> = {
    alice: "allow",
    bob: "deny",
    dave: "deny",
    carol: "deny",
    mallory: "deny",
  };
  for (const principal of PRINCIPALS) {
    assert.equal(
      await outcome(pdp, requestFor(principal, "dry_run_flow", flow)),
      expectedOnFlow[principal.userId],
      `dry_run_flow on the Flow for ${principal.userId}`,
    );
  }

  const tenant = tenantEntity("tenant_a");
  const expectedOnTenant: Record<string, string> = {
    alice: "allow",
    bob: "deny",
    dave: "allow",
    carol: "deny",
    mallory: "deny",
  };
  for (const principal of PRINCIPALS) {
    assert.equal(
      await outcome(pdp, requestFor(principal, "dry_run_flow", tenant)),
      expectedOnTenant[principal.userId],
      `dry_run_flow on the Tenant for ${principal.userId}`,
    );
  }

  const ids = pdp.policies.map((policy) => policy.id);
  assert.deepEqual(
    ids.filter((id) => id.startsWith("dry-run-")).sort(),
    [...DRY_RUN_POLICY_IDS],
  );
  assert.deepEqual(
    ids.filter((id) => id.startsWith("interpreter-")).sort(),
    [...INTERPRETER_POLICY_IDS],
  );
});
