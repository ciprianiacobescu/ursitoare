import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Env, SecretReader } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { hashRouteKey, resolveTenantBy } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { createCommandRegistry } from "../registry.ts";
import type { OwnerConnection } from "../run.ts";
import { runCli } from "../run.ts";
import { tenantSinkCommand } from "./tenant-sink.ts";

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

const BROKER_VAR = "URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE";
const PROXY_VAR = "URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE";

async function run(
  db: TestDatabase,
  tokenEnv: Env,
  argv: readonly string[],
): Promise<Run> {
  const registry = createCommandRegistry();
  registry.registerCommand("tenant-sink", tenantSinkCommand);
  let stdout = "";
  let stderr = "";
  const readSecret: SecretReader = () => db.ownerEndpoint.password?.reveal() ?? "";
  const env: Env = {
    URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
    URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
    ...tokenEnv,
  };
  const code = await runCli(["tenant-sink", ...argv], {
    env,
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

test("C-602138c7 tenant-sink bind, repeat, taken", async () => {
  const db = await withTestDatabase();
  const dir = await mkdtemp(join(tmpdir(), "tenant-sink-"));
  try {
    await seedTwoTenants(db);
    const bt = "b".repeat(64);
    const pt = "c".repeat(64);
    const brokerFile = join(dir, "broker");
    const proxyFile = join(dir, "proxy");
    const sameFile = join(dir, "same");
    await writeFile(brokerFile, `${bt}\n`);
    await writeFile(proxyFile, `${pt}\n`);
    await writeFile(sameFile, `${bt}\n`);
    const good: Env = { [BROKER_VAR]: brokerFile, [PROXY_VAR]: proxyFile };
    const outputs: string[] = [];
    const step = async (tokenEnv: Env, ...argv: string[]): Promise<Run> => {
      const result = await run(db, tokenEnv, argv);
      outputs.push(result.stdout, result.stderr);
      return result;
    };

    assert.deepEqual(await step(good, "--tenant-name", "Tenant A"), {
      code: 0,
      stdout: "sink tokens: broker created, proxy created → tenant_a\n",
      stderr: "",
    });
    assert.deepEqual(await step(good, "--tenant-name", "Tenant A"), {
      code: 0,
      stdout: "sink tokens: broker exists, proxy exists → tenant_a\n",
      stderr: "",
    });
    assert.deepEqual(await step(good, "--tenant-name", "Tenant B"), {
      code: 1,
      stdout: "",
      stderr: "CLI_SINK_TAKEN: a sink token is already bound to another tenant\n",
    });
    assert.deepEqual(
      await step({ [BROKER_VAR]: brokerFile, [PROXY_VAR]: sameFile }, "--tenant-name", "Tenant A"),
      {
        code: 1,
        stdout: "",
        stderr: "CLI_SINK_TOKENS_EQUAL: the two sink tokens must differ\n",
      },
    );
    assert.deepEqual(await step({ [PROXY_VAR]: proxyFile }, "--tenant-name", "Tenant A"), {
      code: 1,
      stdout: "",
      stderr: `CLI_CONFIG_INVALID: ${BROKER_VAR}: must be set\n`,
    });
    assert.deepEqual(
      await step(
        { [BROKER_VAR]: brokerFile, [PROXY_VAR]: join(dir, "missing") },
        "--tenant-name",
        "Tenant A",
      ),
      {
        code: 1,
        stdout: "",
        stderr: `CLI_CONFIG_INVALID: ${PROXY_VAR}: file is missing, unreadable or empty\n`,
      },
    );

    const routes = await db.ownerPool.query<{
      kind: string;
      tenant_id: string;
      key_hash: Buffer;
    }>("SELECT kind, tenant_id, key_hash FROM ursitoare.tenant_route WHERE kind LIKE 'mintkey_sink_%' ORDER BY kind");
    assert.deepEqual(
      routes.rows.map((row) => [row.kind, row.tenant_id, row.key_hash.toString("hex")]),
      [
        ["mintkey_sink_broker", "tenant_a", hashRouteKey(bt).toString("hex")],
        ["mintkey_sink_proxy", "tenant_a", hashRouteKey(pt).toString("hex")],
      ],
    );
    assert.equal((await resolveTenantBy(db.appPool, "mintkey_sink_broker", bt))?.tenantId, "tenant_a");
    assert.equal((await resolveTenantBy(db.appPool, "mintkey_sink_proxy", pt))?.tenantId, "tenant_a");
    assert.equal(await resolveTenantBy(db.appPool, "mintkey_sink_proxy", bt), null);

    for (const text of outputs) {
      assert.ok(!text.includes(bt) && !text.includes(pt));
    }
    const asText = await db.ownerPool.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM ursitoare.tenant_route r WHERE r::text LIKE '%bbbbbbbb%' OR r::text LIKE '%cccccccc%'",
    );
    assert.equal(asText.rows[0]?.n, "0");
  } finally {
    await rm(dir, { recursive: true });
    await db.close();
  }
});
