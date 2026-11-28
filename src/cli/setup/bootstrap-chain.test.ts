import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import pg from "pg";

import type { Env } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { hashRouteKey, resolveTenantBy } from "../../tenancy/index.ts";
import { startCluster } from "../../../test/support/pg.ts";
import { createDefaultRegistry } from "../builtin.ts";
import { runCli } from "../run.ts";

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

const ISS = "http://localhost:8180/realms/ursitoare";
const T = "ten_00000000-0000-7000-8000-000000000000";

test("C-d5ac552b five steps twice on a fresh cluster", async () => {
  const cluster = await startCluster();
  const dir = await mkdtemp(join(tmpdir(), "bootstrap-chain-"));
  const pools: pg.Pool[] = [];
  try {
    const admin = decodeURIComponent(new URL(cluster.adminUrl).password);
    await writeFile(join(dir, "admin"), `${admin}\n`);
    await writeFile(join(dir, "owner"), "OW\n");
    await writeFile(join(dir, "app"), "AP\n");
    const bt = "b".repeat(64);
    const pt = "c".repeat(64);
    await writeFile(join(dir, "broker"), `${bt}\n`);
    await writeFile(join(dir, "proxy"), `${pt}\n`);
    const base = `127.0.0.1:${cluster.port}/ursitoare`;
    const env: Env = {
      URSITOARE_DATABASE_ADMIN_URL: `postgres://postgres@${base}`,
      URSITOARE_DATABASE_ADMIN_PASSWORD_FILE: join(dir, "admin"),
      URSITOARE_DATABASE_OWNER_PASSWORD_FILE: join(dir, "owner"),
      URSITOARE_DATABASE_PASSWORD_FILE: join(dir, "app"),
      URSITOARE_DATABASE_OWNER_URL: `postgres://ursitoare_owner@${base}`,
      URSITOARE_DATABASE_URL: `postgres://ursitoare_app@${base}`,
      URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE: join(dir, "broker"),
      URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE: join(dir, "proxy"),
    };
    const ids = sequentialIds(0);
    const clock = fixedClock("2026-11-25T10:00:00.000Z");
    const registry = createDefaultRegistry();
    const step = async (...argv: string[]): Promise<Run> => {
      let stdout = "";
      let stderr = "";
      const code = await runCli(argv, {
        env,
        stdout: { write: (text) => void (stdout += text) },
        stderr: { write: (text) => void (stderr += text) },
        registry,
        ids,
        clock,
      });
      return { code, stdout, stderr };
    };
    const chain = async (): Promise<Run[]> => {
      const out: Run[] = [];
      out.push(await step("db-roles"));
      out.push(await step("db-prepare"));
      return out;
    };
    const tenantSteps = async (): Promise<Run[]> => {
      const out: Run[] = [];
      const created = await step("tenant-create", "--name", "E2E tenant");
      out.push(created);
      const id = created.stdout.split(" ")[1] ?? "";
      out.push(await step("tenant-idp", "--tenant-name", "E2E tenant", "--issuer", ISS, "--organization", "org-a"));
      out.push(await step("tenant-sink", "--tenant-name", "E2E tenant"));
      out.push(
        await step("admin", "bootstrap-admin", "--tenant", id, "--issuer", ISS, "--operator", "owner-job"),
      );
      return out;
    };

    const first = await chain();
    const owner = new pg.Pool({
      host: cluster.host,
      port: cluster.port,
      user: "ursitoare_owner",
      password: "OW",
      database: "ursitoare",
    });
    pools.push(owner);
    await owner.query(
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ('tenant_a', 'Tenant A'), ('tenant_b', 'Tenant B')",
    );
    first.push(...(await tenantSteps()));
    const second = [...(await chain()), ...(await tenantSteps())];

    for (const result of [...first, ...second]) {
      assert.equal(result.code, 0, result.stderr);
      assert.equal(result.stderr, "");
    }
    const prepare = /^migrations: (\d+) applied; partitions: (\d+); dbos: ready\n$/.exec(
      first[1]?.stdout ?? "",
    );
    assert.ok(prepare !== null, "the first db-prepare prints the counts");
    assert.deepEqual(
      first.map((r) => r.stdout),
      [
        "database: created\nroles: created ursitoare_owner ursitoare_app\n",
        first[1]?.stdout,
        `tenant ${T} "E2E tenant" created\n`,
        `idp ${ISS} org-a → ${T}\n`,
        `sink tokens: broker created, proxy created → ${T}\n`,
        "mapped ursitoare-admins to tenant_admin\nmembers of ursitoare-admins get tenant_admin at their next sign-in\n",
      ],
    );
    assert.deepEqual(
      second.map((r) => r.stdout),
      [
        "database: present\nroles: updated\n",
        "migrations: 0 applied; partitions: 0; dbos: ready\n",
        `tenant ${T} "E2E tenant" unchanged\n`,
        `idp ${ISS} org-a → ${T}\n`,
        `sink tokens: broker exists, proxy exists → ${T}\n`,
        "already mapped: tenant_admin has a group; nothing changed\n",
      ],
    );

    const tenants = await owner.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.tenant");
    assert.equal(tenants.rows[0]?.n, "3");
    const routes = await owner.query<{ kind: string; tenant_id: string }>(
      "SELECT kind, tenant_id FROM ursitoare.tenant_route WHERE kind IN ('idp', 'mintkey_sink_broker', 'mintkey_sink_proxy') ORDER BY kind",
    );
    assert.deepEqual(
      routes.rows.map((row) => [row.kind, row.tenant_id]),
      [
        ["idp", T],
        ["mintkey_sink_broker", T],
        ["mintkey_sink_proxy", T],
      ],
    );
    assert.equal(
      (await owner.query("SELECT 1 FROM ursitoare.tenant_route WHERE key_hash = $1", [hashRouteKey(bt)])).rowCount,
      1,
    );

    const app = new pg.Pool({
      host: cluster.host,
      port: cluster.port,
      user: "ursitoare_app",
      password: "AP",
      database: "ursitoare",
    });
    pools.push(app);
    assert.equal((await resolveTenantBy(app, "mintkey_sink_broker", bt))?.tenantId, T);
  } finally {
    for (const pool of pools) {
      await pool.end();
    }
    await rm(dir, { recursive: true });
    await cluster.stop();
  }
});
