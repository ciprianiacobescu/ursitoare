import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import { startFakeEgress } from "../fake-egress/index.ts";
import type { FakeEgress } from "../fake-egress/index.ts";
import { putCredential } from "../fake-egress/vault-client.ts";
import type { FakeToolCall, FakeTools } from "./index.ts";
import {
  FAKE_TOOLS_HOST,
  FAKE_TOOLS_KEY_HEADER,
  FAKE_TOOLS_ORIGIN,
  fakeToolPath,
  startFakeTools,
} from "./index.ts";

const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const K = "kv-" + "tools-4d1c";
const MAIL_A = { to: "a@x.test", subject: "s", body: "b" };
const LOOKUP_OUTPUT = { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 };
const MAIL_OUTPUT = { message_id: "msg-e2e024cf84" };
const D_ACME = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const D_MAIL = "cc6042abee0ce7229757b5cb64b915bd2c47f3e71a76a67567cf2fc94b09a099";

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function post(
  base: string,
  path: string,
  headers: http.OutgoingHttpHeaders,
  body: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method: "POST", path, headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function provision(egress: FakeEgress, serviceId: string): Promise<number | null> {
  const answer = await putCredential(egress.vaultUrl, egress.vaultAdmin, {
    tenantId: T_A,
    serviceId,
    authScheme: 1,
    value: Buffer.from(K),
    headerName: FAKE_TOOLS_KEY_HEADER,
    callerActorId: "carol",
    targetUrl: FAKE_TOOLS_ORIGIN,
  });
  assert.equal(answer.grpcStatus, 0, answer.grpcMessage);
  return answer.keyVersion;
}

async function issue(egress: FakeEgress, serviceId: string): Promise<string> {
  const answer = await fetch(`${egress.brokerUrl}/v1/issue`, {
    method: "POST",
    headers: {
      "x-mintkey-service-token": egress.brokerServiceToken,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agent_id: "alice",
      service_id: serviceId,
      tenant_id: T_A,
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
  serviceId: string,
  ref: string,
  headers: http.OutgoingHttpHeaders,
  input: unknown,
): Promise<Reply> {
  const token = await issue(egress, serviceId);
  return post(
    egress.proxyUrl,
    `/${serviceId}${fakeToolPath(ref)}`,
    { ...headers, authorization: `Bearer ${token}`, "content-type": "application/json" },
    JSON.stringify(input),
  );
}

test("C-66380829 a credentialed service reaches the fake tools through the fake egress", async () => {
  let startedEgress: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    startedEgress = await startFakeEgress();
  });
  assert.ok(startedEgress !== undefined, "the fake egress started");
  const egress: FakeEgress = startedEgress;

  let startedTools: FakeTools | undefined;
  await assert.doesNotReject(async () => {
    startedTools = await startFakeTools();
  });
  assert.ok(startedTools !== undefined, "the fake tools started");
  const tools: FakeTools = startedTools;

  try {
    egress.addUpstream(FAKE_TOOLS_HOST, tools.origin);

    const keyVersion = await provision(egress, S1);
    assert.equal(keyVersion, 1, "the credential is stored with keyVersion 1");

    const c1 = await forwarded(
      egress,
      S1,
      "erp.lookup_vendor@1",
      { "x-ursitoare-call": "r_1:lookup:1" },
      { vendor_name: "Acme GmbH" },
    );
    assert.equal(c1.status, 200);
    assert.deepEqual(JSON.parse(c1.body), LOOKUP_OUTPUT);

    const c2 = await forwarded(
      egress,
      S1,
      "mail.send@1",
      {
        "x-ursitoare-call": "r_1:notify:1",
        "idempotency-key": "ik-pro-1",
        "x-fake-tools-key": "forged",
      },
      MAIL_A,
    );
    assert.equal(c2.status, 200);
    assert.deepEqual(JSON.parse(c2.body), MAIL_OUTPUT);
    assert.equal(c2.headers["x-fake-tools-duplicate"], "false");

    const c3 = await forwarded(
      egress,
      S1,
      "mail.send@1",
      { "x-ursitoare-call": "r_1:notify:2", "idempotency-key": "ik-pro-1" },
      MAIL_A,
    );
    assert.equal(c3.status, 200);
    assert.deepEqual(JSON.parse(c3.body), MAIL_OUTPUT);
    assert.equal(c3.headers["x-fake-tools-duplicate"], "true");

    const c4 = await forwarded(egress, S2, "erp.lookup_vendor@1", {}, {
      vendor_name: "Acme GmbH",
    });
    assert.equal(c4.status, 502);
    assert.equal(c4.body, "bad gateway: vault error\n");

    const expected: FakeToolCall[] = [
      {
        seq: 1,
        ref: "erp.lookup_vendor@1",
        effect: "read",
        method: "POST",
        path: "/blocks/erp.lookup_vendor@1",
        host: "tools.fake.test",
        callHeader: "r_1:lookup:1",
        idempotencyKey: null,
        keyHeaderSeen: true,
        input: { vendor_name: "Acme GmbH" },
        bodySha256: D_ACME,
        status: 200,
        duplicate: false,
      },
      {
        seq: 2,
        ref: "mail.send@1",
        effect: "send",
        method: "POST",
        path: "/blocks/mail.send@1",
        host: "tools.fake.test",
        callHeader: "r_1:notify:1",
        idempotencyKey: "ik-pro-1",
        keyHeaderSeen: true,
        input: MAIL_A,
        bodySha256: D_MAIL,
        status: 200,
        duplicate: false,
      },
      {
        seq: 3,
        ref: "mail.send@1",
        effect: "send",
        method: "POST",
        path: "/blocks/mail.send@1",
        host: "tools.fake.test",
        callHeader: "r_1:notify:2",
        idempotencyKey: "ik-pro-1",
        keyHeaderSeen: true,
        input: MAIL_A,
        bodySha256: D_MAIL,
        status: 200,
        duplicate: true,
      },
    ];
    assert.deepEqual(tools.calls(), expected, "the three allowed calls are recorded");

    const requests = egress.requests();
    const allowed = requests.filter((record) => record.outcome === "allowed");
    const rejected = requests.filter((record) => record.outcome === "rejected");
    assert.equal(allowed.length, 3, "three allowed requests");
    assert.equal(rejected.length, 1, "the credentialless request is rejected");
    for (const record of allowed) {
      assert.equal(record.serviceId, S1);
      assert.equal(record.host, FAKE_TOOLS_HOST);
      assert.equal(record.status, 200);
      assert.equal(record.headers[FAKE_TOOLS_KEY_HEADER], "[credential]");
    }
    const denied = rejected[0];
    assert.ok(denied !== undefined);
    assert.equal(denied.serviceId, S2);
    assert.equal(denied.status, 502);

    const serialized = JSON.stringify(tools.calls());
    assert.equal(serialized.includes("forged"), false, "the forged header is not recorded");
    assert.equal(serialized.includes(K), false, "the credential value is not recorded");
    assert.equal(
      serialized.includes(egress.brokerServiceToken),
      false,
      "the broker token is not recorded",
    );
  } finally {
    await tools.close();
    await egress.close();
  }
});
