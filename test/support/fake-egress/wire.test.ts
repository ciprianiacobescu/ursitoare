import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decodePutRequest,
  decodePutResponse,
  encodePutRequest,
  encodePutResponse,
  frame,
  unframe,
  WireError,
} from "./wire.ts";

const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";

const REQ1_HEX =
  "0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530311801220e6b762d7365637265742d376633613210782d66616b652d746f6f6c732d6b657942056361726f6c4a16687474703a2f2f746f6f6c732e66616b652e74657374";
const REQ2_HEX =
  "0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530321803220e62742d7365637265742d3963316442056361726f6c4a1768747470733a2f2f746f6f6c732e66616b652e74657374";

const REQ1 = {
  tenantId: T_A,
  serviceId: S1,
  authScheme: 1,
  value: Buffer.from("kv-secret-7f3a"),
  headerName: "x-fake-tools-key",
  callerActorId: "carol",
  targetUrl: "http://tools.fake.test",
};
const REQ2 = {
  tenantId: T_A,
  serviceId: S2,
  authScheme: 3,
  value: Buffer.from("bt-secret-9c1d"),
  headerName: "",
  callerActorId: "carol",
  targetUrl: "https://tools.fake.test",
};

function caught(fn: () => unknown): unknown {
  let err: unknown;
  assert.doesNotThrow(() => {
    try {
      fn();
    } catch (e) {
      err = e;
      if (e instanceof Error && e.message === "not implemented") throw e;
    }
  });
  return err;
}

describe("wire", () => {
  it("C-0bc1717c encodePutRequest equals the REQ1 and REQ2 vectors", () => {
    let a = "";
    let b = "";
    assert.doesNotThrow(() => {
      a = encodePutRequest(REQ1).toString("hex");
      b = encodePutRequest(REQ2).toString("hex");
    });
    assert.equal(a, REQ1_HEX);
    assert.equal(b, REQ2_HEX);
  });

  it("C-0bc1717c decodePutRequest returns the inputs", () => {
    let r1: ReturnType<typeof decodePutRequest> | undefined;
    let r2: ReturnType<typeof decodePutRequest> | undefined;
    assert.doesNotThrow(() => {
      r1 = decodePutRequest(Buffer.from(REQ1_HEX, "hex"));
      r2 = decodePutRequest(Buffer.from(REQ2_HEX, "hex"));
    });
    assert.deepEqual(r1, { ...REQ1, value: Buffer.from(REQ1.value) });
    assert.deepEqual(r2, { ...REQ2, value: Buffer.from(REQ2.value) });
  });

  it("C-0bc1717c response frames carry the key version", () => {
    let out: string[] = [];
    assert.doesNotThrow(() => {
      out = [1, 2].map((v) => frame(encodePutResponse(v)).toString("hex"));
    });
    assert.deepEqual(out, ["000000000408011200", "000000000408021200"]);
  });

  it("C-0bc1717c decodePutResponse round-trips 1, 2 and 300", () => {
    let out: number[] = [];
    assert.doesNotThrow(() => {
      out = [1, 2, 300].map((v) => decodePutResponse(encodePutResponse(v)));
    });
    assert.deepEqual(out, [1, 2, 300]);
  });

  it("C-0bc1717c unframe returns the message of one frame", () => {
    let out = "";
    assert.doesNotThrow(() => {
      out = unframe(Buffer.from("000000000408011200", "hex")).toString("hex");
    });
    assert.equal(out, "08011200");
  });

  it("C-0bc1717c unframe throws WireError for V22 to V24", () => {
    const bodies = ["00000000090102", "0100000000", ""];
    const errs = bodies.map((h) => caught(() => unframe(Buffer.from(h, "hex"))));
    for (const e of errs) assert.ok(e instanceof WireError);
  });

  it("C-0bc1717c decodePutRequest throws WireError for V25 and V26", () => {
    const msgs = ["0a02fffe", "0a1061"];
    const errs = msgs.map((h) => caught(() => decodePutRequest(Buffer.from(h, "hex"))));
    for (const e of errs) assert.ok(e instanceof WireError);
  });
});
