import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  createPolicyEngine,
  type PolicyEngine,
  type PolicyRequest,
  type PrincipalEntity,
  tenantEntity,
  userEntity,
} from "../pdp/index.ts";

const tempDirs: string[] = [];

const GRANTS_CEDAR = join(import.meta.dirname, "policy", "grants.cedar");

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function principalWith(roles: readonly string[]): PrincipalEntity {
  return { tenantId: "tenant_a", userId: "alice", kind: "human", roles, teams: [] };
}

function requestFor(
  principal: PrincipalEntity,
  action: string,
  resourceTenant = "tenant_a",
): PolicyRequest {
  const user = userEntity(principal);
  const tenant = tenantEntity(resourceTenant);
  return {
    principal: user.uid,
    action,
    resource: tenant.uid,
    context: {},
    entities: [user, tenant],
  };
}

async function engineWithCopiedFragment(): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "grants-policy-"));
  tempDirs.push(srcDir);
  const text = await readFile(GRANTS_CEDAR, "utf8").catch(() => "");
  if (text !== "") {
    const policyDir = join(srcDir, "grants", "policy");
    await mkdir(policyDir, { recursive: true });
    await writeFile(join(policyDir, "grants.cedar"), text, "utf8");
  }
  return createPolicyEngine({
    srcDir,
    clock: fixedClock("2026-11-10T00:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-2fec7263 the grants fragment permits the tenant admin to deploy policy in one tenant", async () => {
  const engine = await engineWithCopiedFragment();
  assert.deepEqual(
    engine.policies.filter((policy) => policy.id === "grants-deploy-admin"),
    [{ id: "grants-deploy-admin", layer: "platform" }],
  );

  const allow = await engine.check(requestFor(principalWith(["tenant_admin"]), "deploy_policy"));
  assert.deepEqual(allow.errors, []);
  assert.equal(allow.decision, "allow");
  assert.deepEqual(allow.reasons, ["grants-deploy-admin"]);

  for (const [label, roles] of [
    ["author", ["author"]],
    ["approver", ["approver"]],
    ["auditor", ["auditor"]],
  ] as const) {
    const deny = await engine.check(requestFor(principalWith(roles), "deploy_policy"));
    assert.deepEqual(deny.errors, []);
    assert.equal(deny.decision, "deny", `${label} is allowed deploy_policy`);
  }

  const otherTenant = await engine.check(
    requestFor(principalWith(["tenant_admin"]), "deploy_policy", "tenant_b"),
  );
  assert.deepEqual(otherTenant.errors, []);
  assert.equal(otherTenant.decision, "deny", "a cross-tenant deploy is allowed");
});
