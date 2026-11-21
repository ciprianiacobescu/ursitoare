/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { inputFormModelFor, loadRunDocument, runDocumentWanted } from "./input-form.ts";
import type { InputFormModel, RunDocument } from "./input-form.ts";

assert.equal(typeof runDocumentWanted, "function");
assert.equal(typeof loadRunDocument, "function");
assert.equal(typeof inputFormModelFor, "function");

const HASH = "sha256:" + "a".repeat(64);
const V = {
  flowId: "demo-pay",
  number: 1,
  hash: HASH,
  state: "validated",
  surface: "yaml",
  author: "u_alice",
  requestedBy: null,
  createdAt: "2026-11-06T10:00:00.000000Z",
  validatedAt: null,
  validationOk: null,
  text: "t",
  canonical: { inputs: 1 },
  result: null,
};

const D = {
  flow: "demo-pay",
  inputs: {
    type: "object",
    required: ["vendor_name", "amount"],
    properties: { amount: { type: "number" }, vendor_name: { type: "string" } },
  },
};

const NO_INPUTS = "This flow declares no inputs.";
const UNREADABLE = "The inputs of this version could not be read, so enter the input as JSON.";

type Recorded = [string, unknown];

function fakeClient(answer: unknown): {
  client: { get: <T>(path: string, opts?: unknown) => Promise<T> };
  records: Recorded[];
} {
  const records: Recorded[] = [];
  const client = {
    get: <T>(path: string, opts?: unknown): Promise<T> => {
      records.push([path, opts]);
      return Promise.resolve(answer as T);
    },
  };
  return { client: client as never, records };
}

function modelFor(document: RunDocument): InputFormModel | null {
  let result: InputFormModel | null | undefined;
  assert.doesNotThrow(() => {
    result = inputFormModelFor(document);
  });
  assert.notEqual(result, undefined);
  return result ?? null;
}

test("C-6fd95d86 runDocumentWanted is true only for a version with no document", () => {
  let values: boolean[] = [];
  assert.doesNotThrow(() => {
    values = [
      runDocumentWanted(null, null),
      runDocumentWanted({ hash: HASH }, null),
      runDocumentWanted({ hash: HASH }, { inputs: 1 }),
      runDocumentWanted({ hash: HASH }, undefined),
    ];
  });
  assert.deepEqual(values, [false, true, false, true]);
});

test("C-6fd95d86 loadRunDocument reads the version and gives its canonical", async () => {
  const { client, records } = fakeClient(V);
  let result: unknown;
  await assert.doesNotReject(async () => {
    result = await loadRunDocument(client, "demo-pay", V.hash);
  });
  assert.deepEqual(result, { inputs: 1 });
  assert.deepEqual(records, [["/flows/demo-pay/versions/sha256%3A" + "a".repeat(64), undefined]]);
});

test("C-6fd95d86 loadRunDocument refuses a malformed answer", async () => {
  const { client } = fakeClient({ nope: 1 });
  let failure: unknown = null;
  try {
    await loadRunDocument(client, "demo-pay", V.hash);
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof ApiRequestError, "rejects with ApiRequestError");
  assert.equal(failure.status, 200);
  assert.equal(failure.code, "INVALID_RESPONSE");
});

test("C-6fd95d86 loadRunDocument refuses a bad flow id before any call", async () => {
  const { client, records } = fakeClient(V);
  let failure: unknown = null;
  try {
    await loadRunDocument(client, "Bad_Id", V.hash);
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof RangeError, "rejects with RangeError");
  assert.equal(records.length, 0);
});

test("C-6fd95d86 inputFormModelFor gives the model of each phase", () => {
  assert.equal(modelFor({ phase: "none" }), null);
  assert.equal(modelFor({ phase: "loading" }), null);
  assert.deepEqual(modelFor({ phase: "failed" }), { kind: "json", reason: UNREADABLE });
  assert.deepEqual(modelFor({ phase: "ready", canonical: { flow: "x" } }), {
    kind: "json",
    reason: NO_INPUTS,
  });
  const ready = modelFor({ phase: "ready", canonical: D });
  assert.ok(ready !== null && ready.kind === "form");
  assert.deepEqual(
    ready.fields.fields.map((field) => field.name),
    ["vendor_name", "amount"],
  );
});
