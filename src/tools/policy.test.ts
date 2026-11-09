import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  ACTION_NAMES,
  createPolicyEngine,
  defaultSrcDir,
  type PolicyEngine,
  type PolicyRequest,
  type PrincipalEntity,
  tenantEntity,
  userEntity,
} from "../pdp/index.ts";

const tempDirs: string[] = [];

const ROLES_CEDAR = join(import.meta.dirname, "..", "identity", "policy", "roles.cedar");
const TOOLS_CEDAR = join(import.meta.dirname, "policy", "tools.cedar");

const TOOL_PERMIT_IDS = ["tools-approve-admin", "tools-register-admin"] as const;

const TENANT_ADMIN_CAPABILITIES = [
  "approve_tool_surface",
  "manage_tenant",
  "manage_users_roles",
  "read_audit",
  "read_self",
  "register_tool_server",
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
): PrincipalEntity {
  return { tenantId, userId, kind: "human", roles, teams: [] };
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

async function copyFragment(
  srcDir: string,
  relative: string,
  source: string,
): Promise<void> {
  const text = await readFile(source, "utf8").catch(() => "");
  if (text === "") {
    return;
  }
  const target = join(srcDir, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

async function engineWithCopiedFragments(): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "tools-policy-"));
  tempDirs.push(srcDir);
  await copyFragment(srcDir, join("identity", "policy", "roles.cedar"), ROLES_CEDAR);
  await copyFragment(srcDir, join("tools", "policy", "tools.cedar"), TOOLS_CEDAR);
  return createPolicyEngine({
    srcDir,
    clock: fixedClock("2026-10-31T00:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-95f2b798 only tenant admins of the tenant hold the two actions", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWithCopiedFragments();
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  const carol = principalWith("tenant_a", "carol", ["tenant_admin"]);
  const alice = principalWith("tenant_a", "alice", ["author"]);
  const bob = principalWith("tenant_a", "bob", ["approver"]);
  const ada = principalWith("tenant_a", "ada", ["auditor"]);
  const mallory = principalWith("tenant_b", "mallory", ["tenant_admin"]);

  assert.deepEqual(
    await pdp.allowedActions(carol, ACTION_NAMES),
    [...TENANT_ADMIN_CAPABILITIES],
    "carol's capabilities",
  );
  assert.deepEqual(
    await pdp.allowedActions(alice, ACTION_NAMES),
    ["read_self"],
    "alice's capabilities",
  );
  assert.deepEqual(
    await pdp.allowedActions(bob, ACTION_NAMES),
    ["read_self"],
    "bob's capabilities",
  );
  assert.deepEqual(
    await pdp.allowedActions(ada, ACTION_NAMES),
    ["read_audit", "read_self"],
    "ada's capabilities",
  );
  assert.deepEqual(
    await pdp.allowedActions(mallory, ACTION_NAMES),
    [...TENANT_ADMIN_CAPABILITIES],
    "mallory's capabilities on her own tenant",
  );

  const register = await pdp.check(requestFor(carol, "register_tool_server"));
  assert.equal(register.decision, "allow", "carol is denied register_tool_server");
  assert.deepEqual(register.reasons, ["tools-register-admin"], "register reason");
  assert.deepEqual(register.errors, [], "register errors");

  const approve = await pdp.check(requestFor(carol, "approve_tool_surface"));
  assert.equal(approve.decision, "allow", "carol is denied approve_tool_surface");
  assert.deepEqual(approve.reasons, ["tools-approve-admin"], "approve reason");
  assert.deepEqual(approve.errors, [], "approve errors");

  for (const [label, principal] of [
    ["alice", alice],
    ["bob", bob],
    ["ada", ada],
  ] as const) {
    for (const action of ["register_tool_server", "approve_tool_surface"] as const) {
      const decision = await pdp.check(requestFor(principal, action));
      assert.equal(decision.decision, "deny", `${label} is allowed ${action}`);
      assert.deepEqual(decision.errors, [], `${label} ${action} errors`);
    }
  }

  for (const action of ["register_tool_server", "approve_tool_surface"] as const) {
    const decision = await pdp.check(requestFor(mallory, action));
    assert.equal(decision.decision, "deny", `mallory is allowed ${action}`);
    assert.deepEqual(
      decision.reasons,
      ["platform-cross-tenant-forbid"],
      `mallory ${action} reasons`,
    );
    assert.deepEqual(decision.errors, [], `mallory ${action} errors`);
  }
});

test("C-95f2b798 the default sources hold exactly the two tool permits", async () => {
  const engine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock: fixedClock("2026-10-31T00:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
  const ids = engine.policies.map((policy) => policy.id);
  assert.deepEqual(
    ids.filter((id) => id.startsWith("tools-")).sort(),
    [...TOOL_PERMIT_IDS],
  );
});
