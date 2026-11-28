import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env, SecretReader } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { createCommandRegistry } from "../registry.ts";
import type { OwnerConnection } from "../run.ts";
import { runCli } from "../run.ts";
import { tenantIdpCommand } from "./tenant-idp.ts";

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

function ownerEnv(db: TestDatabase): Env {
  return {
    URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
    URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
  };
}

async function run(db: TestDatabase, argv: readonly string[]): Promise<Run> {
  const registry = createCommandRegistry();
  registry.registerCommand("tenant-idp", tenantIdpCommand);
  let stdout = "";
  let stderr = "";
  const readSecret: SecretReader = () => db.ownerEndpoint.password?.reveal() ?? "";
  const code = await runCli(["tenant-idp", ...argv], {
    env: ownerEnv(db),
    stdout: { write: (text) => void (stdout += text) },
    stderr: { write: (text) => void (stderr += text) },
    registry,
    clock: fixedClock("2026-11-25T10:00:00.000Z"),
    ids: sequentialIds(0),
    readSecret,
    connectOwner: (): OwnerConnection => ({ pool: db.ownerPool, close: async () => undefined }),
  });
  return { code, stdout, stderr };
}

const ISSUER = "https://idp.example/realms/ursitoare";

test("C-1fc4a1df tenant-idp register, repeat, taken", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await db.ownerPool.query(
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_c', 'Tenant C')",
    );
    const step = (...argv: string[]): Promise<Run> => run(db, argv);

    assert.deepEqual(
      await step("--tenant-name", "Tenant A", "--issuer", "a\nb", "--organization", "o"),
      { code: 1, stdout: "", stderr: "IDENTITY_INVALID: invalid identity input\n" },
    );
    const okA = {
      code: 0,
      stdout: `idp ${ISSUER} org-a → tenant_a\n`,
      stderr: "",
    };
    assert.deepEqual(
      await step("--tenant-name", "Tenant A", "--issuer", ISSUER, "--organization", "org-a"),
      okA,
    );
    assert.deepEqual(
      await step("--tenant-name", "Tenant A", "--issuer", ISSUER, "--organization", "org-a"),
      okA,
    );
    assert.deepEqual(
      await step("--tenant", "tenant_b", "--issuer", ISSUER, "--organization", "org-a"),
      { code: 1, stdout: "", stderr: "IDENTITY_IDP_TAKEN: identity provider already routed\n" },
    );
    assert.deepEqual(
      await step("--tenant-name", "Tenant B", "--issuer", ISSUER, "--organization", "org-b"),
      { code: 0, stdout: `idp ${ISSUER} org-b → tenant_b\n`, stderr: "" },
    );
    assert.deepEqual(await step("--issuer", ISSUER, "--organization", "org-c"), {
      code: 1,
      stdout: "",
      stderr: "CLI_TENANT_REQUIRED: several tenants exist; pass --tenant <id>\n",
    });
    assert.deepEqual(
      await step("--tenant-name", "Nobody", "--issuer", ISSUER, "--organization", "org-c"),
      { code: 1, stdout: "", stderr: "CLI_TENANT_UNKNOWN: no tenant has that name\n" },
    );
    assert.deepEqual(await step("--tenant-name", "Tenant A", "--organization", "org-c"), {
      code: 2,
      stdout: "",
      stderr: "CLI_USAGE: missing required option --issuer\n",
    });

    const rows: Array<[string, string, string]> = [];
    for (const ctx of [a, b, { tenantId: "tenant_c", reviewProfile: "solo" as const }]) {
      const result = await withTenantTx(db.ownerPool, ctx, (tx) =>
        tx.query<{ tenant_id: string; issuer: string; organization: string }>(
          "SELECT tenant_id, issuer, organization FROM ursitoare.tenant_idp ORDER BY tenant_id",
        ),
      );
      for (const row of result.rows) rows.push([row.tenant_id, row.issuer, row.organization]);
    }
    assert.deepEqual(rows, [
      ["tenant_a", ISSUER, "org-a"],
      ["tenant_b", ISSUER, "org-b"],
    ]);

    const routes = await db.ownerPool.query<{ tenant_id: string }>(
      "SELECT tenant_id FROM ursitoare.tenant_route WHERE kind = 'idp' ORDER BY tenant_id",
    );
    assert.deepEqual(
      routes.rows.map((row) => row.tenant_id),
      ["tenant_a", "tenant_b"],
    );
  } finally {
    await db.close();
  }
});
