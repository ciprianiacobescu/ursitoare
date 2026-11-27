/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { discoverBody, type DiscoverDraft } from "./review.ts";

test("C-c4fa5fc4 discoverBody rejects a carried-only key outside the pattern (R1a)", () => {
  assert.throws(
    () => discoverBody({ carried: { "has space": { name: "x" } } } as unknown as DiscoverDraft),
    RangeError,
  );
  assert.throws(
    () => discoverBody({ carried: { "": { name: "x" } } } as unknown as DiscoverDraft),
    RangeError,
  );
});

test("C-c4fa5fc4 discoverBody rejects more than 100 carried-only keys (R1b)", () => {
  const tooMany = Object.fromEntries(
    Array.from({ length: 101 }, (_, i) => [`t${i}`, { name: "n" }]),
  );
  assert.throws(
    () => discoverBody({ carried: tooMany } as unknown as DiscoverDraft),
    RangeError,
  );
  const ok = Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [`t${i}`, { name: "n" }]),
  );
  assert.doesNotThrow(() => discoverBody({ carried: ok } as unknown as DiscoverDraft));
});

test("C-c4fa5fc4 discoverBody emits an overlay entry from carried-only fields (R1c)", () => {
  assert.deepEqual(
    discoverBody({ carried: { foo: { name: "bar", unsafe_to_retry: false } } } as unknown as DiscoverDraft),
    { tools: { foo: { name: "bar", unsafe_to_retry: false } } },
  );
});

test("C-c4fa5fc4 discoverBody omits a carried-only __proto__ key (R1d)", () => {
  const carried = Object.create(null) as Record<string, unknown>;
  carried["__proto__"] = { name: "x" };
  carried["b"] = { name: "y" };
  assert.deepEqual(
    discoverBody({ carried } as unknown as DiscoverDraft),
    { tools: { b: { name: "y" } } },
  );
});

test("C-c4fa5fc4 discoverBody counts carried-only keys against the 100 limit across maps (R1e)", () => {
  const effects = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`e${i}`, "read"]));
  const carried = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`c${i}`, { name: "n" }]));
  assert.throws(
    () => discoverBody({ effects, carried } as unknown as DiscoverDraft),
    RangeError,
  );
});
