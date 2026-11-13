import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSchema } from "./cedar-schema.ts";
import { PdpError } from "./errors.ts";
import { loadPolicySet } from "./load.ts";

function load(text: string): PdpError {
  try {
    loadPolicySet({ schema: buildSchema(), policies: [{ id: "t/s", layer: "tenant", text }] });
  } catch (error) {
    assert.ok(error instanceof PdpError, "the rejection is a PdpError");
    return error;
  }
  assert.fail("the source loads");
}

test("C-1731ec46 a parse and a validate failure carry the raw diagnostic outside details", () => {
  const parseError = load("permit (principal");
  assert.equal(parseError.code, "PDP_POLICY_INVALID");
  assert.deepEqual(parseError.details, { stage: "parse", ids: ["t/s"] });
  assert.equal(parseError.diagnostic, "unexpected end of input");
  assert.ok(
    !parseError.message.includes("unexpected end of input"),
    "the message holds the diagnostic",
  );
  assert.ok(
    !JSON.stringify(parseError).includes("unexpected end of input"),
    "JSON holds the diagnostic",
  );
  assert.ok(!Object.keys(parseError).includes("diagnostic"), "Object.keys holds diagnostic");
  const parseDescriptor = Object.getOwnPropertyDescriptor(parseError, "diagnostic");
  assert.equal(parseDescriptor?.enumerable, false);
  assert.equal(parseDescriptor?.value, "unexpected end of input");

  const mixedDiagnostic = 'for policy `t-kind`, string `"приvet"` contains mixed scripts';
  const mixedError = load(
    '@id("t-kind")\npermit (principal, action == Action::"read_self", resource) when { principal.kind == "приvet" };',
  );
  assert.equal(mixedError.code, "PDP_POLICY_INVALID");
  assert.deepEqual(mixedError.details, { stage: "validate", ids: ["t-kind"] });
  assert.equal(mixedError.diagnostic, mixedDiagnostic);
  assert.ok(
    !mixedError.message.includes(mixedDiagnostic),
    "the message holds the diagnostic",
  );
  assert.ok(
    !JSON.stringify(mixedError).includes(mixedDiagnostic),
    "JSON holds the diagnostic",
  );
  assert.ok(!Object.keys(mixedError).includes("diagnostic"), "Object.keys holds diagnostic");
  const mixedDescriptor = Object.getOwnPropertyDescriptor(mixedError, "diagnostic");
  assert.equal(mixedDescriptor?.enumerable, false);
  assert.equal(mixedDescriptor?.value, mixedDiagnostic);
});

test("C-1731ec46 only parse and validate carry a diagnostic and a fourth argument is stored", () => {
  const template = load('@id("t-tpl")\npermit (principal == ?principal, action, resource);');
  assert.equal(template.code, "PDP_POLICY_INVALID");
  assert.equal(template.details["stage"], "template");
  assert.equal(template.diagnostic, undefined);

  const missingId = load('permit (principal, action == Action::"read_self", resource);');
  assert.equal(missingId.code, "PDP_POLICY_INVALID");
  assert.equal(missingId.details["stage"], "id");
  assert.equal(missingId.diagnostic, undefined);

  const duplicate = load(
    '@id("t-dup")\npermit (principal, action == Action::"read_self", resource);\n@id("t-dup")\npermit (principal, action == Action::"read_self", resource);',
  );
  assert.equal(duplicate.code, "PDP_DUPLICATE_ID");
  assert.equal(duplicate.details["stage"], "policy");
  assert.equal(duplicate.diagnostic, undefined);

  const threeArguments = new PdpError("PDP_OPTIONS_INVALID", "m");
  assert.equal(threeArguments.diagnostic, undefined);

  const explicit = new PdpError(
    "PDP_POLICY_INVALID",
    "m",
    { stage: "parse", ids: [] },
    "d",
  );
  assert.equal(explicit.diagnostic, "d");
  const explicitDescriptor = Object.getOwnPropertyDescriptor(explicit, "diagnostic");
  assert.equal(explicitDescriptor?.enumerable, false);
  assert.equal(explicitDescriptor?.value, "d");
});
