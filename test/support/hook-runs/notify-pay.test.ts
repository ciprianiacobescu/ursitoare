import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { ValidationResult } from "../../../src/authoring/index.ts";
import { validateFlowText } from "../../../src/authoring/index.ts";
import { fixedClock } from "../../../src/core/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";
import { withTestDatabase } from "../pg.ts";
import { seedMockRunFlows } from "../mock-run-seed.ts";
import { seedTwoTenants } from "../tenants.ts";
import { notifyPayVersion, seedNotifyPay } from "./notify-pay.ts";

function yamlText(): string {
  let text = "";
  assert.doesNotThrow(() => {
    text = readFileSync(new URL("./notify-pay.yaml", import.meta.url), "utf8");
  }, "notify-pay.yaml is readable");
  assert.ok(text.length > 0, "notify-pay.yaml holds text");
  return text;
}

function versionOf(variant: "strict" | "soft"): LoadedVersion {
  let result: LoadedVersion | undefined;
  assert.doesNotThrow(() => {
    result = notifyPayVersion(variant);
  }, `notifyPayVersion ${variant}`);
  assert.ok(result !== undefined, `notifyPayVersion ${variant} returned a version`);
  return result;
}

function expectClean(label: string, text: string, format: "yaml" | "json"): void {
  let result: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    result = validateFlowText(text, format, loadTestCatalogue());
  }, `validateFlowText ${label}`);
  assert.ok(result !== undefined, `${label}: a result is returned`);
  assert.equal(result.ok, true, label);
  assert.deepEqual(result.errors, [], label);
  assert.deepEqual(result.warnings, [], label);
  assert.deepEqual(result.layers_run, ["L1", "L2", "L3", "H"], label);
}

test("C-6b84d5e8 notify-pay validates cleanly through all four layers", () => {
  const text = yamlText();
  assert.ok(text.includes("notify-pay"), "the flow is named notify-pay");
  expectClean("notify-pay", text, "yaml");
});

test("C-6b84d5e8 the soft variant validates cleanly and continues on error", () => {
  const soft = versionOf("soft");
  expectClean("notify-pay-soft", JSON.stringify(soft.flow), "json");
  const hook = soft.flow.nodes["pay"]?.post?.[0];
  assert.ok(hook !== undefined && hook.kind === "block");
  assert.equal(hook.on_error, "continue");
});

test("C-6b84d5e8 notifyPayVersion carries the fixed fields", () => {
  const strict = versionOf("strict");
  assert.equal(strict.flowId, "notify-pay");
  assert.equal(strict.hash, "sha256:" + "b".repeat(64));
  assert.equal(strict.state, "validated");
  assert.equal(strict.ownerTeam, "finance");
  const hook = strict.flow.nodes["pay"]?.post?.[0];
  assert.ok(hook !== undefined && hook.kind === "block");
  assert.equal(hook.on_error, undefined);

  const soft = versionOf("soft");
  assert.equal(soft.flowId, "notify-pay-soft");
  assert.equal(soft.state, "validated");
  assert.equal(soft.ownerTeam, "finance");
});

test("C-6b84d5e8 seedNotifyPay returns two distinct validated hashes", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = fixedClock("2026-11-02T10:00:00Z");
    await seedMockRunFlows(db, a, clock);
    let seeded: { strict: string; soft: string } | undefined;
    await assert.doesNotReject(async () => {
      seeded = await seedNotifyPay(db, a, clock);
    });
    assert.ok(seeded !== undefined, "seedNotifyPay answered");
    assert.match(seeded.strict, /^sha256:[0-9a-f]{64}$/);
    assert.match(seeded.soft, /^sha256:[0-9a-f]{64}$/);
    assert.notEqual(seeded.strict, seeded.soft);
  } finally {
    await db.close();
  }
});
