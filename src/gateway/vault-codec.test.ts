import assert from "node:assert/strict";
import { test } from "node:test";
import { GatewayError } from "./types.ts";
import type { PutCredentialInput } from "./vault.ts";
import { decodePutCredentialResponse, encodePutCredentialRequest } from "./vault.ts";

assert.equal(typeof encodePutCredentialRequest, "function");
assert.equal(typeof decodePutCredentialResponse, "function");

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
const hex = (bytes: Uint8Array | undefined): string => Buffer.from(bytes ?? []).toString("hex");
const bytes = (text: string): Uint8Array => Uint8Array.from(Buffer.from(text, "hex"));

const IN1: PutCredentialInput = {
  tenantId: "4b8a2c1e-0000-8000-8000-000000000001",
  serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01",
  authScheme: "API_KEY_HEADER",
  value: utf8("kv-secret-7f3a"),
  headerName: "x-fake-tools-key",
  callerActorId: "carol",
  targetUrl: "http://tools.fake.test",
};
const IN2: PutCredentialInput = {
  ...IN1,
  serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02",
  authScheme: "BEARER_TOKEN",
  value: utf8("bt-secret-9c1d"),
  headerName: null,
  targetUrl: "https://tools.fake.test",
};
const ENC1 =
  "0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530311801220e6b762d7365637265742d376633613210782d66616b652d746f6f6c732d6b657942056361726f6c4a16687474703a2f2f746f6f6c732e66616b652e74657374";
const ENC2 =
  "0a2434623861326331652d303030302d383030302d383030302d303030303030303030303031122430623266376531632d356430612d346334652d396135312d3366326238643663316530321803220e62742d7365637265742d3963316442056361726f6c4a1768747470733a2f2f746f6f6c732e66616b652e74657374";

test("C-5095674e encode IN1 matches ENC1 byte for byte", () => {
  let out: Uint8Array | undefined;
  assert.doesNotThrow(() => {
    out = encodePutCredentialRequest(IN1);
  });
  assert.equal(hex(out), ENC1);
  assert.equal(out?.length, 143);
});

test("C-5095674e encode IN2 matches ENC2 and omits the header field", () => {
  let out: Uint8Array | undefined;
  assert.doesNotThrow(() => {
    out = encodePutCredentialRequest(IN2);
  });
  assert.equal(hex(out), ENC2);
  assert.equal(out?.length, 126);
});

test("C-5095674e encode a 300 byte value uses a two byte length", () => {
  let out: Uint8Array | undefined;
  assert.doesNotThrow(() => {
    out = encodePutCredentialRequest({ ...IN1, value: new Uint8Array(300).fill(0x61) });
  });
  assert.ok(hex(out).includes("22ac02" + "61".repeat(300)));
});

test("C-5095674e decode reads the key version of accepted messages", () => {
  const accepted: Array<[string, number]> = [
    ["0801", 1],
    ["08ac02", 300],
    ["08011200", 1],
    ["12000802", 2],
    ["50010803", 3],
    ["08ffffffff07", 2147483647],
  ];
  for (const [message, keyVersion] of accepted) {
    let out: { keyVersion: number } | undefined;
    assert.doesNotThrow(() => {
      out = decodePutCredentialResponse(bytes(message));
    });
    assert.equal(out?.keyVersion, keyVersion, message);
  }
});

test("C-5095674e decode refuses malformed messages with GATEWAY_UNAVAILABLE", () => {
  const refused = ["", "0800", "08", "0a01", "088080808008", "08ffffffffff0f", "1200", "08010a"];
  for (const message of refused) {
    assert.throws(
      () => decodePutCredentialResponse(bytes(message)),
      (error: unknown) =>
        error instanceof GatewayError &&
        error.code === "GATEWAY_UNAVAILABLE" &&
        error.details["stage"] === "vault",
      message,
    );
  }
});
