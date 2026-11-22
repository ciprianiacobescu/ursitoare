import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeMcpName } from "./wire.ts";

function decode(raw: string): string | null {
  let out: string | null | undefined;
  assert.doesNotThrow(() => {
    try {
      out = decodeMcpName(raw);
    } catch (e) {
      if (e instanceof Error && e.message === "not implemented") throw e;
    }
  });
  assert.notEqual(out, undefined, `decodeMcpName(${JSON.stringify(raw)}) returned nothing`);
  return out as string | null;
}

describe("decodeMcpName", () => {
  it("C-285c5703 a plain value is returned unchanged", () => {
    assert.equal(decode("find_vendor"), "find_vendor");
    assert.equal(decode("=?base64?abc"), "=?base64?abc");
  });

  it("C-285c5703 a canonical base64 sentinel is decoded", () => {
    assert.equal(decode("=?base64?ZmluZF92ZW5kb3I=?="), "find_vendor");
    assert.equal(decode("=?base64?SGVsbG8sIOS4lueVjA==?="), "Hello, 世界");
    assert.equal(decode("=?base64??="), "");
  });

  it("C-285c5703 an invalid sentinel gives null", () => {
    assert.equal(decode("=?base64?literal?="), null);
    assert.equal(decode("=?base64?%%%?="), null);
    assert.equal(decode("=?base64?/w==?="), null);
    assert.equal(decode("=?base64?ZmluZF92ZW5kb3I?="), null);
  });
});
