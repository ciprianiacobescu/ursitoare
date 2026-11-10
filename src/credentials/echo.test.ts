import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createGateway } from "../gateway/client.ts";
import type { CallTag } from "../gateway/types.ts";
import { createVaultWriter } from "../gateway/vault.ts";
import { createLogger } from "../observability/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { startEchoUpstream, startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { EchoUpstream, FakeEgress } from "../../test/support/fake-egress/index.ts";
import { issuedPermit } from "../../test/support/gateway-kit.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { provisionCredential } from "./provision.ts";
import type { CredentialRecord } from "./types.ts";

assert.equal(typeof provisionCredential, "function");

const T0 = new Date("2026-11-06T10:00:00.000Z");
const ORIGIN = "https://tools.fake.test";
const KH = "x-fake-tools-key";
const VAL1 = "kv-secret-" + "7f3a";
const VALB = "bt-secret-" + "9c1d";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const TAG: CallTag = { tenantId: "tenant_a", runId: "r_1", nodeId: "lookup", attempt: 1 };
const BODY = '{"a":1}';

interface EchoSeen {
  headers: Record<string, string>;
}

test("C-d181bfc1 the echo shows the injected header and the fake never shows the value", async () => {
  const db = await withTestDatabase();
  let fake: FakeEgress | undefined;
  let echo: EchoUpstream | undefined;
  try {
    await assert.doesNotReject(async () => {
      fake = await startFakeEgress({ now: () => T0 });
      echo = await startEchoUpstream();
    });
    assert.ok(fake !== undefined && echo !== undefined, "fake and echo started");
    fake.addUpstream("tools.fake.test", echo.origin);
    const { a } = await seedTwoTenants(db);
    for (const id of ["acme", "beta"]) {
      await withTenantTx(db.ownerPool, a, async (tx) => {
        await tx.query(
          `INSERT INTO ursitoare.tool_server
             (tenant_id, tool_server_id, adapter, origin, local, state, registered_by, registered_at)
           VALUES ($1, $2, 'fixture', $3, false, 'pending', 'u_carol', '2026-11-06T10:00:00Z')`,
          [a.tenantId, id, ORIGIN],
        );
      });
    }
    const logger = createLogger({ level: "silent", destination: { write: (_line: string): void => {} } });
    const deps = {
      pool: db.appPool,
      ids: sequentialIds(1),
      clock: fixedClock("2026-11-06T10:00:00Z"),
      vault: createVaultWriter(
        { url: fake.vaultUrl, identity: fake.vaultAdmin.identity, token: new Secret(fake.vaultAdmin.token) },
        { logger },
      ),
    };
    const actor = { kind: "user", id: "u_carol" } as const;
    let acme: CredentialRecord | undefined;
    let beta: CredentialRecord | undefined;
    await assert.doesNotReject(async () => {
      acme = await provisionCredential(
        deps,
        a,
        { toolServerId: "acme", authScheme: "API_KEY_HEADER", headerName: KH, value: VAL1 },
        actor,
      );
      beta = await provisionCredential(
        deps,
        a,
        { toolServerId: "beta", authScheme: "BEARER_TOKEN", headerName: null, value: VALB, serviceId: S2 },
        actor,
      );
    });
    assert.ok(acme !== undefined && beta !== undefined, "both provisioned");

    const gateway = createGateway(
      {
        brokerUrl: fake.brokerUrl,
        proxyUrl: fake.proxyUrl,
        brokerToken: new Secret(fake.brokerServiceToken),
        agentId: "ursitoare-engine",
        vault: null,
      },
      { clock: { now: () => T0 }, logger },
    );
    const digest = createHash("sha256").update(BODY).digest("hex");
    const seen: EchoSeen[] = [];
    for (const record of [acme, beta]) {
      const permit = await issuedPermit({
        serviceId: record.serviceId,
        host: "tools.fake.test",
        method: "POST",
        path: "/echo?x=1",
        bodyDigest: digest,
        ttlSeconds: 60,
      });
      const token = await gateway.requestToken(permit, TAG);
      const answer = await gateway.send(
        permit,
        { method: "POST", origin: ORIGIN, path: "/echo?x=1", headers: {}, body: new TextEncoder().encode(BODY) },
        token,
        TAG,
      );
      assert.equal(answer.status, 200);
      seen.push(JSON.parse(new TextDecoder().decode(answer.body)) as EchoSeen);
    }
    assert.equal(seen[0]?.headers[KH], VAL1);
    assert.equal(seen[1]?.headers["authorization"], `Bearer ${VALB}`);
    assert.equal(seen[0]?.headers["x-ursitoare-call"], "r_1:lookup:1");

    assert.equal(fake.requests().length, 2);
    assert.ok(JSON.stringify(fake.requests()).includes("[credential]"));
    for (const text of [
      JSON.stringify(fake.requests()),
      JSON.stringify(fake.events()),
      JSON.stringify(fake.issued()),
    ]) {
      assert.ok(!text.includes(VAL1) && !text.includes(VALB), "the fake's records hold no value");
    }
  } finally {
    await fake?.close();
    await echo?.close();
    await db.close();
  }
});
