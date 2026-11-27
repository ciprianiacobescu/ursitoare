/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { discoverBody, type DiscoverDraft } from "./review.ts";

test("C-cbd5fcec discoverBody keeps a carried-only key beside a skipped tool (DB3)", () => {
  const draft = {
    effects: { find_vendor: "skip" },
    trust: { find_vendor: { trusted: true, dataClass: "private" } },
    carried: { "Log.Note": { unsafe_to_retry: false } },
  } as unknown as DiscoverDraft;
  assert.deepEqual(discoverBody(draft), {
    tools: {
      find_vendor: { skip: true },
      "Log.Note": { unsafe_to_retry: false },
    },
  });
});

test("C-c4fa5fc4 discoverBody validates and emits a carried-only key", () => {
  assert.throws(
    () =>
      discoverBody({
        effects: {},
        carried: { "has space": { name: "x" } },
      } as unknown as DiscoverDraft),
    RangeError,
  );
  assert.throws(
    () => discoverBody({ carried: { "": { name: "x" } } } as unknown as DiscoverDraft),
    RangeError,
  );
  const tooMany = Object.fromEntries(
    Array.from({ length: 101 }, (_, i) => [`t${i}`, { name: "n" }]),
  );
  assert.throws(
    () => discoverBody({ carried: tooMany } as unknown as DiscoverDraft),
    RangeError,
  );
  assert.deepEqual(
    discoverBody({
      carried: { foo: { name: "bar", unsafe_to_retry: false } },
    } as unknown as DiscoverDraft),
    { tools: { foo: { name: "bar", unsafe_to_retry: false } } },
  );
});
