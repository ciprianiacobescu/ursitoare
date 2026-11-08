import assert from "node:assert/strict";
import http2 from "node:http2";
import { test } from "node:test";

import { startFakeEgress } from "./index.ts";
import type { FakeEgress } from "./index.ts";
import { callVault, putCredential } from "./vault-client.ts";
import { decodePutResponse, encodePutRequest, frame, unframe } from "./wire.ts";
import type { VaultPutInput } from "./wire.ts";

const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const T_B = "4b8a2c1e-0000-8000-8000-000000000002";
const sid = (n: number): string => `0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e0${n}`;
const S1 = sid(1);
const S2 = sid(2);
const VAL1 = "kv-secret-7f3a";
const VAL2 = "kv-secret-8e2b";
const VALB = "bt-secret-9c1d";
const PUT_PATH = "/mintkey.vault.v1.VaultAdapter/PutCredential";

const HEX_REQ1 =
  "000000008f0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530311801220e6b762d7365637265742d376633613210782d66616b652d746f6f6c732d6b657942056361726f6c4a16687474703a2f2f746f6f6c732e66616b652e74657374";
const HEX_REQ2 =
  "000000007e0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530321803220e62742d7365637265742d3963316442056361726f6c4a1768747470733a2f2f746f6f6c732e66616b652e74657374";

interface Who {
  identity: string;
  token: string;
}
interface Answer {
  grpcStatus: number;
  grpcMessage: string;
  body: Buffer;
}

function req1(over: Partial<VaultPutInput> = {}): VaultPutInput {
  return {
    tenantId: T_A,
    serviceId: S1,
    authScheme: 1,
    value: Buffer.from(VAL1),
    headerName: "x-fake-tools-key",
    callerActorId: "carol",
    targetUrl: "http://tools.fake.test",
    ...over,
  };
}

function req2(): VaultPutInput {
  return req1({
    serviceId: S2,
    authScheme: 3,
    value: Buffer.from(VALB),
    headerName: "",
    targetUrl: "https://tools.fake.test",
  });
}

async function start(): Promise<FakeEgress> {
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress();
  });
  assert.ok(fake !== undefined, "fake started");
  return fake;
}

async function send(
  fake: FakeEgress,
  who: Who | null,
  body: Uint8Array,
  rpc?: { path?: string; method?: string },
): Promise<Answer> {
  let answer: Answer | undefined;
  await assert.doesNotReject(async () => {
    answer = await callVault(fake.vaultUrl, who, body, rpc);
  });
  assert.ok(answer !== undefined, "vault answered");
  return answer;
}

function putBody(input: VaultPutInput): Buffer {
  return frame(encodePutRequest(input));
}

interface RawAnswer {
  status: unknown;
  contentType: unknown;
  grpcStatus: unknown;
  error: string | null;
}

function rawCall(url: string, path: string): Promise<RawAnswer> {
  return new Promise((resolve) => {
    const out: RawAnswer = { status: null, contentType: null, grpcStatus: null, error: null };
    const session = http2.connect(url);
    const finish = (): void => {
      session.destroy();
      resolve(out);
    };
    session.on("error", (e) => {
      out.error = e.message;
      finish();
    });
    const stream = session.request({ ":method": "POST", ":path": path, "content-type": "application/grpc", te: "trailers" });
    stream.on("response", (h) => {
      out.status = h[":status"];
      out.contentType = h["content-type"];
    });
    stream.on("trailers", (t) => {
      out.grpcStatus = t["grpc-status"];
    });
    stream.on("error", (e) => {
      out.error = e.message;
    });
    stream.on("close", finish);
    stream.resume();
    stream.end(frame(Buffer.alloc(0)));
  });
}

test("C-0bc1717c the vault counts key versions and answers with fixed bytes", async () => {
  const fake = await start();
  try {
    assert.equal(encodePutRequest(req1()).toString("hex"), HEX_REQ1.slice(10));
    assert.equal(encodePutRequest(req2()).toString("hex"), HEX_REQ2.slice(10));

    const a1 = await send(fake, fake.vaultAdmin, putBody(req1()));
    const a2 = await send(fake, fake.vaultAdmin, putBody(req1({ value: Buffer.from(VAL2) })));
    const a3 = await send(fake, fake.vaultProxy, putBody(req2()));
    const a4 = await send(fake, fake.vaultAdmin, putBody(req1({ tenantId: T_B })));
    const answers = [a1, a2, a3, a4];
    assert.deepEqual(
      answers.map((a) => a.grpcStatus),
      [0, 0, 0, 0],
    );
    assert.deepEqual(
      answers.map((a) => a.body.toString("hex")),
      ["000000000408011200", "000000000408021200", "000000000408011200", "000000000408011200"],
    );
    assert.deepEqual(
      answers.map((a) => decodePutResponse(unframe(a.body))),
      [1, 2, 1, 1],
    );

    const first = {
      tenantId: T_A,
      serviceId: S1,
      authScheme: "API_KEY_HEADER",
      headerName: "x-fake-tools-key",
      targetUrl: "http://tools.fake.test",
      keyVersion: 2,
      callerActorId: "carol",
      identity: "svcid_ursitoare_admin",
    };
    assert.deepEqual(fake.credentials(), [
      first,
      {
        tenantId: T_A,
        serviceId: S2,
        authScheme: "BEARER_TOKEN",
        headerName: null,
        targetUrl: "https://tools.fake.test",
        keyVersion: 1,
        callerActorId: "carol",
        identity: "svcid_proxy",
      },
      { ...first, tenantId: T_B, keyVersion: 1 },
    ]);
  } finally {
    await fake.close();
  }
});

test("C-0bc1717c putCredential returns the key version of each write", async () => {
  const fake = await start();
  try {
    let one: Awaited<ReturnType<typeof putCredential>> | undefined;
    let two: Awaited<ReturnType<typeof putCredential>> | undefined;
    await assert.doesNotReject(async () => {
      one = await putCredential(fake.vaultUrl, fake.vaultAdmin, req1());
      two = await putCredential(fake.vaultUrl, fake.vaultAdmin, req1({ value: Buffer.from(VAL2) }));
    });
    assert.deepEqual(one, { grpcStatus: 0, grpcMessage: "", keyVersion: 1 });
    assert.deepEqual(two, { grpcStatus: 0, grpcMessage: "", keyVersion: 2 });
  } finally {
    await fake.close();
  }
});

test("C-e831e54f the vault answers h2c with a grpc status in the trailers", async () => {
  const fake = await start();
  try {
    const refused = await rawCall(fake.vaultUrl, PUT_PATH);
    assert.deepEqual(refused, { status: 200, contentType: "application/grpc", grpcStatus: "16", error: null });
    const other = await rawCall(fake.vaultUrl, "/x.Y/Other");
    assert.deepEqual(other, { status: 200, contentType: "application/grpc", grpcStatus: "16", error: null });
  } finally {
    await fake.close();
  }
});

test("C-e831e54f the vault refuses unknown callers and callers without vault put", async () => {
  const fake = await start();
  try {
    const admin = fake.vaultAdmin;
    const body = putBody(req1());
    const rows: [Who | null, number, string][] = [
      [{ identity: "svcid_nobody", token: admin.token }, 16, "unauthenticated"],
      [null, 16, "unauthenticated"],
      [{ identity: admin.identity, token: "x" }, 16, "unauthenticated"],
      [{ identity: fake.vaultProxy.identity, token: admin.token }, 16, "unauthenticated"],
      [fake.vaultDenied, 7, "permission denied"],
    ];
    for (const [who, status, message] of rows) {
      const a = await send(fake, who, body);
      assert.deepEqual([a.grpcStatus, a.grpcMessage], [status, message]);
    }
    assert.deepEqual(fake.credentials(), []);
  } finally {
    await fake.close();
  }
});

test("C-e831e54f the vault refuses invalid fields with the row's message", async () => {
  const fake = await start();
  try {
    const bad = (over: Partial<VaultPutInput>): Buffer => putBody(req1(over));
    const tok = "header_name must be an HTTP token for auth_scheme 1";
    const origin = "target_url must be an http or https origin";
    const rows: [Buffer, string][] = [
      [bad({ tenantId: "tenant_a" }), "tenant_id must be a UUID"],
      [bad({ serviceId: S1.toUpperCase() }), "service_id must be a UUID"],
      [bad({ authScheme: 0 }), "auth_scheme must be 1 or 3"],
      [bad({ authScheme: 2 }), "auth_scheme must be 1 or 3"],
      [bad({ authScheme: 4 }), "auth_scheme must be 1 or 3"],
      [bad({ value: Buffer.alloc(0) }), "value must be 1 to 65536 bytes"],
      [bad({ value: Buffer.alloc(65537, "a") }), "value must be 1 to 65536 bytes"],
      [bad({ value: Buffer.from("a\nb") }), "value must be printable ASCII"],
      [bad({ headerName: "" }), tok],
      [bad({ headerName: "x bad" }), tok],
      [bad({ targetUrl: "http://tools.fake.test/base" }), origin],
      [bad({ targetUrl: "ftp://tools.fake.test" }), origin],
      [bad({ targetUrl: "" }), origin],
      [bad({ targetUrl: "http://tools.fake.test?x=1" }), origin],
      [bad({ targetUrl: "http://tools.fake.test/" }), origin],
      [bad({ targetUrl: "http://u:p@tools.fake.test" }), origin],
    ];
    for (const [body, message] of rows) {
      const a = await send(fake, fake.vaultAdmin, body);
      assert.deepEqual([a.grpcStatus, a.grpcMessage], [3, message]);
    }
    assert.deepEqual(fake.credentials(), []);
  } finally {
    await fake.close();
  }
});

test("C-e831e54f the vault refuses malformed frames and messages", async () => {
  const fake = await start();
  try {
    const bodies = [
      Buffer.from("0000000009" + "0102", "hex"),
      Buffer.from("0100000000", "hex"),
      Buffer.alloc(0),
      frame(Buffer.from("0a02fffe", "hex")),
      frame(Buffer.from("0a1061", "hex")),
    ];
    for (const body of bodies) {
      const a = await send(fake, fake.vaultAdmin, body);
      assert.equal(a.grpcStatus, 3);
    }
    assert.deepEqual(fake.credentials(), []);
  } finally {
    await fake.close();
  }
});

test("C-e831e54f the vault answers unimplemented for other RPCs", async () => {
  const fake = await start();
  try {
    const body = putBody(req1());
    const rpcs = [
      { path: "/mintkey.vault.v1.VaultAdapter/GetCredential" },
      { path: "/x.Y/PutCredential" },
      { path: PUT_PATH, method: "GET" },
    ];
    for (const rpc of rpcs) {
      const a = await send(fake, fake.vaultAdmin, body, rpc);
      assert.deepEqual([a.grpcStatus, a.grpcMessage], [12, "unimplemented"]);
    }
    assert.deepEqual(fake.credentials(), []);
  } finally {
    await fake.close();
  }
});

test("C-e831e54f the vault stores the edge cases that are valid", async () => {
  const fake = await start();
  try {
    const rows: Buffer[] = [
      putBody(req1({ serviceId: sid(5), value: Buffer.alloc(65536, "a") })),
      putBody(req1({ serviceId: sid(6), targetUrl: "https://tools.fake.test:8443" })),
      putBody(req1({ serviceId: sid(7), authScheme: 3, headerName: "" })),
      frame(
        Buffer.concat([
          encodePutRequest(req1({ serviceId: sid(8) })),
          Buffer.from("5203616263", "hex"),
        ]),
      ),
    ];
    for (const body of rows) {
      const a = await send(fake, fake.vaultAdmin, body);
      assert.equal(a.grpcStatus, 0);
    }
    const stored = fake.credentials();
    assert.deepEqual(
      stored.map((c) => c.serviceId),
      [sid(5), sid(6), sid(7), sid(8)],
    );
    assert.equal(stored[1]?.targetUrl, "https://tools.fake.test:8443");
  } finally {
    await fake.close();
  }
});
