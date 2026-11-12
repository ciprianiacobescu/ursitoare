/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { errorPanelModel } from "../kit/error-panel.ts";
import { registerToolMessages } from "./messages.ts";
import {
  checkPolicySource,
  currentText,
  deployText,
  parsePolicyView,
  pendingText,
  policyErrorText,
  validationText,
} from "./policies.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

const V = "599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8";
const SRC = "forbid (principal, action, resource) when { false };";
const REC = {
  tenantId: "tenant_a",
  version: V,
  source: SRC,
  grantIds: ["grant_1"],
  deployedBy: "u_carol",
  deployedAt: "2026-11-06T10:00:00.000000Z",
};

test("C-985ca634 parsePolicyView reads the current policy and the pending count", () => {
  assert.deepEqual(call(() => parsePolicyView({ current: REC, pendingGrants: 2 })), {
    version: V,
    source: SRC,
    pendingGrants: 2,
  });
  assert.deepEqual(call(() => parsePolicyView({ current: null, pendingGrants: 0 })), {
    version: null,
    source: "",
    pendingGrants: 0,
  });
  const big = call(() =>
    parsePolicyView({ current: { ...REC, source: "a".repeat(65536) }, pendingGrants: 0 }),
  );
  assert.equal(big?.source.length, 65536);
});

test("C-985ca634 parsePolicyView refuses the 11 malformed values", () => {
  const noSource: Record<string, unknown> = { ...REC };
  delete noSource["source"];
  const malformed: unknown[] = [
    null,
    [],
    {},
    { current: null, pendingGrants: -1 },
    { current: null, pendingGrants: 1.5 },
    { current: null, pendingGrants: "2" },
    { current: 5, pendingGrants: 0 },
    { current: { ...REC, version: "abc" }, pendingGrants: 0 },
    { current: noSource, pendingGrants: 0 },
    { current: { ...REC, source: "a".repeat(65537) }, pendingGrants: 0 },
    { current: null },
  ];
  assert.equal(malformed.length, 11);
  assert.ok(call(() => parsePolicyView({ current: REC, pendingGrants: 2 })) !== null);
  for (const raw of malformed) {
    assert.equal(
      call(() => parsePolicyView(raw)),
      null,
      JSON.stringify(raw)?.slice(0, 60),
    );
  }
});

test("C-985ca634 validationText, deployText, currentText and pendingText give the fixed texts", () => {
  assert.equal(
    call(() => validationText({ ok: true, problems: [{ stage: "x", ids: [], message: "" }] })),
    "Valid.",
  );
  assert.equal(call(() => validationText({ ok: false, problems: [] })), "Not valid.");
  assert.equal(
    call(() =>
      validationText({
        ok: false,
        problems: [
          { stage: "reserved", ids: ["grant_x"], message: "" },
          { stage: "policy", ids: ["platform-read-self", "t-1"], message: "" },
          { stage: "parse", ids: [], message: "unexpected end of input" },
        ],
      }),
    ),
    "Not valid: reserved grant_x; policy platform-read-self, t-1; parse: unexpected end of input",
  );
  assert.equal(call(() => deployText("abc")), "Deployed version abc.");
  assert.equal(call(() => deployText(V)), "Deployed version 599ac6e14025.");
  assert.equal(
    call(() => currentText({ version: V, source: SRC, pendingGrants: 0 })),
    "Current version 599ac6e14025",
  );
  assert.equal(
    call(() => currentText({ version: null, source: "", pendingGrants: 0 })),
    "No policy deployed.",
  );
  assert.equal(call(() => pendingText(0)), "All grant changes are deployed.");
  assert.equal(call(() => pendingText(1)), "1 grant change is not deployed.");
  assert.equal(call(() => pendingText(2)), "2 grant changes are not deployed.");
  assert.equal(call(() => pendingText(12)), "12 grant changes are not deployed.");
});

test("C-985ca634 checkPolicySource counts code points", () => {
  assert.deepEqual(
    call(() => checkPolicySource("é".repeat(65536))),
    { ok: true },
  );
  assert.deepEqual(
    call(() => checkPolicySource("\u{1F600}".repeat(65536))),
    { ok: true },
  );
  assert.deepEqual(
    call(() => checkPolicySource("a".repeat(65537))),
    { ok: false, message: "The policy must be at most 65,536 characters." },
  );
});

test("C-985ca634 policyErrorText shows a policy_invalid refusal through validationText", () => {
  registerToolMessages();
  const refusal = (problems: unknown): ApiRequestError =>
    new ApiRequestError(422, "OPERATION_REFUSED", "m", {
      details: { reason: "policy_invalid", problems },
    });
  assert.equal(
    call(() =>
      policyErrorText(
        refusal([
          { stage: "policy", ids: ["t-1"], message: "" },
          { stage: "reserved", ids: ["grant_x", "grant_y"], message: "" },
          { stage: "parse", ids: ["tenant/source"], message: "unexpected end of input" },
        ]),
      ),
    ),
    "Not valid: policy t-1; reserved grant_x, grant_y; parse tenant/source: unexpected end of input",
  );
  for (const bad of ["x", [{ stage: 5, ids: [], message: "" }], [{ stage: "policy", ids: ["t-1"] }]]) {
    assert.equal(call(() => policyErrorText(refusal(bad))), "The policy is not valid.");
  }
});

test("C-985ca634 policyErrorText gives the kit text for any other error", () => {
  registerToolMessages();
  const unavailable = new ApiRequestError(503, "AUTHZ_UNAVAILABLE", "m");
  assert.equal(call(() => policyErrorText(unavailable)), errorPanelModel(unavailable).message);
  const forbidden = new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "dec_9" } });
  assert.equal(
    call(() => policyErrorText(forbidden)),
    `${errorPanelModel(forbidden).message} Decision id: dec_9`,
  );
});
