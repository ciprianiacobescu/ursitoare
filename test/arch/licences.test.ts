// Architecture test of the supply-chain gate: licence expressions, violation messages, inventory and store readers.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkBuiltDependencies,
  checkExactVersions,
  checkLicences,
  checkPolicy,
  decideVenvScan,
  formatLicenceViolation,
  formatLicenceViolations,
  npmLicenceOf,
  parseLicenceExpression,
  pythonLicenceOf,
  readTopLevelList,
  scanNpmStore,
  scanPythonVenv,
  type InstalledPackage,
  type LicenceException,
  type LicencePolicy,
  type LicenceViolation,
} from "./licence-rules.ts";
import {
  ALLOWED_LICENCES,
  LICENCE_EXCEPTIONS,
  MANIFEST_PATHS,
  PYPI_CLASSIFIER_SPDX,
  REVIEWED_BUILT_DEPENDENCIES,
} from "./licence-policy.ts";

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

function textUnidecodeException(): LicenceException {
  return {
    ecosystem: "pypi",
    name: "text-unidecode",
    version: "1.3",
    licence: "Artistic License; GNU General Public License (GPL); GNU General Public License v2 or later (GPLv2+)",
    reason: "Test-only transitive dependency of the e2e venv, offered under the Artistic License or the GPL.",
  };
}

test("C-92d19a9f C-6107b0c0 checkLicences exempts only the reviewed version and licence text", () => {
  const policy: LicencePolicy = { allowed: ALLOWED, exceptions: [textUnidecodeException()] };
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          {
            ecosystem: "pypi",
            name: "text-unidecode",
            version: "1.3",
            licence: textUnidecodeException().licence,
            terms: null,
          },
        ],
        policy,
        "e2e/.venv",
      ),
    ),
    [],
  );
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          {
            ecosystem: "pypi",
            name: "text-unidecode",
            version: "1.4",
            licence: textUnidecodeException().licence,
            terms: null,
          },
        ],
        policy,
        "e2e/.venv",
      ),
    ),
    [
      {
        code: "LICENCE_UNKNOWN",
        subject: "pypi text-unidecode@1.4",
        licence: textUnidecodeException().licence,
        detail: "licence is not a parsable SPDX expression",
      },
    ],
  );
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          {
            ecosystem: "pypi",
            name: "text-unidecode",
            version: "1.3",
            licence: "GPL-3.0-only",
            terms: ["GPL-3.0-only"],
          },
        ],
        policy,
        "e2e/.venv",
      ),
    ),
    [
      {
        code: "LICENCE_TERM_NOT_ALLOWED",
        subject: "pypi text-unidecode@1.3",
        licence: "GPL-3.0-only",
        detail: "terms not on the allowlist: GPL-3.0-only",
      },
    ],
  );
});

test("C-7b90839f checkPolicy rejects malformed policy data in order", () => {
  const valid = textUnidecodeException();
  const policy: LicencePolicy = {
    allowed: ["MIT", "GPL-3.0-only"],
    exceptions: [
      valid,
      { ...valid, name: "a-pkg", version: "^1.0.0" },
      { ...valid, name: "b-pkg", reason: "ok" },
      { ...valid },
    ],
  };
  assert.deepEqual(answer(() => checkPolicy(policy)), [
    { code: "POLICY_INVALID", subject: "exception pypi a-pkg@^1.0.0", detail: "version is not exact" },
    { code: "POLICY_INVALID", subject: "exception pypi b-pkg@1.3", detail: "reason too short" },
    { code: "POLICY_INVALID", subject: "exception pypi text-unidecode@1.3", detail: "duplicate" },
    { code: "POLICY_INVALID", subject: "allowlist GPL-3.0-only", detail: "forbidden or empty entry" },
  ]);
});

test("C-8eaf01ec checkPolicy admits pypi release segment versions", () => {
  const base = textUnidecodeException();
  const versions: readonly (readonly [string, string])[] = [
    ["ok-a", "1.3"],
    ["ok-b", "2.0.1"],
    ["ok-c", "1.2.3.4"],
    ["ok-d", "0"],
  ];
  const policy: LicencePolicy = {
    allowed: ["MIT"],
    exceptions: versions.map(([name, version]) => ({ ...base, name, version })),
  };
  assert.deepEqual(answer(() => checkPolicy(policy)), []);
});

test("C-6c266a75 checkPolicy refuses pypi versions that are not a release segment", () => {
  const base = textUnidecodeException();
  const versions: readonly (readonly [string, string])[] = [
    ["bad-a", "1.*"],
    ["bad-b", "==1.3"],
    ["bad-c", "1.3rc1"],
    ["bad-d", "1.3.post1"],
    ["bad-e", "01.3"],
    ["bad-f", ""],
    ["bad-g", "1.2.3.4.5"],
  ];
  const policy: LicencePolicy = {
    allowed: ["MIT"],
    exceptions: versions.map(([name, version]) => ({ ...base, name, version })),
  };
  assert.deepEqual(
    answer(() => checkPolicy(policy)),
    versions.map(([name, version]) => ({
      code: "POLICY_INVALID",
      subject: `exception pypi ${name}@${version}`,
      detail: "version is not exact",
    })),
  );
});

test("C-991042c4 checkPolicy judges npm exception versions with isExactVersion", () => {
  const base = textUnidecodeException();
  const versions: readonly (readonly [string, string])[] = [
    ["n-a", "1.2.3"],
    ["n-b", "18.4.0-beta.17"],
    ["n-c", "npm:real@1.2.3"],
    ["n-d", "1.3"],
    ["n-e", "^1.2.3"],
    ["n-f", ""],
    ["n-g", "1.2.x"],
  ];
  const policy: LicencePolicy = {
    allowed: ["MIT"],
    exceptions: versions.map(([name, version]) => ({ ...base, ecosystem: "npm", name, version })),
  };
  assert.deepEqual(answer(() => checkPolicy(policy)), [
    { code: "POLICY_INVALID", subject: "exception npm n-d@1.3", detail: "version is not exact" },
    { code: "POLICY_INVALID", subject: "exception npm n-e@^1.2.3", detail: "version is not exact" },
    { code: "POLICY_INVALID", subject: "exception npm n-f@", detail: "version is not exact" },
    { code: "POLICY_INVALID", subject: "exception npm n-g@1.2.x", detail: "version is not exact" },
  ]);
});

test("C-ae2f6322 checkPolicy does not judge an unknown ecosystem on its version", () => {
  const entry: LicenceException = {
    ...textUnidecodeException(),
    ecosystem: "cargo" as LicenceException["ecosystem"],
    name: "c-a",
    version: "1.*",
  };
  assert.deepEqual(answer(() => checkPolicy({ allowed: ["MIT"], exceptions: [entry] })), [
    { code: "POLICY_INVALID", subject: "exception cargo c-a@1.*", detail: "unknown ecosystem" },
  ]);
});

test("C-65a32526 checkPolicy accepts the reviewed exception version", () => {
  assert.deepEqual(
    answer(() => checkPolicy({ allowed: ["MIT"], exceptions: [textUnidecodeException()] })),
    [],
  );
});

test("C-c18692e2 C-73030b3f the licence policy data is well formed", () => {
  assert.deepEqual(ALLOWED_LICENCES, ALLOWED);
  assert.deepEqual(LICENCE_EXCEPTIONS, [textUnidecodeException()]);
  assert.deepEqual(PYPI_CLASSIFIER_SPDX, {
    "MIT License": "MIT",
    "BSD License": "BSD-3-Clause",
    "Apache Software License": "Apache-2.0",
    "ISC License (ISCL)": "ISC",
    "Python Software Foundation License": "PSF-2.0",
    "PostgreSQL License": "PostgreSQL",
    "Mozilla Public License 2.0 (MPL 2.0)": "MPL-2.0",
    "Zero-Clause BSD (0BSD)": "0BSD",
    "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication": "CC0-1.0",
  });
  assert.deepEqual(REVIEWED_BUILT_DEPENDENCIES, [
    "@embedded-postgres/darwin-arm64",
    "@embedded-postgres/darwin-x64",
    "@embedded-postgres/linux-arm64",
    "@embedded-postgres/linux-x64",
    "esbuild",
  ]);
  assert.deepEqual(MANIFEST_PATHS, ["package.json", "web/package.json"]);
  assert.deepEqual(answer(() => checkPolicy({ allowed: ALLOWED_LICENCES, exceptions: LICENCE_EXCEPTIONS })), []);
});

// A scratch directory for fixture store and venv trees.
function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "licences-"));
}

// A workspace file whose onlyBuiltDependencies list holds the given entries.
function workspaceYamlWith(entries: readonly string[], quoteFirst = false): string {
  const items = entries.map((entry, index) =>
    quoteFirst && index === 0 ? `  - '${entry}'` : `  - ${entry}`,
  );
  return ["packages:", '  - "."', "onlyBuiltDependencies:", ...items, ""].join("\n");
}

test("C-a74a1a7f scanNpmStore walks the store without following symlinks", () => {
  const root = tempRoot();
  const store = path.join(root, "node_modules", ".pnpm");
  const first = path.join(store, "@scope+pkg@1.0.0", "node_modules");
  fs.mkdirSync(path.join(first, "@scope", "pkg"), { recursive: true });
  fs.writeFileSync(
    path.join(first, "@scope", "pkg", "package.json"),
    JSON.stringify({ name: "@scope/pkg", version: "1.0.0", license: "MIT" }),
  );
  const target = path.join(root, "elsewhere");
  fs.mkdirSync(target);
  fs.symlinkSync(target, path.join(first, "dep"));
  const second = path.join(store, "@scope+pkg@1.0.0_peerhash", "node_modules", "@scope", "pkg");
  fs.mkdirSync(second, { recursive: true });
  fs.writeFileSync(
    path.join(second, "package.json"),
    JSON.stringify({ name: "@scope/pkg", version: "1.0.0", license: "MIT" }),
  );
  assert.deepEqual(answer(() => scanNpmStore(root)), [
    { ecosystem: "npm", name: "@scope/pkg", version: "1.0.0", licence: "MIT", terms: ["MIT"] },
  ]);
});

test("C-6a008a66 npmLicenceOf treats a legacy or free-text licence as unknown", () => {
  const legacy = answer(() => npmLicenceOf({ license: { type: "MIT" } }));
  const freetext = answer(() => npmLicenceOf({ license: "SEE LICENSE IN LICENSE.md" }));
  assert.ok(legacy !== "THROWN", "npmLicenceOf answers for a legacy licence object");
  assert.ok(freetext !== "THROWN", "npmLicenceOf answers for a free-text licence");
  assert.equal(legacy.terms, null);
  assert.equal(freetext.terms, null);
  assert.ok(legacy.licence !== null, "the legacy licence text is present");
  assert.equal(freetext.licence, "SEE LICENSE IN LICENSE.md");
  const packages: InstalledPackage[] = [
    { ecosystem: "npm", name: "legacy", version: "1.0.0", licence: legacy.licence, terms: legacy.terms },
    { ecosystem: "npm", name: "freetext", version: "1.0.0", licence: freetext.licence, terms: freetext.terms },
  ];
  assert.deepEqual(
    answer(() => checkLicences(packages, { allowed: ALLOWED, exceptions: [] }, "node_modules/.pnpm")),
    [
      {
        code: "LICENCE_UNKNOWN",
        subject: "npm legacy@1.0.0",
        licence: legacy.licence,
        detail: "licence is not a parsable SPDX expression",
      },
      {
        code: "LICENCE_UNKNOWN",
        subject: "npm freetext@1.0.0",
        licence: "SEE LICENSE IN LICENSE.md",
        detail: "licence is not a parsable SPDX expression",
      },
    ],
  );
});

test("C-876fb064 an absent or empty store fails instead of passing", () => {
  const emptyRoot = tempRoot();
  assert.deepEqual(answer(() => scanNpmStore(emptyRoot)), []);
  assert.deepEqual(checkLicences([], { allowed: ALLOWED, exceptions: [] }, "node_modules/.pnpm"), [
    { code: "INVENTORY_EMPTY", subject: "node_modules/.pnpm", detail: "no packages found" },
  ]);
});

test("C-9d08ccc3 every installed npm package has an allowlisted licence", () => {
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
  const inventory = answer(() => scanNpmStore(repoRoot));
  assert.ok(Array.isArray(inventory), "the store scan yields an inventory");
  assert.ok(inventory.length > 0, "the scanned inventory is not empty");
  assert.equal(
    formatLicenceViolations(
      checkLicences(inventory, { allowed: ALLOWED_LICENCES, exceptions: LICENCE_EXCEPTIONS }, "node_modules/.pnpm"),
    ),
    "",
  );
});

test("C-706e1113 pythonLicenceOf reads an SPDX License-Expression", () => {
  const metadata = [
    "Metadata-Version: 2.1",
    "Name: dual-licensed",
    "Version: 2.0",
    "License-Expression: MIT AND PSF-2.0",
    "",
    "Dual licensed.",
  ].join("\n");
  assert.deepEqual(answer(() => pythonLicenceOf(metadata)), {
    licence: "MIT AND PSF-2.0",
    terms: ["MIT", "PSF-2.0"],
  });
});

test("C-0910d0a3 pythonLicenceOf falls back from free text to the classifiers", () => {
  const metadata = [
    "Metadata-Version: 2.1",
    "Name: apache",
    "Version: 1.0",
    "License: Apache License",
    "Classifier: License :: OSI Approved :: Apache Software License",
    "",
    "Free text.",
  ].join("\n");
  assert.deepEqual(answer(() => pythonLicenceOf(metadata)), {
    licence: "Apache Software License",
    terms: ["Apache-2.0"],
  });
});

test("C-dcc52cf2 a permissive classifier cannot hide a copyleft License text", () => {
  const metadata = [
    "Metadata-Version: 2.1",
    "Name: hidden",
    "Version: 1.0",
    "License: GPL-3.0-only",
    "Classifier: License :: OSI Approved :: MIT License",
    "",
    "Copyleft.",
  ].join("\n");
  const reading = answer(() => pythonLicenceOf(metadata));
  assert.ok(reading !== "THROWN", "pythonLicenceOf answers");
  assert.deepEqual(reading.terms, ["GPL-3.0-only", "MIT"]);
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [{ ecosystem: "pypi", name: "hidden", version: "1.0", licence: reading.licence, terms: reading.terms }],
        { allowed: ALLOWED, exceptions: [] },
        "e2e/.venv",
      ),
    ),
    [
      {
        code: "LICENCE_TERM_NOT_ALLOWED",
        subject: "pypi hidden@1.0",
        licence: reading.licence,
        detail: "terms not on the allowlist: GPL-3.0-only",
      },
    ],
  );
});

test("C-04784843 a one-word License is judged as an identifier", () => {
  const metadata = [
    "Metadata-Version: 2.1",
    "Name: bsd",
    "Version: 1.0",
    "License: BSD",
    "Classifier: License :: OSI Approved :: BSD License",
    "",
    "One word.",
  ].join("\n");
  const reading = answer(() => pythonLicenceOf(metadata));
  assert.ok(reading !== "THROWN", "pythonLicenceOf answers");
  assert.equal(reading.licence, "BSD; BSD License");
  assert.deepEqual(reading.terms, ["BSD", "BSD-3-Clause"]);
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [{ ecosystem: "pypi", name: "bsd", version: "1.0", licence: reading.licence, terms: reading.terms }],
        { allowed: ALLOWED, exceptions: [] },
        "e2e/.venv",
      ),
    ),
    [
      {
        code: "LICENCE_TERM_NOT_ALLOWED",
        subject: "pypi bsd@1.0",
        licence: "BSD; BSD License",
        detail: "terms not on the allowlist: BSD",
      },
    ],
  );
});

test("C-0db64dfc unmapped classifiers and missing licences fail", () => {
  const textUnidecode = [
    "Metadata-Version: 2.0",
    "Name: text-unidecode",
    "Version: 1.3",
    "License: Artistic License",
    "Classifier: License :: OSI Approved :: Artistic License",
    "Classifier: License :: OSI Approved :: GNU General Public License (GPL)",
    "Classifier: License :: OSI Approved :: GNU General Public License v2 or later (GPLv2+)",
    "",
    "Text-Unidecode",
  ].join("\n");
  const missing = ["Metadata-Version: 2.1", "Name: nolic", "Version: 1.0", "Summary: no licence", "", "Nothing."].join(
    "\n",
  );
  const first = answer(() => pythonLicenceOf(textUnidecode));
  const second = answer(() => pythonLicenceOf(missing));
  assert.ok(first !== "THROWN", "pythonLicenceOf answers for the unmapped classifiers");
  assert.ok(second !== "THROWN", "pythonLicenceOf answers for the missing licence");
  assert.deepEqual(first, {
    licence:
      "Artistic License; GNU General Public License (GPL); GNU General Public License v2 or later (GPLv2+)",
    terms: null,
  });
  assert.deepEqual(second, { licence: null, terms: null });
  assert.deepEqual(
    answer(() =>
      checkLicences(
        [
          { ecosystem: "pypi", name: "text-unidecode", version: "1.3", licence: first.licence, terms: first.terms },
          { ecosystem: "pypi", name: "nolic", version: "1.0", licence: second.licence, terms: second.terms },
        ],
        { allowed: ALLOWED, exceptions: [] },
        "e2e/.venv",
      ),
    ),
    [
      {
        code: "LICENCE_UNKNOWN",
        subject: "pypi text-unidecode@1.3",
        licence: first.licence,
        detail: "licence is not a parsable SPDX expression",
      },
      { code: "LICENCE_MISSING", subject: "pypi nolic@1.0", detail: "no licence found" },
    ],
  );
});

test("C-1fa7c3d4 scanPythonVenv reads dist-info across Python minors", () => {
  const venv = tempRoot();
  const pluggy = path.join(venv, "lib", "python3.12", "site-packages", "pluggy-1.7.0.dist-info");
  fs.mkdirSync(pluggy, { recursive: true });
  fs.writeFileSync(
    path.join(pluggy, "METADATA"),
    ["Metadata-Version: 2.1", "Name: pluggy", "Version: 1.7.0", "License: MIT", "", "Plugin manager."].join("\n"),
  );
  const fooBar = path.join(venv, "lib", "python3.13", "site-packages", "foo_bar-2.0.dist-info");
  fs.mkdirSync(fooBar, { recursive: true });
  assert.deepEqual(answer(() => scanPythonVenv(venv)), [
    { ecosystem: "pypi", name: "foo_bar", version: "2.0", licence: null, terms: null },
    { ecosystem: "pypi", name: "pluggy", version: "1.7.0", licence: "MIT", terms: ["MIT"] },
  ]);
});

test("C-2241065a decideVenvScan skips an absent venv that is not required", () => {
  const undefinedRequired = answer(() => decideVenvScan(false, undefined));
  assert.ok(undefinedRequired !== "THROWN", "decideVenvScan answers for an unavailable venv");
  if (undefinedRequired.action !== "skip") {
    assert.fail(`expected skip for an unavailable venv, got ${JSON.stringify(undefinedRequired)}`);
  }
  assert.match(undefinedRequired.message, /^e2e\/\.venv not found/);
  assert.match(undefinedRequired.message, /pnpm run e2e:setup/);
  assert.match(undefinedRequired.message, /E2E_REQUIRE_VENV/);
  const emptyRequired = answer(() => decideVenvScan(false, ""));
  assert.ok(emptyRequired !== "THROWN", "decideVenvScan answers with an empty requirement");
  if (emptyRequired.action !== "skip") {
    assert.fail(`expected skip with an empty requirement, got ${JSON.stringify(emptyRequired)}`);
  }
  assert.match(emptyRequired.message, /^e2e\/\.venv not found/);
  assert.match(emptyRequired.message, /pnpm run e2e:setup/);
  assert.match(emptyRequired.message, /E2E_REQUIRE_VENV/);
});

test("C-4ca6b05c decideVenvScan fails an absent venv that is required", () => {
  const required = answer(() => decideVenvScan(false, "1"));
  assert.ok(required !== "THROWN", "decideVenvScan answers for an absent venv that is required");
  if (required.action !== "fail") {
    assert.fail(`expected fail for an absent venv with E2E_REQUIRE_VENV set, got ${JSON.stringify(required)}`);
  }
  assert.equal(required.violation.code, "VENV_REQUIRED");
  assert.equal(required.violation.subject, "e2e/.venv");
});

test("C-87f4def2 C-69c81a68 decideVenvScan scans a present venv, and a present venv with no distributions fails", () => {
  assert.deepEqual(answer(() => decideVenvScan(true, "1")), { action: "scan" });
  assert.deepEqual(answer(() => decideVenvScan(true, undefined)), { action: "scan" });
  const emptyVenv = tempRoot();
  fs.mkdirSync(path.join(emptyVenv, "lib", "python3.12", "site-packages"), { recursive: true });
  assert.deepEqual(answer(() => scanPythonVenv(emptyVenv)), []);
  assert.deepEqual(checkLicences([], { allowed: ALLOWED, exceptions: [] }, "e2e/.venv"), [
    { code: "INVENTORY_EMPTY", subject: "e2e/.venv", detail: "no packages found" },
  ]);
});

test("C-8be4d4fc every Python distribution in the e2e venv has an allowlisted licence", (t) => {
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
  const venvDir = path.join(repoRoot, "e2e", ".venv");
  const required = process.env["E2E_REQUIRE_VENV"];
  const decided = answer(() => decideVenvScan(fs.existsSync(venvDir), required));
  assert.ok(decided !== "THROWN", "decideVenvScan answers for the e2e venv");
  if (decided.action === "skip") {
    t.skip(decided.message);
    return;
  }
  if (decided.action === "fail") {
    assert.fail(`the licence gate failed for the e2e venv: ${formatLicenceViolation(decided.violation)}`);
  }
  const inventory = answer(() => scanPythonVenv(venvDir));
  assert.ok(Array.isArray(inventory), "the venv scan yields an inventory");
  assert.ok(inventory.length > 0, "the scanned venv inventory is not empty");
  const unexcepted = checkLicences(inventory, { allowed: ALLOWED_LICENCES, exceptions: [] }, "e2e/.venv");
  assert.equal(unexcepted.length, 1, "only the reviewed exception is not exempt");
  const [only] = unexcepted;
  assert.ok(only, "one violation");
  assert.equal(only.code, "LICENCE_UNKNOWN");
  assert.equal(only.subject, "pypi text-unidecode@1.3");
  assert.equal(
    formatLicenceViolations(
      checkLicences(inventory, { allowed: ALLOWED_LICENCES, exceptions: LICENCE_EXCEPTIONS }, "e2e/.venv"),
    ),
    "",
  );
});

test("C-b51bd435 checkExactVersions refuses ranges, tags and other specs", () => {
  const manifest = {
    devDependencies: {
      vite: "^8.3.5",
      typescript: "~6.0.3",
      a: "*",
      b: "1.x",
      c: "latest",
      d: ">=1.0.0",
      e: "github:o/r",
      f: "file:../f",
    },
  };
  const violations = answer(() => checkExactVersions("web/package.json", manifest));
  assert.ok(Array.isArray(violations), "checkExactVersions answers");
  assert.equal(violations.length, 8, "one violation per inexact spec");
  for (const violation of violations) {
    assert.equal(violation.code, "VERSION_NOT_EXACT");
  }
  assert.deepEqual(violations[0], {
    code: "VERSION_NOT_EXACT",
    subject: "web/package.json devDependencies.vite",
    detail: '"^8.3.5" is not an exact version',
  });
});

test("C-ec3544f7 C-b51bd435 checkExactVersions passes exact versions and refuses a range", () => {
  assert.deepEqual(
    answer(() =>
      checkExactVersions("package.json", {
        dependencies: {
          react: "19.3.1",
          "embedded-postgres": "18.4.0-beta.17",
          alias: "npm:real@1.2.3",
        },
      }),
    ),
    [],
  );
  assert.deepEqual(
    answer(() => checkExactVersions("package.json", { dependencies: { react: "^19.3.1" } })),
    [
      {
        code: "VERSION_NOT_EXACT",
        subject: "package.json dependencies.react",
        detail: '"^19.3.1" is not an exact version',
      },
    ],
  );
});

test("C-6faaac53 checkExactVersions refuses a range in pnpm overrides", () => {
  assert.deepEqual(
    answer(() => checkExactVersions("package.json", { pnpm: { overrides: { semver: "^7.0.0" } } })),
    [
      {
        code: "VERSION_NOT_EXACT",
        subject: "package.json pnpm.overrides.semver",
        detail: '"^7.0.0" is not an exact version',
      },
    ],
  );
});

test("C-c39c579d checkExactVersions ignores other fields and refuses bad manifests", () => {
  assert.deepEqual(
    answer(() => checkExactVersions("package.json", { name: "x", engines: { node: ">=24" } })),
    [],
  );
  const invalid: LicenceViolation = {
    code: "MANIFEST_INVALID",
    subject: "package.json",
    detail: "not a JSON object",
  };
  assert.deepEqual(answer(() => checkExactVersions("package.json", [])), [invalid]);
  assert.deepEqual(answer(() => checkExactVersions("package.json", null)), [invalid]);
  assert.deepEqual(answer(() => checkExactVersions("package.json", { dependencies: [] })), [
    { code: "MANIFEST_INVALID", subject: "package.json dependencies", detail: "not a plain object" },
  ]);
});

test("C-7fbf0b22 checkExactVersions names manifest violations", () => {
  assert.deepEqual(answer(() => checkExactVersions("web/package.json", null)), [
    { code: "MANIFEST_INVALID", subject: "web/package.json", detail: "not a JSON object" },
  ]);
  assert.deepEqual(answer(() => checkExactVersions("web/package.json", { dependencies: [] })), [
    { code: "MANIFEST_INVALID", subject: "web/package.json dependencies", detail: "not a plain object" },
  ]);
});

test("C-05d0c7f9 C-b51bd435 every dependency range in the root and web manifests is an exact version", () => {
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
  const violations: LicenceViolation[] = [];
  for (const manifestPath of MANIFEST_PATHS) {
    let manifest: unknown = null;
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, manifestPath), "utf8"));
    } catch {
      manifest = null;
    }
    const found = answer(() => checkExactVersions(manifestPath, manifest));
    assert.ok(Array.isArray(found), `checkExactVersions answers for ${manifestPath}`);
    violations.push(...found);
  }
  assert.equal(formatLicenceViolations(violations), "", "every dependency spec is an exact version");
  assert.deepEqual(
    answer(() => checkExactVersions("package.json", { dependencies: { probe: "^1.0.0" } })),
    [
      {
        code: "VERSION_NOT_EXACT",
        subject: "package.json dependencies.probe",
        detail: '"^1.0.0" is not an exact version',
      },
    ],
  );
});

test("C-606611bb C-41ded6c9 onlyBuiltDependencies equals the reviewed list", () => {
  const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
  let workspaceYaml = "";
  try {
    workspaceYaml = fs.readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8");
  } catch {
    workspaceYaml = "";
  }
  assert.deepEqual(
    answer(() => checkBuiltDependencies(workspaceYaml, REVIEWED_BUILT_DEPENDENCIES)),
    [],
    "the repository list matches the reviewed list",
  );
  const reordered = workspaceYamlWith([...REVIEWED_BUILT_DEPENDENCIES].reverse(), true);
  assert.deepEqual(
    answer(() => checkBuiltDependencies(reordered, REVIEWED_BUILT_DEPENDENCIES)),
    [],
    "reordering and quoting do not change the set",
  );
  const drift = answer(() =>
    checkBuiltDependencies(workspaceYamlWith([...REVIEWED_BUILT_DEPENDENCIES, "evil-postinstall"]), REVIEWED_BUILT_DEPENDENCIES),
  );
  assert.ok(Array.isArray(drift), "checkBuiltDependencies answers for a drifted list");
  assert.equal(drift.length, 1, "an added package is drift");
});

test("C-41ded6c9 checkBuiltDependencies fails an added package", () => {
  const workspaceYaml = workspaceYamlWith([...REVIEWED_BUILT_DEPENDENCIES, "evil-postinstall"]);
  assert.deepEqual(answer(() => checkBuiltDependencies(workspaceYaml, REVIEWED_BUILT_DEPENDENCIES)), [
    {
      code: "BUILT_DEPS_DRIFT",
      subject: "pnpm-workspace.yaml onlyBuiltDependencies",
      detail:
        "not reviewed: [evil-postinstall]; change pnpm-workspace.yaml and test/arch/licence-policy.ts together",
    },
  ]);
});

test("C-4557b8b9 checkBuiltDependencies fails a removed package or a duplicate", () => {
  const withoutEsbuild = REVIEWED_BUILT_DEPENDENCIES.filter((name) => name !== "esbuild");
  assert.deepEqual(answer(() => checkBuiltDependencies(workspaceYamlWith(withoutEsbuild), REVIEWED_BUILT_DEPENDENCIES)), [
    {
      code: "BUILT_DEPS_DRIFT",
      subject: "pnpm-workspace.yaml onlyBuiltDependencies",
      detail: "missing: [esbuild]; change pnpm-workspace.yaml and test/arch/licence-policy.ts together",
    },
  ]);
  const duplicated = workspaceYamlWith([...REVIEWED_BUILT_DEPENDENCIES, "esbuild"]);
  assert.deepEqual(answer(() => checkBuiltDependencies(duplicated, REVIEWED_BUILT_DEPENDENCIES)), [
    {
      code: "BUILT_DEPS_DRIFT",
      subject: "pnpm-workspace.yaml onlyBuiltDependencies",
      detail: "duplicates: [esbuild]; change pnpm-workspace.yaml and test/arch/licence-policy.ts together",
    },
  ]);
});

test("C-ed7ff850 checkBuiltDependencies handles an absent key, an empty reviewed list and an unsupported form", () => {
  assert.deepEqual(answer(() => checkBuiltDependencies('packages:\n  - "."\n', ["esbuild"])), [
    {
      code: "BUILT_DEPS_DRIFT",
      subject: "pnpm-workspace.yaml onlyBuiltDependencies",
      detail: "key not found; change pnpm-workspace.yaml and test/arch/licence-policy.ts together",
    },
  ]);
  assert.deepEqual(answer(() => checkBuiltDependencies("onlyBuiltDependencies:\n", [])), []);
  let message: string | null = null;
  try {
    readTopLevelList("onlyBuiltDependencies: [esbuild]\n", "onlyBuiltDependencies");
  } catch (error) {
    message = error instanceof Error ? error.message : String(error);
  }
  assert.ok(
    message !== null && message.startsWith("unsupported YAML form"),
    `readTopLevelList refuses an inline list with an unsupported YAML form error, got ${String(message)}`,
  );
});

test("C-59b6d3e2 checkBuiltDependencies fails a missing workspace file", () => {
  const violations = answer(() => checkBuiltDependencies("", REVIEWED_BUILT_DEPENDENCIES));
  assert.ok(Array.isArray(violations), "checkBuiltDependencies answers for a missing workspace file");
  assert.equal(violations.length, 1);
  const [first] = violations;
  assert.ok(first, "one violation");
  assert.equal(first.code, "BUILT_DEPS_DRIFT");
  assert.equal(first.subject, "pnpm-workspace.yaml onlyBuiltDependencies");
  assert.ok(
    first.detail.startsWith("key not found"),
    `the detail names the absent key, got ${first.detail}`,
  );
});

test("C-75476b3c checkBuiltDependencies gives the fixed drift details in order", () => {
  const reviewed = ["esbuild"];
  assert.deepEqual(answer(() => checkBuiltDependencies('packages:\n  - "."\n', reviewed)), [
    {
      code: "BUILT_DEPS_DRIFT",
      subject: "pnpm-workspace.yaml onlyBuiltDependencies",
      detail: "key not found; change pnpm-workspace.yaml and test/arch/licence-policy.ts together",
    },
  ]);
  const unsupported = answer(() => checkBuiltDependencies("onlyBuiltDependencies: [esbuild]\n", reviewed));
  assert.ok(Array.isArray(unsupported), "checkBuiltDependencies answers for an unsupported form");
  assert.equal(unsupported.length, 1);
  const [unsupportedFirst] = unsupported;
  assert.ok(unsupportedFirst, "one violation");
  assert.equal(unsupportedFirst.code, "BUILT_DEPS_DRIFT");
  assert.equal(unsupportedFirst.subject, "pnpm-workspace.yaml onlyBuiltDependencies");
  assert.ok(
    unsupportedFirst.detail.startsWith("unsupported form: unsupported YAML form"),
    `the detail starts with the parser error, got ${unsupportedFirst.detail}`,
  );
  assert.ok(
    unsupportedFirst.detail.endsWith("change pnpm-workspace.yaml and test/arch/licence-policy.ts together"),
    `the detail ends with the review instruction, got ${unsupportedFirst.detail}`,
  );
  assert.deepEqual(answer(() => checkBuiltDependencies(workspaceYamlWith(["evil", "evil"]), reviewed)), [
    {
      code: "BUILT_DEPS_DRIFT",
      subject: "pnpm-workspace.yaml onlyBuiltDependencies",
      detail:
        "not reviewed: [evil]; missing: [esbuild]; duplicates: [evil]; change pnpm-workspace.yaml and test/arch/licence-policy.ts together",
    },
  ]);
});
