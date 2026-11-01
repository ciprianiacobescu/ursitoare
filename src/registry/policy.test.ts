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

const BLOCKS_CEDAR = join(import.meta.dirname, "policy", "blocks.cedar");

const BLOCK_PERMIT_IDS = [
  "registry-blocks-approver-read-registry",
  "registry-blocks-author-read-registry",
  "registry-blocks-tenant-admin-read-registry",
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

async function engineWithCopiedBlocks(): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "registry-blocks-policy-"));
  tempDirs.push(srcDir);
  const text = await readFile(BLOCKS_CEDAR, "utf8").catch(() => "");
  if (text !== "") {
    const policyDir = join(srcDir, "registry", "policy");
    await mkdir(policyDir, { recursive: true });
    await writeFile(join(policyDir, "blocks.cedar"), text, "utf8");
  }
  return createPolicyEngine({
    srcDir,
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

test("C-d0096357 who may read the registry", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWithCopiedBlocks();
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  for (const role of ["author", "approver", "tenant_admin"]) {
    assert.equal(
      await outcome(pdp, requestFor(principalWith([role]), "read_registry")),
      "allow",
      `${role} is not allowed read_registry`,
    );
  }
  for (const [label, roles] of [
    ["auditor", ["auditor"]],
    ["no role", []],
  ] as const) {
    assert.equal(
      await outcome(pdp, requestFor(principalWith(roles), "read_registry")),
      "deny",
      `${label} is allowed read_registry`,
    );
  }
  assert.equal(
    await outcome(pdp, requestFor(principalWith(["tenant_admin"]), "read_registry", "tenant_b")),
    "deny",
    "a cross-tenant request is allowed",
  );
});

test("C-d0096357 the default sources hold exactly three registry permits", async () => {
  const engine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock: fixedClock("2026-10-31T00:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
  const ids = engine.policies.map((policy) => policy.id);
  assert.deepEqual(
    ids.filter((id) => id.startsWith("registry-blocks-")).sort(),
    [...BLOCK_PERMIT_IDS],
  );
});
