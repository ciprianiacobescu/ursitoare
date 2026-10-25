import { test } from "node:test";
import assert from "node:assert/strict";
import { cedar, loadPolicyMap, loadSchemaText, validatePolicies } from "../src/cedar.ts";
import { generateSchema } from "../src/gen-schema.ts";
import { MALFORMED } from "../src/malformed.ts";

const schema = loadSchemaText();

test("committed schema equals generated schema (no drift from the catalogue)", () => assert.equal(schema, generateSchema()));
test("schema parses", () => assert.equal(cedar.checkParseSchema(schema).type, "success"));
test("real policy set (>=30 policies) passes strict validation with zero errors and zero warnings", () => {
  const policies = loadPolicyMap();
  assert.ok(Object.keys(policies).length >= 30, `${Object.keys(policies).length} policies`);
  const r = validatePolicies(policies, schema);
  assert.deepEqual(r.validationErrors, []);
  assert.deepEqual(r.warnings, []);
  assert.ok(r.ok);
});

for (const m of MALFORMED) {
  test(`${m.id} malformed policy is rejected (${m.why})`, () => {
    const parse = cedar.checkParsePolicySet({ staticPolicies: m.policy });
    if (m.stage === "parse") { assert.equal(parse.type, "failure"); return; }
    assert.equal(parse.type, "success", "must parse");
    const r = validatePolicies({ bad: m.policy }, schema);
    assert.equal(r.ok, false, "validation gate must fail");
  });
}

test("strict mode is requested explicitly (only mode the wasm API exposes)", () => {
  const r = cedar.validate({ validationSettings: { mode: "strict" }, schema, policies: { staticPolicies: loadPolicyMap() } });
  assert.equal(r.type, "success");
});
