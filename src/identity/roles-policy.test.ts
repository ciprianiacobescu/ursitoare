import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  createPolicyEngine,
  defaultSrcDir,
  type PolicyEngine,
  type PolicyRequest,
  type PrincipalEntity,
  tenantEntity,
  userEntity,
} from "../pdp/index.ts";

const tempDirs: string[] = [];

const ROLES_CEDAR = join(import.meta.dirname, "policy", "roles.cedar");

const ADMIN_PERMIT_IDS = [
  "identity-rbac-auditor-read-audit",
  "identity-rbac-tenant-admin-manage-tenant",
  "identity-rbac-tenant-admin-manage-users-roles",
  "identity-rbac-tenant-admin-read-audit",
] as const;

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

async function engineWithCopiedRoles(): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "identity-roles-policy-"));
  tempDirs.push(srcDir);
  const text = await readFile(ROLES_CEDAR, "utf8").catch(() => "");
  if (text !== "") {
    const policyDir = join(srcDir, "identity", "policy");
    await mkdir(policyDir, { recursive: true });
    await writeFile(join(policyDir, "roles.cedar"), text, "utf8");
  }
  return createPolicyEngine({
    srcDir,
    clock: fixedClock("2026-10-31T00:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

async function engineOverDefaultSources(): Promise<PolicyEngine> {
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

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-b0ef8ac4 who may do what", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWithCopiedRoles();
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  const tenantAdmin = principalWith(["tenant_admin"]);
  for (const action of ["manage_users_roles", "manage_tenant", "read_audit", "read_self"]) {
    assert.equal(
      await outcome(pdp, requestFor(tenantAdmin, action)),
      "allow",
      `tenant_admin is not allowed ${action}`,
    );
  }

  const auditor = principalWith(["auditor"]);
  for (const action of ["read_audit", "read_self"]) {
    assert.equal(
      await outcome(pdp, requestFor(auditor, action)),
      "allow",
      `auditor is not allowed ${action}`,
    );
  }
  for (const action of ["manage_users_roles", "manage_tenant"]) {
    assert.equal(
      await outcome(pdp, requestFor(auditor, action)),
      "deny",
      `auditor is allowed ${action}`,
    );
  }

  const others: readonly { label: string; roles: readonly string[] }[] = [
    { label: "author", roles: ["author"] },
    { label: "approver", roles: ["approver"] },
    { label: "no role", roles: [] },
  ];
  for (const { label, roles } of others) {
    const principal = principalWith(roles);
    assert.equal(
      await outcome(pdp, requestFor(principal, "read_self")),
      "allow",
      `${label} is not allowed read_self`,
    );
    for (const action of ["manage_users_roles", "manage_tenant", "read_audit"]) {
      assert.equal(
        await outcome(pdp, requestFor(principal, action)),
        "deny",
        `${label} is allowed ${action}`,
      );
    }
  }

  for (const action of ["manage_users_roles", "manage_tenant", "read_audit", "read_self"]) {
    assert.equal(
      await outcome(pdp, requestFor(tenantAdmin, action, "tenant_b")),
      "deny",
      `a cross-tenant request for ${action} is allowed`,
    );
  }
});

test("C-a5d01d7a loaded with every module's fragments", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineOverDefaultSources();
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  assert.equal(
    await outcome(pdp, requestFor(principalWith(["tenant_admin"]), "manage_users_roles")),
    "allow",
    "tenant_admin is not allowed manage_users_roles",
  );

  const ids = pdp.policies.map((policy) => policy.id);
  for (const id of ADMIN_PERMIT_IDS) {
    assert.ok(ids.includes(id), `${id} is not loaded`);
  }
  assert.deepEqual(
    ids.filter((id) => id.startsWith("identity-rbac-")).sort(),
    [...ADMIN_PERMIT_IDS],
    "roles.cedar does not hold exactly the four admin permits",
  );
});
