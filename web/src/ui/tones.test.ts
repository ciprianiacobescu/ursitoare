import assert from "node:assert/strict";
import { test } from "node:test";

import {
  grantStatusTone,
  runStateTone,
  serverStateTone,
  stepStateTone,
  versionStateTone,
} from "./tones.ts";

test("C-48ccaf77 runStateTone maps each known state", () => {
  assert.equal(typeof runStateTone, "function");
  assert.equal(runStateTone("queued"), "neutral");
  assert.equal(runStateTone("running"), "info");
  assert.equal(runStateTone("completed"), "success");
  assert.equal(runStateTone("failed"), "danger");
  assert.equal(runStateTone("cancelled"), "neutral");
});

test("C-48ccaf77 stepStateTone maps each known state", () => {
  assert.equal(typeof stepStateTone, "function");
  assert.equal(stepStateTone("started"), "info");
  assert.equal(stepStateTone("completed"), "success");
  assert.equal(stepStateTone("failed"), "danger");
  assert.equal(stepStateTone("skipped"), "neutral");
});

test("C-48ccaf77 versionStateTone maps each known state", () => {
  assert.equal(typeof versionStateTone, "function");
  assert.equal(versionStateTone("draft"), "neutral");
  assert.equal(versionStateTone("validated"), "success");
  assert.equal(versionStateTone("tested"), "success");
  assert.equal(versionStateTone("reviewed"), "success");
  assert.equal(versionStateTone("published"), "info");
  assert.equal(versionStateTone("deprecated"), "neutral");
});

test("C-48ccaf77 serverStateTone maps each known state", () => {
  assert.equal(typeof serverStateTone, "function");
  assert.equal(serverStateTone("pending"), "warning");
  assert.equal(serverStateTone("approved"), "success");
  assert.equal(serverStateTone("drifted"), "warning");
});

test("C-48ccaf77 grantStatusTone maps each known status", () => {
  assert.equal(typeof grantStatusTone, "function");
  assert.equal(grantStatusTone("active"), "success");
  assert.equal(grantStatusTone("needs_reconfirm"), "warning");
  assert.equal(grantStatusTone("revoked"), "neutral");
});

test("C-48ccaf77 every tone mapper falls back to neutral for unknown input", () => {
  assert.equal(typeof runStateTone, "function");
  assert.equal(typeof stepStateTone, "function");
  assert.equal(typeof versionStateTone, "function");
  assert.equal(typeof serverStateTone, "function");
  assert.equal(typeof grantStatusTone, "function");
  assert.equal(runStateTone("running"), "info");
  for (const value of ["weird", "", "__proto__", "toString"]) {
    assert.equal(runStateTone(value), "neutral", `runStateTone(${value})`);
    assert.equal(stepStateTone(value), "neutral", `stepStateTone(${value})`);
    assert.equal(versionStateTone(value), "neutral", `versionStateTone(${value})`);
    assert.equal(serverStateTone(value), "neutral", `serverStateTone(${value})`);
    assert.equal(grantStatusTone(value), "neutral", `grantStatusTone(${value})`);
  }
});
