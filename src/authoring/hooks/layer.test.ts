import assert from "node:assert/strict";
import { test } from "node:test";

import { loadTestFlow } from "../../../test/support/catalogue/flows.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { validateFlow } from "../validate/index.ts";
import type { ValidationResult } from "../validate/index.ts";
import { declaresHooks } from "./index.ts";

const catalogue = loadTestCatalogue();

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function rf1(): Doc {
  return structuredClone(loadTestFlow("rf-1-invoice-intake")) as Doc;
}

function run(doc: unknown): ValidationResult {
  let result = {} as ValidationResult;
  assert.doesNotThrow(() => {
    result = validateFlow(doc, catalogue);
  });
  return result;
}

function hookCode(id: string, extra: Doc = {}): Doc {
  return { id, kind: "code", source: "return;", ...extra };
}

function withGuard(): Doc {
  const doc = rf1();
  doc["hooks"] = [{ id: "pay_guard", match: { effect: ["pay"] }, pre: hookCode("pay_guard") }];
  return doc;
}

function withGhost(): Doc {
  const doc = rf1();
  doc["hooks"] = [{ id: "ghost", match: { tags: ["nonexistent"] }, pre: hookCode("ghost") }];
  return doc;
}

function withRoute(): Doc {
  const doc = rf1();
  doc["nodes"]["classify"]["post"] = [hookCode("redirect", { routes: ["nowhere"] })];
  return doc;
}

const FOUR = ["L1", "L2", "L3", "H"];

test("C-576d5329: A keeps three layers and B adds layer H with the one warning", () => {
  const a = rf1();
  assert.equal(declaresHooks(a), false);
  const ra = run(a);
  assert.equal(ra.ok, true);
  assert.deepEqual(ra.layers_run, ["L1", "L2", "L3"]);
  assert.deepEqual(
    ra.warnings.map((w) => w.code),
    ["W_LETHAL_TRIFECTA"],
  );
  const b = withGuard();
  assert.equal(declaresHooks(b), true);
  const rb = run(b);
  assert.equal(rb.ok, true);
  assert.deepEqual(rb.layers_run, FOUR);
  assert.deepEqual(rb.errors, []);
  assert.deepEqual(
    rb.warnings.map((w) => w.code),
    ["W_LETHAL_TRIFECTA"],
  );
});

test("C-576d5329: C orders the H warning before the L3 one", () => {
  const r = run(withGhost());
  assert.equal(r.ok, true);
  assert.deepEqual(r.layers_run, FOUR);
  assert.deepEqual(
    r.warnings.map((w) => `${w.layer} ${w.code} ${String(w.node)} ${w.path}`),
    ["H W_NO_MATCH null /hooks/0", "L3 W_LETHAL_TRIFECTA null /nodes"],
  );
});

test("C-576d5329: D gives H_ROUTE_TARGET from layer H while E and F stop earlier", () => {
  const d = run(withRoute());
  assert.equal(d.ok, false);
  assert.deepEqual(d.layers_run, FOUR);
  assert.deepEqual(
    d.errors.map((e) => `${e.layer} ${e.code} ${String(e.node)} ${e.path}`),
    ["H H_ROUTE_TARGET classify /nodes/classify/post/0/routes/0"],
  );

  const doc = withRoute();
  doc["nodes"]["pay"]["with"]["amount"] = "${{ nodes.ghost.output.x }}";
  const e = run(doc);
  assert.equal(e.ok, false);
  assert.deepEqual(e.layers_run, ["L1", "L2", "L3"]);
  assert.deepEqual(
    e.errors.map((x) => `${x.code} ${String(x.node)} ${x.path}`),
    ["L3_REF_UNKNOWN_NODE pay /nodes/pay/with/amount"],
  );

  const bad = rf1();
  bad["nodes"]["classify"]["pre"] = {};
  assert.equal(declaresHooks(bad), true);
  const f = run(bad);
  assert.equal(f.ok, false);
  assert.deepEqual(f.layers_run, ["L1"]);
  assert.deepEqual(
    f.errors.map((x) => `${x.code} ${String(x.node)} ${x.path}`),
    ["L1_TYPE classify /nodes/classify/pre"],
  );
});
