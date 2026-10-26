// Reviewed licence policy (architecture ADR-15) and install-time policy (owner decision 0001).
// This is data, not logic: it is written in the red step of task 1.2 and frozen after. A person changes it,
// never the implementer of the gate.
import type { LicenceException } from "./licence-rules.ts";

// Permissive licences the owner may relicense: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, PostgreSQL,
// 0BSD, CC0-1.0, MPL-2.0 (unmodified), BlueOak-1.0.0 and PSF-2.0. Never GPL, AGPL, LGPL, SSPL, BSL or Elastic.
export const ALLOWED_LICENCES: readonly string[] = [
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

// The one reviewed exception: a test-only transitive dependency of the e2e venv, offered under the Artistic
// License or the GPL. Pinned to its exact ecosystem, name, version and licence text.
export const LICENCE_EXCEPTIONS: readonly LicenceException[] = [
  {
    ecosystem: "pypi",
    name: "text-unidecode",
    version: "1.3",
    licence:
      "Artistic License; GNU General Public License (GPL); GNU General Public License v2 or later (GPLv2+)",
    reason:
      "Test-only transitive dependency of the e2e venv, offered under the Artistic License or the GPL.",
  },
];

// Python `License ::` classifier text (after `License :: ` and an optional `OSI Approved :: `) to SPDX identifier.
export const PYPI_CLASSIFIER_SPDX: Readonly<Record<string, string>> = {
  "MIT License": "MIT",
  "BSD License": "BSD-3-Clause",
  "Apache Software License": "Apache-2.0",
  "ISC License (ISCL)": "ISC",
  "Python Software Foundation License": "PSF-2.0",
  "PostgreSQL License": "PostgreSQL",
  "Mozilla Public License 2.0 (MPL 2.0)": "MPL-2.0",
  "Zero-Clause BSD (0BSD)": "0BSD",
  "CC0 1.0 Universal (CC0 1.0) Public Domain Dedication": "CC0-1.0",
};

// Dependencies whose install scripts are reviewed and may run.
export const REVIEWED_BUILT_DEPENDENCIES: readonly string[] = [
  "@embedded-postgres/darwin-arm64",
  "@embedded-postgres/darwin-x64",
  "@embedded-postgres/linux-arm64",
  "@embedded-postgres/linux-x64",
  "esbuild",
];

export const MANIFEST_PATHS: readonly string[] = ["package.json", "web/package.json"];
