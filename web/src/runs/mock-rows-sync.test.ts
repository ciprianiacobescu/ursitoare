/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { rowSyncStart, rowSyncStep, rowSyncView } from "./mock-rows.ts";
import type { MockNode, RowSync, RowSyncEvent, RowSyncView } from "./mock-rows.ts";

assert.equal(typeof rowSyncStart, "function");
assert.equal(typeof rowSyncStep, "function");
assert.equal(typeof rowSyncView, "function");

const N: MockNode[] = [
  { nodeId: "lookup", uses: "erp.lookup_vendor@1" },
  { nodeId: "pay", uses: "erp.create_payment@1" },
];

const KEPT = "Kept in step with the answers above.";
const MISMATCH = "The JSON no longer matches the answer rows; it is used as written.";
const NOT_JSON = "This is not valid JSON.";
const FORM_ERROR = "Fix the answers that are not valid JSON before you start.";
const PAY_TEXT = JSON.stringify({ pay: [{ output: { payment_id: "P-1" } }] }, null, 2);
const ERROR_TEXT = '{"pay":[{"error":{"code":"E","message":"m"}}]}';

function start(nodes: readonly MockNode[], text: string): RowSync {
  let result: RowSync | undefined;
  assert.doesNotThrow(() => {
    result = rowSyncStart(nodes, text);
  });
  assert.ok(result !== undefined);
  return result;
}

function step(nodes: readonly MockNode[], sync: RowSync, event: RowSyncEvent): RowSync {
  let result: RowSync | undefined;
  assert.doesNotThrow(() => {
    result = rowSyncStep(nodes, sync, event);
  });
  assert.ok(result !== undefined);
  return result;
}

function view(nodes: readonly MockNode[], sync: RowSync): RowSyncView {
  let result: RowSyncView | undefined;
  assert.doesNotThrow(() => {
    result = rowSyncView(nodes, sync);
  });
  assert.ok(result !== undefined);
  return result;
}

function expectView(nodes: readonly MockNode[], sync: RowSync, expected: Partial<RowSyncView>): void {
  assert.deepEqual(view(nodes, sync), {
    answerErrors: {},
    jsonError: null,
    hint: KEPT,
    formError: null,
    blocked: false,
    ...expected,
  });
}

function payRows(answers: string[]): { nodeId: string; answers: string[] }[] {
  return [
    { nodeId: "lookup", answers: [] },
    { nodeId: "pay", answers },
  ];
}

function typed(): RowSync {
  const s1 = start(N, "{}");
  const s2 = step(N, s1, { type: "add", nodeId: "pay" });
  return step(N, s2, { type: "answer", nodeId: "pay", index: 0, value: '{"payment_id":"P-1"}' });
}

test("C-fe487857 R1 the start keeps the text and reads the rows", () => {
  const s = start(N, "{}");
  assert.equal(s.text, "{}");
  assert.equal(s.source, "json");
  assert.deepEqual(s.rows, payRows([]));
  expectView(N, s, {});
});

test("C-fe487857 R2 an add on an empty row makes two blank answers and keeps the text", () => {
  const s = step(N, start(N, "{}"), { type: "add", nodeId: "pay" });
  assert.equal(s.text, "{}");
  assert.equal(s.source, "rows");
  assert.deepEqual(s.rows, payRows(["", ""]));
  expectView(N, s, {});
});

test("C-fe487857 R3 an answer rewrites the text", () => {
  const s = typed();
  assert.equal(s.text, PAY_TEXT);
  assert.equal(s.source, "rows");
  assert.deepEqual(s.rows, payRows(['{"payment_id":"P-1"}', ""]));
  expectView(N, s, {});
});

test("C-fe487857 R4 a bad answer keeps the text and blocks", () => {
  const s = step(N, typed(), { type: "answer", nodeId: "pay", index: 1, value: "{" });
  assert.equal(s.text, PAY_TEXT);
  assert.equal(s.source, "rows");
  expectView(N, s, { answerErrors: { "Output 2 for pay": NOT_JSON }, blocked: true });
});

test("C-fe487857 R5 an attempt adds the form error", () => {
  const bad = step(N, typed(), { type: "answer", nodeId: "pay", index: 1, value: "{" });
  const s = step(N, bad, { type: "attempt" });
  assert.equal(s.text, PAY_TEXT);
  assert.equal(s.attempted, true);
  expectView(N, s, {
    answerErrors: { "Output 2 for pay": NOT_JSON },
    blocked: true,
    formError: FORM_ERROR,
  });
});

test("C-fe487857 R6 removing the bad answer clears the error and the block", () => {
  const bad = step(N, typed(), { type: "answer", nodeId: "pay", index: 1, value: "{" });
  const attempted = step(N, bad, { type: "attempt" });
  const s = step(N, attempted, { type: "remove", nodeId: "pay", index: 1 });
  assert.equal(s.text, PAY_TEXT);
  assert.equal(s.source, "rows");
  assert.deepEqual(s.rows, payRows(['{"payment_id":"P-1"}']));
  expectView(N, s, {});
});

test("C-fe487857 R7 an error entry text keeps the rows and gives the mismatch hint", () => {
  const bad = step(N, typed(), { type: "answer", nodeId: "pay", index: 1, value: "{" });
  const removed = step(N, bad, { type: "remove", nodeId: "pay", index: 1 });
  const s = step(N, removed, { type: "text", text: ERROR_TEXT });
  assert.equal(s.text, ERROR_TEXT);
  assert.equal(s.source, "json");
  assert.deepEqual(s.rows, removed.rows);
  expectView(N, s, { hint: MISMATCH });
});

test("C-fe487857 R8 a broken text gives the json error", () => {
  const s = step(N, typed(), { type: "text", text: '{"pay"' });
  assert.equal(s.text, '{"pay"');
  assert.equal(s.source, "json");
  assert.deepEqual(s.rows, payRows(['{"payment_id":"P-1"}', ""]));
  expectView(N, s, { jsonError: NOT_JSON });
});

test("C-fe487857 a text that fits refills the rows and clears the attempt", () => {
  const bad = step(N, typed(), { type: "answer", nodeId: "pay", index: 1, value: "{" });
  const attempted = step(N, bad, { type: "attempt" });
  const text = '{"pay":[{"output":{"payment_id":"P-2"}}]}';
  const s = step(N, attempted, { type: "text", text });
  assert.equal(s.text, text);
  assert.equal(s.source, "json");
  assert.equal(s.attempted, false);
  assert.deepEqual(s.rows, payRows(['{\n  "payment_id": "P-2"\n}']));
  expectView(N, s, {});
});

test("C-fe487857 arrival keeps the typed text and fills the rows when it fits", () => {
  const text = '{"pay":[{"output":{"payment_id":"P-1"}}]}';
  const typedWhileLoading = step([], start([], "{}"), { type: "text", text });
  const a = start(N, typedWhileLoading.text);
  assert.equal(a.text, text);
  assert.deepEqual(a.rows, payRows(['{\n  "payment_id": "P-1"\n}']));
  expectView(N, a, {});
});

test("C-fe487857 arrival with an unknown node leaves the rows empty with the mismatch hint", () => {
  const text = '{"ghost":[]}';
  const typedWhileLoading = step([], start([], "{}"), { type: "text", text });
  const a = start(N, typedWhileLoading.text);
  assert.equal(a.text, text);
  assert.deepEqual(a.rows, payRows([]));
  expectView(N, a, { hint: MISMATCH });
});

test("C-fe487857 with no nodes the view is empty and a remove on no answers keeps the text", () => {
  const typedS = step(N, start(N, "{}"), { type: "text", text: "{" });
  assert.deepEqual(view([], typedS), {
    answerErrors: {},
    jsonError: null,
    hint: null,
    formError: null,
    blocked: false,
  });
  const removed = step(N, start(N, "{}"), { type: "remove", nodeId: "pay", index: 0 });
  assert.equal(removed.text, "{}");
  assert.deepEqual(removed.rows, payRows([]));
  expectView(N, removed, {});
});
