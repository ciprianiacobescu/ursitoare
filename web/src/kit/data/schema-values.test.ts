/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../../api/client.ts";
import { FALLBACK_MESSAGE } from "../messages.ts";
import { schemaToFields } from "./schema-fields.ts";
import type { SchemaFields } from "./schema-fields.ts";
import { initialValues, submitValues, validateValues } from "./schema-values.ts";
import type { RawValues, SubmitResult, ValidatedValues } from "./schema-values.ts";

assert.equal(typeof validateValues, "function");
assert.equal(typeof initialValues, "function");
assert.equal(typeof submitValues, "function");

const FORM_KEY = "$form";
const UNSUPPORTED_TEXT =
  "This form cannot be sent because part of its definition is not supported. Ask an administrator to fix it.";

function parsed(schema: unknown, name: string): SchemaFields {
  let result: SchemaFields | undefined;
  assert.doesNotThrow(() => {
    result = schemaToFields(schema);
  }, `${name} parses without throwing`);
  assert.ok(result !== undefined, `${name} parsed to fields`);
  return result;
}

function everyKind(name: string): SchemaFields {
  return parsed(
    {
      type: "object",
      required: ["title", "count"],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 40, pattern: "^[A-Z]", description: "Short name" },
        count: { type: "integer", minimum: 1, maximum: 9 },
        ratio: { type: "number" },
        urgent: { type: "boolean", title: "Rush it", description: "Escalate it" },
        kind: { type: "string", enum: ["bug", "task"] },
        tags: { type: "array", items: { type: "string", minLength: 2 } },
        due_date: { type: "string" },
      },
    },
    name,
  );
}

function initial(fields: SchemaFields, name: string): RawValues {
  let result: RawValues | undefined;
  assert.doesNotThrow(() => {
    result = initialValues(fields);
  }, `${name} builds initial values`);
  assert.ok(result !== undefined, `${name} produced initial values`);
  return result;
}

function validated(fields: SchemaFields, raw: RawValues, name: string): ValidatedValues {
  let result: ValidatedValues | undefined;
  assert.doesNotThrow(() => {
    result = validateValues(fields, raw);
  }, `${name} validates without throwing`);
  assert.ok(result !== undefined, `${name} produced a validation result`);
  return result;
}

async function submitted(
  fields: SchemaFields,
  raw: RawValues,
  send: (value: Record<string, unknown>) => Promise<void>,
  name: string,
): Promise<SubmitResult> {
  let result: SubmitResult | undefined;
  await assert.doesNotReject(async () => {
    result = await submitValues(fields, raw, send);
  }, `${name} submits without throwing`);
  assert.ok(result !== undefined, `${name} produced a submit result`);
  return result;
}

function withValues(base: RawValues, changes: Readonly<Record<string, string | boolean>>): RawValues {
  return { ...base, ...changes };
}

test("C-412941ac validateValues applies the required, text and number rules", () => {
  const fields = everyKind("the every supported kind schema");
  const blank = initial(fields, "the every supported kind schema");
  assert.deepEqual(blank, {
    title: "",
    count: "",
    ratio: "",
    urgent: false,
    kind: "",
    tags: "",
    due_date: "",
  });

  const empty = validated(fields, blank, "the blank values");
  assert.equal(empty.ok, false);
  assert.deepEqual(empty.errors, { title: "Required", count: "Required" });
  assert.deepEqual(empty.value, { urgent: false });

  const validBase = withValues(blank, { title: "Abc", count: "3" });

  const short = validated(fields, withValues(validBase, { title: "ab" }), "a title that is too short");
  assert.equal(short.ok, false);
  assert.equal(short.errors["title"], "Enter at least 3 characters");

  const long = validated(fields, withValues(validBase, { title: "x".repeat(41) }), "a title that is too long");
  assert.equal(long.ok, false);
  assert.equal(long.errors["title"], "Enter at most 40 characters");

  const wrongFormat = validated(fields, withValues(validBase, { title: "abc" }), "a title of the wrong format");
  assert.equal(wrongFormat.ok, false);
  assert.equal(wrongFormat.errors["title"], "Use the expected format");

  const acceptedTitle = validated(fields, withValues(validBase, { title: "Abc" }), "an accepted title");
  assert.equal(acceptedTitle.ok, true);
  assert.equal(acceptedTitle.errors["title"], undefined);
  assert.equal(acceptedTitle.value["title"], "Abc");

  const huge = validated(fields, withValues(validBase, { title: "x".repeat(10001) }), "a title over the hard cap");
  assert.equal(huge.ok, false);
  assert.equal(huge.errors["title"], "Enter at most 10000 characters");

  const belowMinimum = validated(fields, withValues(validBase, { count: "0" }), "a count below the minimum");
  assert.equal(belowMinimum.ok, false);
  assert.equal(belowMinimum.errors["count"], "Enter a whole number of at least 1");

  const aboveMaximum = validated(fields, withValues(validBase, { count: "10" }), "a count above the maximum");
  assert.equal(aboveMaximum.ok, false);
  assert.equal(aboveMaximum.errors["count"], "Enter a whole number of at most 9");

  const fractional = validated(fields, withValues(validBase, { count: "1.5" }), "a fractional count");
  assert.equal(fractional.ok, false);
  assert.equal(fractional.errors["count"], "Enter a whole number");

  const padded = validated(fields, withValues(validBase, { count: " 5 " }), "a padded count");
  assert.equal(padded.ok, true);
  assert.equal(padded.errors["count"], undefined);
  assert.equal(padded.value["count"], 5);

  const commaRatio = validated(fields, withValues(validBase, { ratio: "1,5" }), "a ratio with a comma");
  assert.equal(commaRatio.ok, false);
  assert.equal(commaRatio.errors["ratio"], "Enter a number");
});

test("C-0e0cc641 validateValues checks enum options and string list lines", () => {
  const fields = everyKind("the every supported kind schema");
  const base = withValues(initial(fields, "the every supported kind schema"), { title: "Abc", count: "3" });

  const chosen = validated(fields, withValues(base, { kind: "bug" }), "an offered enum option");
  assert.equal(chosen.ok, true);
  assert.equal(chosen.value["kind"], "bug");

  const unlisted = validated(fields, withValues(base, { kind: "other" }), "an enum value that is not offered");
  assert.equal(unlisted.ok, false);
  assert.equal(unlisted.errors["kind"], "Choose one of the listed values");

  const badLine = validated(fields, withValues(base, { tags: "ab\n\n  cd  \nx" }), "a list with a short line");
  assert.equal(badLine.ok, false);
  assert.equal(badLine.errors["tags"], "Line 4: Enter at least 2 characters");

  const trimmed = validated(fields, withValues(base, { tags: "ab\ncd" }), "a list of two lines");
  assert.equal(trimmed.ok, true);
  assert.deepEqual(trimmed.value["tags"], ["ab", "cd"]);

  const tooMany = validated(
    fields,
    withValues(base, { tags: Array.from({ length: 101 }, () => "ab").join("\n") }),
    "a list of 101 non blank lines",
  );
  assert.equal(tooMany.ok, false);
  assert.equal(tooMany.errors["tags"], "Enter at most 100 lines");
});

test("C-dc43ef5f an unsupported field or root problem blocks the form", () => {
  const withUnsupported = parsed(
    {
      type: "object",
      properties: {
        name: { type: "string" },
        bad: { type: "object" },
      },
    },
    "a schema with one supported and one unsupported property",
  );
  assert.deepEqual(initial(withUnsupported, "the partially supported schema"), { name: "" });
  const typed = withValues(initial(withUnsupported, "the partially supported schema"), { name: "ok" });
  const blocked = validated(withUnsupported, typed, "a typed value beside an unsupported property");
  assert.equal(blocked.ok, false);
  assert.equal(blocked.errors[FORM_KEY], UNSUPPORTED_TEXT);
  assert.equal(Object.hasOwn(blocked.errors, "bad"), false);
  assert.equal(blocked.errors["name"], undefined);

  const withRootProblem = parsed(
    { type: "object", allOf: [], properties: { name: { type: "string" } } },
    "a schema with a root problem",
  );
  const rootBlocked = validated(withRootProblem, { name: "ok" }, "a typed value beside a root problem");
  assert.equal(rootBlocked.ok, false);
  assert.equal(rootBlocked.errors[FORM_KEY], UNSUPPORTED_TEXT);
});

test("C-08c4c2e4 submitValues sends valid values once and never invalid ones", async () => {
  const fields = everyKind("the every supported kind schema");
  const calls: Record<string, unknown>[] = [];
  const send = async (value: Record<string, unknown>): Promise<void> => {
    calls.push(value);
  };

  const blank = await submitted(fields, {}, send, "the blank values");
  assert.equal(blank.kind, "invalid");
  if (blank.kind === "invalid") {
    assert.equal(blank.errors["title"], "Required");
    assert.equal(blank.errors["count"], "Required");
  }
  assert.equal(calls.length, 0);

  const raw: Record<string, string | boolean> = {
    title: "Abc",
    count: "3",
    urgent: false,
    evil: "ignored",
  };
  const sent = await submitted(fields, raw, send, "the valid values");
  assert.deepEqual(sent, { kind: "submitted" });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { title: "Abc", count: 3, urgent: false });
});

test("C-61a6e3a3 submitValues maps a rejected send to field and form errors", async () => {
  const fields = everyKind("the every supported kind schema");
  const raw: RawValues = { title: "Abc", count: "3" };

  const validationFailure = new ApiRequestError(400, "VALIDATION_FAILED", "never shown", {
    details: { fields: [{ field: "body/title", message: "must match pattern" }] },
  });
  const rejectedField = await submitted(
    fields,
    raw,
    async () => {
      throw validationFailure;
    },
    "a validation rejection",
  );
  assert.deepEqual(rejectedField, { kind: "rejected", errors: { title: "must match pattern" } });

  const lockedFailure = new ApiRequestError(409, "FLOW_LOCKED", "raw");
  const rejectedOther = await submitted(
    fields,
    raw,
    async () => {
      throw lockedFailure;
    },
    "a locked rejection",
  );
  assert.deepEqual(rejectedOther, { kind: "rejected", errors: { [FORM_KEY]: FALLBACK_MESSAGE } });
});
