// Architecture test of the supply-chain gate: licence expressions and violation messages.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatLicenceViolation,
  formatLicenceViolations,
  parseLicenceExpression,
  type LicenceViolation,
} from "./licence-rules.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

const GPL_VIOLATION: LicenceViolation = {
  code: "LICENCE_TERM_NOT_ALLOWED",
  subject: "npm left-pad-gpl@1.0.0",
  licence: "GPL-3.0-only",
  detail: "terms not on the allowlist: GPL-3.0-only",
};

test("C-b7a7ed55 parseLicenceExpression reads the distinct terms of an expression", () => {
  assert.deepEqual(answer(() => parseLicenceExpression("(MIT OR CC0-1.0)")), ["MIT", "CC0-1.0"]);
  assert.deepEqual(answer(() => parseLicenceExpression("MIT AND PSF-2.0")), ["MIT", "PSF-2.0"]);
  assert.deepEqual(answer(() => parseLicenceExpression("MIT OR MIT")), ["MIT"]);
});

test("C-1524fbc5 parseLicenceExpression gives null for malformed expressions only", () => {
  assert.deepEqual(answer(() => parseLicenceExpression("MIT")), ["MIT"]);
  for (const bad of ["Apache License", "MIT OR", "(MIT", "GPL-2.0 WITH Classpath-exception-2.0", ""]) {
    assert.equal(answer(() => parseLicenceExpression(bad)), null, `parsing ${JSON.stringify(bad)}`);
  }
});

test("C-f0b009a1 formatLicenceViolation names code, subject, licence and detail", () => {
  assert.equal(
    answer(() => formatLicenceViolation(GPL_VIOLATION)),
    'LICENCE_TERM_NOT_ALLOWED: npm left-pad-gpl@1.0.0 licence "GPL-3.0-only" - terms not on the allowlist: GPL-3.0-only',
  );
});

test("C-db08d47c formatLicenceViolation cuts a long licence text and omits an absent one", () => {
  const long = "x".repeat(200);
  assert.equal(
    answer(() => formatLicenceViolation({ ...GPL_VIOLATION, licence: long })),
    `LICENCE_TERM_NOT_ALLOWED: npm left-pad-gpl@1.0.0 licence "${"x".repeat(77)}..." - terms not on the allowlist: GPL-3.0-only`,
  );
  const withoutLicence: LicenceViolation = {
    code: GPL_VIOLATION.code,
    subject: GPL_VIOLATION.subject,
    detail: GPL_VIOLATION.detail,
  };
  assert.equal(
    answer(() => formatLicenceViolation(withoutLicence)),
    "LICENCE_TERM_NOT_ALLOWED: npm left-pad-gpl@1.0.0 - terms not on the allowlist: GPL-3.0-only",
  );
});

test("C-1c977f83 formatLicenceViolations joins the lines with a newline and gives an empty string for none", () => {
  const second: LicenceViolation = { code: "LICENCE_MISSING", subject: "npm nolic@2.0.0", detail: "no licence found" };
  assert.equal(
    answer(() => formatLicenceViolations([GPL_VIOLATION, second])),
    [
      'LICENCE_TERM_NOT_ALLOWED: npm left-pad-gpl@1.0.0 licence "GPL-3.0-only" - terms not on the allowlist: GPL-3.0-only',
      "LICENCE_MISSING: npm nolic@2.0.0 - no licence found",
    ].join("\n"),
  );
  assert.equal(answer(() => formatLicenceViolations([])), "");
});
