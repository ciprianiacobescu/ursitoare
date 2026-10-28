import assert from "node:assert/strict";
import { test } from "node:test";

import { entityRef, formatUid, hostOf, toDecimal } from "./values.ts";

test("C-7912bb0b entity references and uids", () => {
  assert.doesNotThrow(() => {
    assert.deepEqual(entityRef("Tool", "mail"), { __entity: { type: "Tool", id: "mail" } });
    assert.equal(formatUid({ type: "User", id: 'a"b' }), 'User::"a\\"b"');
    assert.equal(formatUid(null as never), "(invalid)");
  });
});

test("C-d886fc50 decimals do not round", () => {
  assert.doesNotThrow(() => {
    assert.deepEqual(toDecimal(10000), { __extn: { fn: "decimal", arg: "10000.0000" } });
    assert.deepEqual(toDecimal(0.1), { __extn: { fn: "decimal", arg: "0.1000" } });
  });
  assert.throws(() => toDecimal(1.23456), RangeError);
  assert.throws(() => toDecimal(Number.NaN), RangeError);
});

test("C-3eb55a5b the host is the parsed host", () => {
  assert.doesNotThrow(() => {
    assert.equal(hostOf("https://evil.test/.example.com/x"), "evil.test");
    assert.equal(hostOf("https://EXAMPLE.com:8443/a"), "example.com");
  });
  assert.throws(() => hostOf("not a url"), TypeError);
});
