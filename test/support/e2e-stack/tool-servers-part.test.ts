import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { listCredentials } from "../../../src/credentials/index.ts";
import { createPool } from "../../../src/db/index.ts";
import { mintkeyTenantId } from "../../../src/gateway/index.ts";
import { provisionTenantIdp } from "../../../src/identity/index.ts";
import { ensureDefaultTenant, withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../../src/tenancy/index.ts";
import { getToolServer } from "../../../src/tools/index.ts";

import { withDedicatedCluster } from "../crash/cluster.ts";
import type { FakeEgress } from "../fake-egress/index.ts";
import {
  FAKE_TOOLS_KEY_HEADER,
  FAKE_TOOLS_ORIGIN,
  fakeToolPath,
} from "../fake-tools/index.ts";

import { databaseApi, databasePart, E2E_TENANT_NAME } from "./database-part.ts";
import { PARTS_DIR, discoverParts } from "./discover.ts";
import { egressApi, egressPart } from "./egress-part.ts";
import { oidcApi, oidcPart } from "./oidc-part.ts";
import { E2eStackError } from "./part.ts";
import type { PartContext, PartHandle } from "./part.ts";
import { SEED_TOOL_SERVER, toolServersPart } from "./tool-servers-part.ts";
import { toolsApi, toolsPart } from "./tools-part.ts";

const ENGINE_ORIGIN = "http://127.0.0.1:39080";
const CONTROL_ORIGIN = "http://127.0.0.1:39081";
const TENANT_B_ID = "tenant_b";
const TENANT_C_ID = "tenant_c";
const SERVICE_A = "1b62133b-f0cc-8a7a-9a3c-fa9f7cd93c22";
const SERVICE_B = "78edb038-ec1b-82b0-8002-8efed8152e65";
const ORIGIN = FAKE_TOOLS_ORIGIN;
const KEY_HEADER = FAKE_TOOLS_KEY_HEADER;

const tempRoots: string[] = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The parts may already have removed their own directories.
    }
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-tool-servers-part-"));
  tempRoots.push(dir);
  return dir;
}

async function must<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

function contextFor(
  name: string,
  dataDir: string,
  handles: ReadonlyMap<string, PartHandle>,
): PartContext {
  return {
    name,
    dataDir,
    engineOrigin: ENGINE_ORIGIN,
    controlOrigin: CONTROL_ORIGIN,
    env: {},
    handles: new Map(handles),
  };
}

async function assertMissing(
  run: () => Promise<unknown>,
  part: string,
): Promise<void> {
  await assert.rejects(
    async () => {
      await run();
    },
    (error: unknown) => {
      assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
      assert.equal(error.code, "STACK_PART_MISSING");
      assert.deepEqual(error.details, { part });
      return true;
    },
  );
}

interface Reply {
  status: number;
  body: string;
}

function post(
  base: string,
  requestPath: string,
  headers: http.OutgoingHttpHeaders,
  body: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method: "POST", path: requestPath, headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function issue(egress: FakeEgress, tenantId: string, serviceId: string): Promise<string> {
  const answer = await fetch(`${egress.brokerUrl}/v1/issue`, {
    method: "POST",
    headers: {
      "x-mintkey-service-token": egress.brokerServiceToken,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agent_id: "ursitoare-engine",
      service_id: serviceId,
      tenant_id: tenantId,
      scope: "call",
      ttl_seconds: 60,
    }),
  });
  assert.equal(answer.status, 200);
  const parsed = (await answer.json()) as { token?: unknown };
  assert.equal(typeof parsed.token, "string");
  return parsed.token as string;
}

async function forwarded(
  egress: FakeEgress,
  tenantId: string,
  serviceId: string,
  ref: string,
  input: unknown,
): Promise<Reply> {
  const token = await issue(egress, tenantId, serviceId);
  return post(
    egress.proxyUrl,
    `/${serviceId}${fakeToolPath(ref)}`,
    {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-ursitoare-call": "r_1:lookup:1",
    },
    JSON.stringify(input),
  );
}

async function eventCount(pool: TenantPool, ctx: TenantContext): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const result = await tx.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ursitoare.audit_event
       WHERE tenant_id = $1 AND event_type = 'credentials.provisioned'`,
      [ctx.tenantId],
    );
    return result.rows[0]?.count ?? 0;
  });
}

test("C-5e7feae0 PT1 the part refuses to start without database egress and tools", async () => {
  const root = tempRoot();
  const databaseDir = path.join(root, "database");
  mkdirSync(databaseDir, { recursive: true });

  const handles = new Map<string, PartHandle>();
  let databaseHandle: PartHandle | undefined;
  let egressHandle: PartHandle | undefined;

  try {
    await assertMissing(
      () => toolServersPart.start(contextFor("tool-servers", path.join(root, "none"), new Map())),
      "database",
    );

    databaseHandle = await must(() =>
      databasePart.start(contextFor("database", databaseDir, handles)),
    );
    handles.set("database", databaseHandle);

    await assertMissing(
      () => toolServersPart.start(contextFor("tool-servers", path.join(root, "no-egress"), handles)),
      "egress",
    );

    egressHandle = await must(() =>
      egressPart.start(contextFor("egress", path.join(root, "egress"), handles)),
    );
    handles.set("egress", egressHandle);

    await assertMissing(
      () => toolServersPart.start(contextFor("tool-servers", path.join(root, "no-tools"), handles)),
      "tools",
    );
  } finally {
    await egressHandle?.close().catch(() => undefined);
    await databaseHandle?.close().catch(() => undefined);
  }
});

test("C-5e7feae0 PT2 to PT4 the part seeds acme once and survives a reset", async () => {
  assert.equal(toolServersPart.name, "tool-servers", "the part is named tool-servers");

  const root = tempRoot();
  const databaseDir = path.join(root, "database");
  mkdirSync(databaseDir, { recursive: true });

  const handles = new Map<string, PartHandle>();
  let databaseHandle: PartHandle | undefined;
  let oidcHandle: PartHandle | undefined;
  let egressHandle: PartHandle | undefined;
  let toolsHandle: PartHandle | undefined;
  let toolServersHandle: PartHandle | undefined;
  let ownerPool: ReturnType<typeof createPool> | undefined;

  try {
    databaseHandle = await must(() =>
      databasePart.start(contextFor("database", databaseDir, handles)),
    );
    handles.set("database", databaseHandle);
    await must(
      () => databasePart.seed?.(contextFor("database", databaseDir, handles)) ?? Promise.resolve(),
    );

    const oidcDir = path.join(root, "oidc");
    oidcHandle = await must(() => oidcPart.start(contextFor("oidc", oidcDir, handles)));
    handles.set("oidc", oidcHandle);
    await must(
      () => oidcPart.seed?.(contextFor("oidc", oidcDir, handles)) ?? Promise.resolve(),
    );

    const issuer = oidcApi(handles).fake.issuer;
    ownerPool = createPool(databaseApi(handles).ownerUrl, {
      max: 2,
      applicationName: "e2e-tool-servers-part",
    });
    await ownerPool.query(
      `INSERT INTO ursitoare.tenant (tenant_id, name)
       VALUES ($1, 'Tenant B'), ($2, 'Tenant C')
       ON CONFLICT DO NOTHING`,
      [TENANT_B_ID, TENANT_C_ID],
    );
    const tenantB: TenantContext = { tenantId: TENANT_B_ID, reviewProfile: "solo" };
    const tenantC: TenantContext = { tenantId: TENANT_C_ID, reviewProfile: "solo" };
    await must(() =>
      provisionTenantIdp(ownerPool as TenantPool, tenantB, {
        issuer,
        organization: "org-b",
      }),
    );
    const tenantA = await must(() => ensureDefaultTenant(ownerPool as TenantPool, E2E_TENANT_NAME));

    const egressDir = path.join(root, "egress");
    egressHandle = await must(() => egressPart.start(contextFor("egress", egressDir, handles)));
    handles.set("egress", egressHandle);
    const egress = egressApi(handles).fake;

    const toolsDir = path.join(root, "tools");
    toolsHandle = await must(() => toolsPart.start(contextFor("tools", toolsDir, handles)));
    handles.set("tools", toolsHandle);
    const tools = toolsApi(handles).tools;

    const partDir = path.join(root, "tool-servers");
    toolServersHandle = await must(() =>
      toolServersPart.start(contextFor("tool-servers", partDir, handles)),
    );
    assert.deepEqual(toolServersHandle.env, {}, "the part exports no environment");
    handles.set("tool-servers", toolServersHandle);

    assert.equal(typeof toolServersPart.seed, "function", "the tool-servers part has a seed");
    await must(
      () =>
        toolServersPart.seed?.call(
          toolServersPart,
          contextFor("tool-servers", partDir, handles),
        ) ?? Promise.resolve(),
    );

    const serverA = await must(() => getToolServer(ownerPool as TenantPool, tenantA, "acme"));
    assert.ok(serverA !== null, "tenant A registers acme");
    assert.equal(serverA.state, "pending");
    assert.equal(serverA.origin, ORIGIN);

    const credentialsA = await must(() => listCredentials(ownerPool as TenantPool, tenantA));
    assert.equal(credentialsA.length, 1, "tenant A holds one credential");
    const credentialA = credentialsA[0];
    assert.ok(credentialA !== undefined);
    assert.equal(credentialA.serviceId, SERVICE_A);
    assert.equal(credentialA.authScheme, "API_KEY_HEADER");
    assert.equal(credentialA.headerName, KEY_HEADER);
    assert.equal(credentialA.targetOrigin, ORIGIN);
    assert.equal(credentialA.keyVersion, 1);
    assert.equal(credentialA.provisionedBy, "e2e-seed");

    const serverB = await must(() => getToolServer(ownerPool as TenantPool, tenantB, "acme"));
    assert.ok(serverB !== null, "tenant B registers acme");
    assert.equal(serverB.state, "pending");
    assert.equal(serverB.origin, ORIGIN);

    const credentialsB = await must(() => listCredentials(ownerPool as TenantPool, tenantB));
    assert.equal(credentialsB.length, 1, "tenant B holds one credential");
    const credentialB = credentialsB[0];
    assert.ok(credentialB !== undefined);
    assert.equal(credentialB.serviceId, SERVICE_B);
    assert.equal(credentialB.keyVersion, 1);
    assert.equal(credentialB.provisionedBy, "e2e-seed");

    assert.equal(await must(() => getToolServer(ownerPool as TenantPool, tenantC, "acme")), null);
    assert.deepEqual(await must(() => listCredentials(ownerPool as TenantPool, tenantC)), []);

    const stored = egress.credentials();
    assert.equal(stored.length, 2, "the fake vault holds one credential per routed tenant");
    const storedA = stored.find((entry) => entry.serviceId === SERVICE_A);
    const storedB = stored.find((entry) => entry.serviceId === SERVICE_B);
    assert.ok(storedA !== undefined);
    assert.ok(storedB !== undefined);
    for (const entry of [storedA, storedB]) {
      assert.equal(entry.keyVersion, 1);
      assert.equal(entry.callerActorId, "e2e-seed");
      assert.equal(entry.identity, egress.vaultAdmin.identity);
    }

    const eventsA = await must(() => eventCount(ownerPool as TenantPool, tenantA));
    const eventsB = await must(() => eventCount(ownerPool as TenantPool, tenantB));
    assert.equal(eventsA, 1);
    assert.equal(eventsB, 1);

    const proxied = await must(() =>
      forwarded(
        egress,
        mintkeyTenantId(tenantA.tenantId),
        SERVICE_A,
        "erp.lookup_vendor@1",
        { vendor_name: "Acme GmbH" },
      ),
    );
    assert.equal(proxied.status, 200, proxied.body);
    const calls = tools.calls();
    assert.equal(calls.length, 1, "the proxied call reached the tools fake");
    assert.equal(calls[0]?.keyHeaderSeen, true, "the credential header reached the tools fake");

    const rowsAfterFirst = [
      (await must(() => listCredentials(ownerPool as TenantPool, tenantA))).length,
      (await must(() => listCredentials(ownerPool as TenantPool, tenantB))).length,
    ];
    await must(
      () =>
        toolServersPart.seed?.call(
          toolServersPart,
          contextFor("tool-servers", partDir, handles),
        ) ?? Promise.resolve(),
    );
    assert.deepEqual(
      [
        (await must(() => listCredentials(ownerPool as TenantPool, tenantA))).length,
        (await must(() => listCredentials(ownerPool as TenantPool, tenantB))).length,
      ],
      rowsAfterFirst,
      "a re-seed adds no rows",
    );
    assert.equal(await must(() => eventCount(ownerPool as TenantPool, tenantA)), eventsA);
    assert.equal(await must(() => eventCount(ownerPool as TenantPool, tenantB)), eventsB);
    assert.equal(egress.credentials().length, 2, "a re-seed writes nothing to the vault");

    await must(
      () => databasePart.seed?.(contextFor("database", databaseDir, handles)) ?? Promise.resolve(),
    );
    await must(
      () => oidcPart.seed?.(contextFor("oidc", oidcDir, handles)) ?? Promise.resolve(),
    );
    await must(
      () =>
        toolServersPart.seed?.call(
          toolServersPart,
          contextFor("tool-servers", partDir, handles),
        ) ?? Promise.resolve(),
    );

    const restoredA = await must(() => listCredentials(ownerPool as TenantPool, tenantA));
    assert.equal(restoredA.length, 1, "the reset leaves tenant A one credential");
    assert.equal(restoredA[0]?.serviceId, SERVICE_A, "the reset keeps the same service id");
    assert.equal(restoredA[0]?.keyVersion, 2, "the re-put moves the key version to 2");
    const restoredServerA = await must(() => getToolServer(ownerPool as TenantPool, tenantA, "acme"));
    assert.ok(restoredServerA !== null);
    assert.equal(restoredServerA.state, "pending");
    assert.equal(
      egress.credentials().find((entry) => entry.serviceId === SERVICE_A)?.keyVersion,
      2,
      "the fake vault holds version 2 for the same service",
    );
    assert.deepEqual(await must(() => listCredentials(ownerPool as TenantPool, tenantB)), []);
  } finally {
    await toolServersHandle?.close().catch(() => undefined);
    await toolsHandle?.close().catch(() => undefined);
    await egressHandle?.close().catch(() => undefined);
    await oidcHandle?.close().catch(() => undefined);
    await ownerPool?.end().catch(() => undefined);
    await databaseHandle?.close().catch(() => undefined);
  }
});

test("C-5e7feae0 PT5 the crash cluster seeds acme and its credential", async () => {
  const names = (await discoverParts()).map((part) => part.name);
  assert.ok(names.includes("tool-servers"), "the tool-servers part is discovered");

  await must(() =>
    withDedicatedCluster(async (cluster) => {
      const pool = createPool(cluster.ownerUrl, { max: 1, applicationName: "e2e-tool-servers-crash" });
      try {
        const tenantA = await ensureDefaultTenant(pool, E2E_TENANT_NAME);
        const server = await getToolServer(pool, tenantA, "acme");
        assert.ok(server !== null, "the crash cluster seeds acme");
        assert.equal(server.state, "pending");
        assert.equal(server.origin, ORIGIN);

        const credentials = await listCredentials(pool, tenantA);
        assert.equal(credentials.length, 1, "the crash cluster seeds one credential");
        assert.equal(credentials[0]?.serviceId, SERVICE_A);
        assert.equal(credentials[0]?.keyVersion, 1);
        assert.equal(credentials[0]?.provisionedBy, "e2e-seed");
      } finally {
        await pool.end().catch(() => undefined);
      }
    }),
  );
});

test("C-5e7feae0 PT6 discovery lists tool-servers after tools with its file and constants", async () => {
  const names = (await discoverParts()).map((part) => part.name);
  assert.ok(names.includes("egress"), "the egress part is discovered");
  assert.ok(names.includes("tools"), "the tools part is discovered");
  assert.ok(names.includes("tool-servers"), "the tool-servers part is discovered");
  assert.ok(names.indexOf("egress") < names.indexOf("tools"));
  assert.ok(names.indexOf("tools") < names.indexOf("tool-servers"));

  const partFile = path.join(PARTS_DIR, "52-tool-servers.ts");
  assert.ok(existsSync(partFile), "the shipped tool-servers part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { toolServersPart as part } from "../tool-servers-part.ts";',
  );

  assert.deepEqual(SEED_TOOL_SERVER, {
    id: "acme",
    origin: ORIGIN,
    refs: ["erp.lookup_vendor@1", "erp.create_payment@1"],
  });
});
