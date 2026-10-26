// Architecture test of the supply-chain gate: licence expressions and violation messages.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkLicences,
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

const ALLOWED = [
  "MIT",
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "PostgreSQL",
  "0BSD",
  "CC0-1.0",
  "MPL-2.0",
  "BlueOak-1.0.0",
  "PSF-2.0",
];

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

test("C-2fb3cbe9 checkLicences fails a copyleft term", () => {
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          {
            ecosystem: "npm",
            name: "left-pad-gpl",
            version: "1.0.0",
            licence: "GPL-3.0-only",
            terms: ["GPL-3.0-only"],
          },
        ],
        { allowed: ALLOWED, exceptions: [] },
        "node_modules/.pnpm",
      ),
    ),
    [
      {
        code: "LICENCE_TERM_NOT_ALLOWED",
        subject: "npm left-pad-gpl@1.0.0",
        licence: "GPL-3.0-only",
        detail: "terms not on the allowlist: GPL-3.0-only",
      },
    ],
  );
});

test("C-30fdcfea checkLicences passes permissive licences", () => {
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          { ecosystem: "npm", name: "react", version: "19.3.1", licence: "MIT", terms: ["MIT"] },
          {
            ecosystem: "npm",
            name: "typescript",
            version: "6.0.3",
            licence: "Apache-2.0",
            terms: ["Apache-2.0"],
          },
        ],
        { allowed: ALLOWED, exceptions: [] },
        "node_modules/.pnpm",
      ),
    ),
    [],
  );
});

test("C-ae5033da checkLicences reports a package without a licence", () => {
  const violations = answer(() =>
    checkLicences(
      [{ ecosystem: "npm", name: "nolic", version: "2.0.0", licence: null, terms: null }],
      { allowed: ALLOWED, exceptions: [] },
      "node_modules/.pnpm",
    ),
  );
  assert.ok(Array.isArray(violations), "checkLicences returns violations");
  assert.equal(violations.length, 1);
  const [first] = violations;
  assert.ok(first, "one violation");
  assert.equal(first.code, "LICENCE_MISSING");
  assert.equal(first.subject, "npm nolic@2.0.0");
  assert.match(formatLicenceViolation(first), /nolic@2\.0\.0/);
});

test("C-30f06cd4 checkLicences judges every term of a licence expression", () => {
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          {
            ecosystem: "npm",
            name: "dual",
            version: "1.0.0",
            licence: "MIT OR GPL-3.0-only",
            terms: ["MIT", "GPL-3.0-only"],
          },
        ],
        { allowed: ALLOWED, exceptions: [] },
        "node_modules/.pnpm",
      ),
    ),
    [
      {
        code: "LICENCE_TERM_NOT_ALLOWED",
        subject: "npm dual@1.0.0",
        licence: "MIT OR GPL-3.0-only",
        detail: "terms not on the allowlist: GPL-3.0-only",
      },
    ],
  );
});

test("C-ca426357 checkLicences refuses a near-miss identifier", () => {
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          {
            ecosystem: "npm",
            name: "plus",
            version: "1.0.0",
            licence: "Apache-2.0+",
            terms: ["Apache-2.0+"],
          },
        ],
        { allowed: ALLOWED, exceptions: [] },
        "node_modules/.pnpm",
      ),
    ),
    [
      {
        code: "LICENCE_TERM_NOT_ALLOWED",
        subject: "npm plus@1.0.0",
        licence: "Apache-2.0+",
        detail: "terms not on the allowlist: Apache-2.0+",
      },
    ],
  );
});

test("C-7f94877e checkLicences matches terms without regard to case", () => {
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [{ ecosystem: "npm", name: "lower-mit", version: "1.0.0", licence: "mit", terms: ["mit"] }],
        { allowed: ALLOWED, exceptions: [] },
        "node_modules/.pnpm",
      ),
    ),
    [],
  );
  const violations = answer(() =>
    checkLicences(
      [
        {
          ecosystem: "npm",
          name: "lower-gpl",
          version: "1.0.0",
          licence: "gpl-3.0-only",
          terms: ["gpl-3.0-only"],
        },
      ],
      { allowed: ALLOWED, exceptions: [] },
      "node_modules/.pnpm",
    ),
  );
  assert.ok(Array.isArray(violations), "checkLicences returns violations");
  assert.equal(violations.length, 1);
  const [first] = violations;
  assert.ok(first, "one violation");
  assert.equal(first.code, "LICENCE_TERM_NOT_ALLOWED");
  assert.equal(first.subject, "npm lower-gpl@1.0.0");
});

test("C-ff913dc5 checkLicences gives fixed subjects and details", () => {
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          { ecosystem: "pypi", name: "a", version: "1", licence: null, terms: null },
          { ecosystem: "npm", name: "b", version: "2", licence: "Foo Bar", terms: null },
        ],
        { allowed: ALLOWED, exceptions: [] },
        "node_modules/.pnpm",
      ),
    ),
    [
      { code: "LICENCE_MISSING", subject: "pypi a@1", detail: "no licence found" },
      {
        code: "LICENCE_UNKNOWN",
        subject: "npm b@2",
        licence: "Foo Bar",
        detail: "licence is not a parsable SPDX expression",
      },
    ],
  );
  assert.deepEqual(answer(() => checkLicences([], { allowed: ALLOWED, exceptions: [] }, "e2e/.venv")), [
    { code: "INVENTORY_EMPTY", subject: "e2e/.venv", detail: "no packages found" },
  ]);
});
