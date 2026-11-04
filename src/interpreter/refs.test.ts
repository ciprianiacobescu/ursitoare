import assert from "node:assert/strict";
import { test } from "node:test";

import type { JsonValue } from "../authoring/index.ts";
import { InterpreterError, resolveValue } from "./index.ts";
import type { RunScope } from "./index.ts";

assert.equal(typeof resolveValue, "function");

const UNRESOLVED = [
  "${{ inputs.missing }}",
  "${{ inputs.invoice.tags.0 }}",
  "${{ inputs.invoice.id.length }}",
  "${{ inputs.invoice.constructor }}",
  "${{ nodes.route.output.x }}",
  "${{ nodes.lookup.outcome }}",
  "${{ inputs.invoice.id",
];

function makeScope(): RunScope {
  return {
    inputs: {
      invoice: { id: "inv-1", total: 120, tags: ["a"] },
      flag: false,
      none: null,
    },
    nodes: new Map([
      ["lookup", { output: { vendor_id: "v1", status: "active", nested: { k: 1 } }, outcome: null }],
      ["route", { output: null, outcome: "active" }],
    ]),
  };
}

interface Resolution {
  value?: JsonValue;
  error?: unknown;
}

function resolve(value: unknown, scope: RunScope): Resolution {
  try {
    return { value: resolveValue(value, scope) };
  } catch (error) {
    return { error };
  }
}

function errorOf(result: Resolution, label: string): InterpreterError {
  assert.ok(
    result.error instanceof InterpreterError,
    `${label} threw ${String(result.error)}`,
  );
  return result.error;
}

test("C-18f9cf20 single references keep their type and templates stringify", () => {
  const scope = makeScope();

  const total = resolve("${{ inputs.invoice.total }}", scope);
  assert.equal(total.error, undefined, `unexpected error: ${String(total.error)}`);
  assert.equal(total.value, 120);

  const nested = resolve("${{ nodes.lookup.output.nested }}", scope);
  assert.equal(nested.error, undefined, `unexpected error: ${String(nested.error)}`);
  assert.deepEqual(nested.value, { k: 1 });
  const nestedValue = nested.value as unknown as { k: number };
  nestedValue.k = 9;
  assert.deepEqual(scope.nodes.get("lookup")?.output, {
    vendor_id: "v1",
    status: "active",
    nested: { k: 1 },
  });

  const outcome = resolve("${{ nodes.route.outcome }}", scope);
  assert.equal(outcome.error, undefined, `unexpected error: ${String(outcome.error)}`);
  assert.equal(outcome.value, "active");

  const template = resolve(
    "Pay ${{ inputs.invoice.id }}: ${{ inputs.invoice.total }} ${{ nodes.lookup.output.nested }}",
    scope,
  );
  assert.equal(template.error, undefined, `unexpected error: ${String(template.error)}`);
  assert.equal(template.value, 'Pay inv-1: 120 {"k":1}');

  const nestedObject = resolve({ a: ["${{ inputs.none }}", "plain", 7] }, scope);
  assert.equal(nestedObject.error, undefined, `unexpected error: ${String(nestedObject.error)}`);
  assert.deepEqual(nestedObject.value, { a: [null, "plain", 7] });
});

test("C-18f9cf20 own proto keys are copied without changing the prototype", () => {
  const scope = makeScope();
  const input = JSON.parse('{"__proto__":"${{ inputs.invoice.id }}","ok":1}') as unknown;

  const result = resolve(input, scope);
  assert.equal(result.error, undefined, `unexpected error: ${String(result.error)}`);
  const value = result.value as unknown as { [key: string]: JsonValue };
  assert.deepEqual(Object.keys(value), ["__proto__", "ok"]);
  assert.equal(value["__proto__"], "inv-1");
  assert.equal(Object.getPrototypeOf(value), Object.prototype);
});

test("C-18f9cf20 unresolved references throw with the reference and never a value", () => {
  const scope = makeScope();

  for (const text of UNRESOLVED) {
    const error = errorOf(resolve(text, scope), text);
    assert.equal(error.code, "INTERPRETER_REF_UNRESOLVED");
  }

  const missing = errorOf(resolve(UNRESOLVED[0] ?? "", scope), "inputs missing");
  assert.equal(missing.details.ref, "inputs.missing");

  const length = errorOf(resolve(UNRESOLVED[2] ?? "", scope), "id length");
  assert.ok(
    !length.message.includes("inv-1"),
    "the message names the reference, not a value",
  );
});
