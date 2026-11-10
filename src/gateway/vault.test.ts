import assert from "node:assert/strict";
import http2 from "node:http2";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import { createLogger } from "../observability/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import { putCredential } from "../../test/support/fake-egress/vault-client.ts";
import { GatewayError } from "./types.ts";
import type { PutCredentialInput, VaultWriter } from "./vault.ts";
import { createVaultWriter } from "./vault.ts";

assert.equal(typeof createVaultWriter, "function");

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
const VAL1 = "kv-secret-7f3a";
const VAL2 = "kv-secret-8e2b";
const VALB = "bt-secret-9c1d";
const KH = "x-fake-tools-key";
const ENC1 =
  "0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530311801220e6b762d7365637265742d376633613210782d66616b652d746f6f6c732d6b657942056361726f6c4a16687474703a2f2f746f6f6c732e66616b652e74657374";

const IN1: PutCredentialInput = {
  tenantId: "4b8a2c1e-0000-8000-8000-000000000001",
  serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01",
  authScheme: "API_KEY_HEADER",
  value: utf8(VAL1),
  headerName: KH,
  callerActorId: "carol",
  targetUrl: "http://tools.fake.test",
};
const IN2: PutCredentialInput = {
  ...IN1,
  serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02",
  authScheme: "BEARER_TOKEN",
  value: utf8(VALB),
  headerName: null,
  targetUrl: "https://tools.fake.test",
};

interface Who {
  identity: string;
  token: string;
}

function capture(): { lines: string[]; logger: ReturnType<typeof createLogger> } {
  const lines: string[] = [];
  const logger = createLogger({ level: "info", destination: { write: (line) => void lines.push(line) } });
  return { lines, logger };
}

function makeWriter(
  url: string,
  who: Who,
  logger: ReturnType<typeof createLogger>,
  timeoutMs?: number,
): VaultWriter {
  let writer: VaultWriter | undefined;
  assert.doesNotThrow(() => {
    writer = createVaultWriter(
      { url, identity: who.identity, token: new Secret(who.token) },
      timeoutMs === undefined ? { logger } : { logger, timeoutMs },
    );
  });
  assert.ok(writer !== undefined, "writer created");
  return writer;
}

async function start(): Promise<FakeEgress> {
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress();
  });
  assert.ok(fake !== undefined, "fake started");
  return fake;
}

async function put(writer: VaultWriter, input: PutCredentialInput): Promise<number | undefined> {
  let keyVersion: number | undefined;
  await assert.doesNotReject(async () => {
    keyVersion = (await writer.putCredential(input)).keyVersion;
  });
  return keyVersion;
}

function refusal(code: string, details: Record<string, string>): (error: unknown) => boolean {
  return (error) =>
    error instanceof GatewayError &&
    error.code === code &&
    Object.entries(details).every(([key, value]) => error.details[key] === value);
}

test("C-2a5da3c6 the writer counts key versions against the fake vault", async () => {
  const fake = await start();
  try {
    const logs = capture();
    const direct = await putCredential(fake.vaultUrl, fake.vaultAdmin, {
      tenantId: IN1.tenantId,
      serviceId: IN1.serviceId,
      authScheme: 1,
      value: Buffer.from(VAL1),
      headerName: KH,
      callerActorId: "carol",
      targetUrl: "http://tools.fake.test",
    });
    assert.equal(direct.keyVersion, 1);
    const writer = makeWriter(fake.vaultUrl, fake.vaultAdmin, logs.logger);
    assert.equal(await put(writer, { ...IN1, value: utf8(VAL2) }), 2);
    assert.equal(await put(writer, IN2), 1);
    assert.equal(await put(writer, { ...IN1, tenantId: "4b8a2c1e-0000-8000-8000-000000000002" }), 1);
    const stored = fake.credentials();
    assert.equal(stored.length, 3);
    assert.deepEqual(stored[0], {
      tenantId: IN1.tenantId,
      serviceId: IN1.serviceId,
      authScheme: "API_KEY_HEADER",
      headerName: KH,
      targetUrl: "http://tools.fake.test",
      keyVersion: 2,
      callerActorId: "carol",
      identity: "svcid_ursitoare_admin",
    });
    assert.equal(stored[1]?.serviceId, IN2.serviceId);
    assert.equal(stored[1]?.authScheme, "BEARER_TOKEN");
    assert.equal(stored[1]?.keyVersion, 1);
    assert.equal(stored[2]?.tenantId, "4b8a2c1e-0000-8000-8000-000000000002");
    assert.equal(stored[2]?.keyVersion, 1);
  } finally {
    await fake.close();
  }
});

test("C-2a5da3c6 the writer maps the fake vault refusals", async () => {
  const fake = await start();
  let closed = false;
  try {
    const logs = capture();
    await assert.rejects(
      makeWriter(fake.vaultUrl, fake.vaultDenied, logs.logger).putCredential(IN1),
      refusal("GATEWAY_TOKEN_REFUSED", { status: "7" }),
    );
    await assert.rejects(
      makeWriter(fake.vaultUrl, { identity: fake.vaultAdmin.identity, token: "x" }, logs.logger).putCredential(IN1),
      refusal("GATEWAY_TOKEN_REFUSED", { status: "16" }),
    );
    const admin = makeWriter(fake.vaultUrl, fake.vaultAdmin, logs.logger);
    await assert.rejects(
      admin.putCredential({ ...IN1, serviceId: IN1.serviceId.toUpperCase() }),
      refusal("GATEWAY_INVALID", { reason: "vault_refused" }),
    );
    assert.deepEqual(fake.credentials(), []);
    await fake.close();
    closed = true;
    await assert.rejects(admin.putCredential(IN1), refusal("GATEWAY_UNAVAILABLE", { stage: "vault" }));
  } finally {
    if (!closed) await fake.close();
  }
});

type Mode = "trailer13" | "ok0noframe" | "silent" | "trailersonly16" | "ok1";

interface Seen {
  headers: http2.IncomingHttpHeaders;
  body: Buffer;
}

async function startStub(mode: () => Mode): Promise<{ url: string; seen: Seen[]; close: () => Promise<void> }> {
  const seen: Seen[] = [];
  const sessions = new Set<http2.ServerHttp2Session>();
  const server = http2.createServer();
  server.on("session", (session) => {
    sessions.add(session);
    session.on("close", () => sessions.delete(session));
  });
  server.on("stream", (stream, headers) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => {
      seen.push({ headers, body: Buffer.concat(chunks) });
      const current = mode();
      if (current === "silent") return;
      if (current === "trailersonly16") {
        stream.respond({ ":status": 200, "content-type": "application/grpc", "grpc-status": "16" }, { endStream: true });
        return;
      }
      stream.respond({ ":status": 200, "content-type": "application/grpc" }, { waitForTrailers: true });
      stream.on("wantTrailers", () => {
        stream.sendTrailers({ "grpc-status": current === "trailer13" ? "13" : "0" });
      });
      stream.end(current === "ok1" ? Buffer.from("000000000208" + "01", "hex") : undefined);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}`,
    seen,
    close: () =>
      new Promise<void>((resolve) => {
        for (const session of sessions) session.destroy();
        server.close(() => resolve());
      }),
  };
}

const STUB_WHO: Who = { identity: "svcid_x", token: "tok" };

test("C-2a5da3c6 the writer sends one framed request with metadata", async () => {
  const stub = await startStub(() => "ok1");
  try {
    const logs = capture();
    assert.equal(await put(makeWriter(stub.url, STUB_WHO, logs.logger), IN1), 1);
    assert.equal(stub.seen.length, 1);
    const [request] = stub.seen;
    assert.equal(request?.headers[":path"], "/mintkey.vault.v1.VaultAdapter/PutCredential");
    assert.equal(request?.headers["content-type"], "application/grpc");
    assert.equal(request?.headers["te"], "trailers");
    const values = Object.values(request?.headers ?? {});
    assert.ok(values.includes("svcid_x"), "identity sent as metadata");
    assert.ok(values.includes("tok"), "token sent as metadata");
    assert.equal(request?.body.length, 5 + 143);
    assert.equal(request?.body.subarray(0, 5).toString("hex"), "000000008f");
    assert.equal(request?.body.subarray(5).toString("hex"), ENC1);
  } finally {
    await stub.close();
  }
});

test("C-2a5da3c6 the writer maps what the stub answers", async () => {
  let mode: Mode = "trailer13";
  const stub = await startStub(() => mode);
  try {
    const logs = capture();
    const writer = makeWriter(stub.url, STUB_WHO, logs.logger, 100);
    mode = "trailer13";
    await assert.rejects(writer.putCredential(IN1), refusal("GATEWAY_UNAVAILABLE", { stage: "vault" }));
    mode = "ok0noframe";
    await assert.rejects(writer.putCredential(IN1), refusal("GATEWAY_UNAVAILABLE", { stage: "vault" }));
    mode = "silent";
    await assert.rejects(writer.putCredential(IN1), refusal("GATEWAY_UNAVAILABLE", { stage: "vault" }));
    mode = "trailersonly16";
    await assert.rejects(writer.putCredential(IN1), refusal("GATEWAY_TOKEN_REFUSED", { status: "16" }));
    mode = "ok1";
    assert.equal(await put(writer, IN1), 1);
  } finally {
    await stub.close();
  }
});

test("C-2a5da3c6 an https url against the plaintext stub is unavailable and sends nothing", async () => {
  const stub = await startStub(() => "ok1");
  try {
    const logs = capture();
    const port = new URL(stub.url).port;
    const writer = makeWriter(`https://127.0.0.1:${port}`, STUB_WHO, logs.logger, 500);
    await assert.rejects(writer.putCredential(IN1), refusal("GATEWAY_UNAVAILABLE", { stage: "vault" }));
    assert.equal(stub.seen.length, 0);
  } finally {
    await stub.close();
  }
});

test("C-2a5da3c6 the log holds one line per call and no value, token or identity", async () => {
  let mode: Mode = "ok1";
  const stub = await startStub(() => mode);
  try {
    const logs = capture();
    const writer = makeWriter(stub.url, STUB_WHO, logs.logger, 100);
    assert.equal(await put(writer, IN1), 1);
    mode = "trailer13";
    await assert.rejects(writer.putCredential(IN1), refusal("GATEWAY_UNAVAILABLE", { stage: "vault" }));
    assert.equal(logs.lines.length, 2);
    const [ok, failed] = logs.lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    assert.equal(ok?.["msg"], "vault put");
    assert.equal(ok?.["level"], 30);
    assert.equal(ok?.["serviceId"], IN1.serviceId);
    assert.equal(ok?.["keyVersion"], 1);
    assert.equal(failed?.["msg"], "vault put failed");
    assert.equal(failed?.["level"], 40);
    assert.equal(failed?.["serviceId"], IN1.serviceId);
    assert.equal(failed?.["code"], "GATEWAY_UNAVAILABLE");
    const text = logs.lines.join("");
    for (const secret of [VAL1, "tok", "svcid_x"]) assert.ok(!text.includes(secret), secret);
  } finally {
    await stub.close();
  }
});
