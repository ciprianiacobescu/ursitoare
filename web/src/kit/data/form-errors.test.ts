/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../../api/client.ts";
import { FALLBACK_MESSAGE, messageFor } from "../messages.ts";
import { mapEnvelopeErrors } from "./form-errors.ts";
import type { FormErrors } from "./form-errors.ts";

assert.equal(typeof mapEnvelopeErrors, "function");

const FORM_KEY = "$form";
const VALIDATION_TEXT = "Some of the information is not valid. Check it and try again.";

interface FieldEntry {
  readonly field: string;
  readonly message: string;
}

function entry(field: string, message: string): FieldEntry {
  return { field, message };
}

function validationError(details: unknown): ApiRequestError {
  return new ApiRequestError(400, "VALIDATION_FAILED", "never shown", { details });
}

function mapped(error: unknown, fields: readonly string[], name: string): FormErrors {
  let result: FormErrors | undefined;
  assert.doesNotThrow(() => {
    result = mapEnvelopeErrors(error, fields);
  }, `${name} maps without throwing`);
  assert.ok(result !== undefined, `${name} produced a result`);
  return result;
}

test("C-56d95a76 known fields take their message and unknown entries join the form message", () => {
  const first = mapped(
    validationError({
      fields: [
        entry("body/name", "too short"),
        entry("body/tags/0", "must be string"),
        entry("body/name", "second"),
      ],
    }),
    ["name", "tags", "due"],
    "the first mapping",
  );
  assert.deepEqual(first, { name: "too short", tags: "must be string" });

  const second = mapped(
    validationError({
      fields: [
        entry("body/zzz", "extra"),
        entry("querystring/limit", "bad"),
        entry("body", "malformed JSON"),
        entry("body/name", "required"),
      ],
    }),
    ["name"],
    "the second mapping",
  );
  assert.deepEqual(second, {
    name: "required",
    [FORM_KEY]: `${VALIDATION_TEXT} body/zzz: extra; querystring/limit: bad; body: malformed JSON`,
  });
});

test("C-8e9e0bb2 unusable details and other codes keep the catalogue text", () => {
  const unusable: readonly [string, unknown][] = [
    ["details that are absent", undefined],
    ["a fields that is text", { fields: "x" }],
    ["an empty fields list", { fields: [] }],
    ["entries without a field and message", { fields: [5, null, { field: 1, message: "x" }] }],
  ];
  for (const [name, details] of unusable) {
    const result = mapped(validationError(details), ["name"], name);
    assert.deepEqual(result, { [FORM_KEY]: VALIDATION_TEXT }, `${name} falls back to the catalogue text`);
  }

  const forbidden = mapped(new ApiRequestError(403, "FORBIDDEN", "SELECT * FROM t"), ["name"], "the forbidden code");
  assert.deepEqual(forbidden, { [FORM_KEY]: messageFor("FORBIDDEN") });

  const locked = mapped(new ApiRequestError(409, "FLOW_LOCKED", "raw"), ["name"], "the unknown code");
  assert.deepEqual(locked, { [FORM_KEY]: FALLBACK_MESSAGE });

  const plain = mapped(new Error("boom"), ["name"], "a plain error");
  assert.deepEqual(plain, { [FORM_KEY]: FALLBACK_MESSAGE });

  assert.ok(!JSON.stringify(forbidden)?.includes("SELECT *"), "the forbidden error never shows the server's SQL text");
  assert.ok(!JSON.stringify(locked)?.includes("raw"), "the locked error never shows the server's message");
  assert.ok(!JSON.stringify(plain)?.includes("boom"), "a plain error never shows its own message");
});

test("C-76ec796a hostile and oversized messages are shown unchanged or capped", () => {
  const markup = mapped(
    validationError({ fields: [entry("body/name", "<img src=x onerror=alert(1)>")] }),
    ["name"],
    "the markup message",
  );
  assert.deepEqual(markup, { name: "<img src=x onerror=alert(1)>" });

  const capped = mapped(
    validationError({ fields: [entry("body/name", "a".repeat(300))] }),
    ["name"],
    "the 300 character message",
  );
  assert.deepEqual(capped, { name: `${"a".repeat(199)}…` });
});

test("C-76ec796a a proto pseudo field never lands on the result object", () => {
  const result = mapped(
    validationError({ fields: [entry("body/__proto__", "injected")] }),
    ["name"],
    "the proto entry",
  );
  assert.deepEqual(result, { [FORM_KEY]: `${VALIDATION_TEXT} body/__proto__: injected` });
  assert.ok(!Object.hasOwn(result, "__proto__"), "the result has no own proto property");
  assert.equal(Object.getPrototypeOf(result), Object.prototype, "the prototype of the result is unchanged");
});

test("C-76ec796a messages and fields are cleaned and cut to their caps", () => {
  const dirty = mapped(
    validationError({ fields: [entry("body/name", "\tv\u0001a\r\r  l\u007fid  ")] }),
    ["name"],
    "the dirty message",
  );
  assert.deepEqual(dirty, { name: "v a l id" });

  const blank = mapped(validationError({ fields: [entry("body/due", "   ")] }), ["name", "due"], "the blank message");
  assert.deepEqual(blank, { due: "Not valid" });

  const many: FieldEntry[] = [];
  for (let index = 0; index < 100; index += 1) {
    many.push(entry(`body/u${index}`, "x"));
  }
  const capped = mapped(
    validationError({ fields: [...many, entry("body/name", "late")] }),
    ["name"],
    "the 101 entry error",
  );
  assert.deepEqual(capped, { [FORM_KEY]: `${VALIDATION_TEXT} body/u0: x; body/u1: x; body/u2: x` });

  const longField = mapped(
    validationError({ fields: [entry(`body/${"z".repeat(100)}`, "m")] }),
    [],
    "the long field",
  );
  assert.deepEqual(longField, { [FORM_KEY]: `${VALIDATION_TEXT} body/${"z".repeat(75)}: m` });
});
