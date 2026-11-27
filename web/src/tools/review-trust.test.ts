/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  discoverBody,
  initialDraft,
  parseReviewTools,
  type DiscoverDraft,
} from "./review.ts";
import {
  carriedAfterEffect,
  discoverSettings,
  storedTools,
  type Carried,
  type ToolTrust,
} from "./trust.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

type TrustDraft = DiscoverDraft & {
  trust?: Readonly<Record<string, ToolTrust>>;
  carried?: Readonly<Record<string, Carried>>;
};

const IO = { type: "object" };

function M(name: string): Record<string, unknown> {
  return {
    kind: "mcp",
    endpoint: "/mcp",
    name,
    protocolVersion: "2026-07-28",
    output: "structured",
  };
}

function T(
  name: string,
  effect: string,
  callSpec: unknown,
  over?: Record<string, unknown>,
): Record<string, unknown> {
  const tool: Record<string, unknown> = {
    name,
    effect,
    input: IO,
    output: IO,
    call: callSpec,
  };
  if (over !== undefined) Object.assign(tool, over);
  return tool;
}

function S(...tools: unknown[]): { tools: unknown[] } {
  return { tools };
}

const FIND = T("find_vendor", "read", M("find_vendor"), {
  untrusted_result: false,
  data_class: "private",
});
const NOTE = T("note", "write", M("Log.Note"), { unsafe_to_retry: false });
const PLAIN = T("plain", "write", M("plain"));
const MS = S(FIND, NOTE, PLAIN);

function trust(trusted: boolean, dataClass: ToolTrust["dataClass"]): ToolTrust {
  return { trusted, dataClass };
}

test("C-cbd5fcec review-trust builds the overlay body from trust and carried fields (DB0 to DB6)", () => {
  assert.equal(typeof storedTools, "function");
  assert.equal(typeof discoverSettings, "function");
  assert.equal(typeof carriedAfterEffect, "function");

  // DB0: frozen B1 and B2 rows still hold.
  assert.deepEqual(discoverBody({ effects: {} }), { tools: {} });
  assert.deepEqual(discoverBody({ effects: { find_vendor: "read", log_note: "" } }), {
    tools: { find_vendor: { effect: "read" } },
  });

  const sm = call(() => storedTools(MS));
  assert.ok(sm !== null);
  const ds1 = call(() => discoverSettings(sm));

  const tools = call(() => parseReviewTools(MS));
  assert.ok(tools !== null);

  // DB1
  const draft1: TrustDraft = {
    ...initialDraft(tools),
    trust: ds1.trust,
    carried: ds1.carried,
  };
  assert.deepEqual(call(() => discoverBody(draft1)), {
    tools: {
      find_vendor: { effect: "read", untrusted_result: false, data_class: "private" },
      "Log.Note": { name: "note", unsafe_to_retry: false },
    },
  });

  // DB2
  const ca = call(() => carriedAfterEffect("mcp", sm, "Log.Note", "send", "note"));
  const draft2: TrustDraft = {
    effects: { find_vendor: "read", "Log.Note": "send" },
    names: { "Log.Note": "note" },
    trust: ds1.trust,
    carried: { "Log.Note": ca },
  };
  assert.deepEqual(call(() => discoverBody(draft2)), {
    tools: {
      find_vendor: { effect: "read", untrusted_result: false, data_class: "private" },
      "Log.Note": { effect: "send", name: "note" },
    },
  });

  // DB3
  const draft3: TrustDraft = {
    effects: { find_vendor: "skip" },
    trust: ds1.trust,
    carried: ds1.carried,
  };
  assert.deepEqual(call(() => discoverBody(draft3)), {
    tools: {
      find_vendor: { skip: true },
      "Log.Note": { unsafe_to_retry: false },
    },
  });

  // DB4
  assert.deepEqual(
    call(() =>
      discoverBody({
        effects: { a: "read" },
        names: { a: "finder" },
        trust: { a: trust(true, null) },
        carried: {},
      } as TrustDraft),
    ),
    { tools: { a: { effect: "read", name: "finder", untrusted_result: false } } },
  );

  // DB5
  assert.deepEqual(
    call(() => discoverBody({ trust: { a: trust(true, null) } } as unknown as TrustDraft)),
    { tools: { a: { untrusted_result: false } } },
  );
  assert.deepEqual(
    call(() =>
      discoverBody({
        trust: {
          __proto__: trust(true, null),
          b: trust(true, null),
        },
      } as unknown as TrustDraft),
    ),
    { tools: { b: { untrusted_result: false } } },
  );
  assert.deepEqual(
    call(() => discoverBody({ effects: { toString: "read" } } as unknown as DiscoverDraft)),
    { tools: { toString: { effect: "read" } } },
  );

  // DB6
  assert.throws(
    () =>
      discoverBody({
        trust: { a: trust(false, "x" as unknown as ToolTrust["dataClass"]) },
      } as unknown as TrustDraft),
    RangeError,
  );
  assert.throws(
    () =>
      discoverBody({
        trust: { "has space": trust(true, null) },
      } as unknown as TrustDraft),
    RangeError,
  );
  const tooMany = Object.fromEntries(
    Array.from({ length: 101 }, (_, i) => [`t${i}`, "read"]),
  );
  const tooManyDraft: Record<string, unknown> = { effects: tooMany };
  assert.throws(() => discoverBody(tooManyDraft as unknown as DiscoverDraft), RangeError);
  const ok = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`t${i}`, "read"]));
  assert.doesNotThrow(() => discoverBody({ effects: ok } as unknown as DiscoverDraft));
});
