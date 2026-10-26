# Verification: openspec:add-supply-chain-gate: PASS (round 1)

traceability: 60/60 criteria covered by a discriminating test

- Base: `9592053888faff7cf544590205cdae761f04569e`
- Head: `60aef01e689b74b53ee84e5897adae1f652f66c7`
- Implementer profiles: deepseek, glm, claude-sonnet
- Judge: gemini-judge, 1 call(s), prompt sha256 `c9e820f33718e2a6336dc82dc1d58173745a89a375ed20ddb3c863d08f4befd7`
- Judge replies of gemini-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): gemini-judge google (declared), deepseek deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $0.4416

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@9592053888 contained |
| 1 | integrity | ok | 8.5 | 10 sub-checks; scope: 5 changed file(s) |
| 2 | build | ok | 13.1 |  |
| 3 | tests | ok | 6.1 |  |
| 4 | traceability | ok | 0.0 | 60/60 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: test/arch/licence-policy.ts, test/arch/licence-rules.ts |
| 8 | s1 judge | ok | 5.2 | 59/60 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 355.4 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261026T1203Z-cac6/230-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261026T1203Z-cac6/231-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261026T1203Z-cac6/232-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261026T1203Z-cac6/233-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261026T1203Z-cac6/234-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261026T1203Z-cac6/235-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261026T1203Z-cac6/236-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 10 task(s): red and green compared |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | skipped | not checked: python only; changed files outside it: test/arch/licence-policy.ts |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/arch/licence-policy.ts, test/arch/licence-rules.ts, test/arch/licences.test.ts |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 97 of 97 base tests pass on the unit's code with its 2 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-b51bd435 | install-time-code › Every dependency spec in the manifests is an exact version › Ranges, tags and other specs fail | covered | test.arch.licences.test.ts::C-05d0c7f9 C-b51bd435 every dependency range in the root and web manifests is an exact version (passed, red_assertion); test.arch.licences.test.ts::C-b51bd435 checkExactVersions refuses ranges, tags and other specs (passed, red_assertion); test.arch.licences.test.ts::C-ec... | - | 0.91 |
| C-ec3544f7 | install-time-code › Every dependency spec in the manifests is an exact version › Exact versions pass | covered | test.arch.licences.test.ts::C-ec3544f7 C-b51bd435 checkExactVersions passes exact versions and refuses a range (passed, red_assertion) | - | 0.67 |
| C-6faaac53 | install-time-code › Every dependency spec in the manifests is an exact version › A range in overrides fails | covered | test.arch.licences.test.ts::C-6faaac53 checkExactVersions refuses a range in pnpm overrides (passed, red_assertion) | - | 0.92 |
| C-c39c579d | install-time-code › Every dependency spec in the manifests is an exact version › Nothing to check and bad manifests | covered | test.arch.licences.test.ts::C-c39c579d checkExactVersions ignores other fields and refuses bad manifests (passed, red_assertion) | - | 0.90 |
| C-05d0c7f9 | install-time-code › Every dependency spec in the manifests is an exact version › The repository manifests are pinned | covered | test.arch.licences.test.ts::C-05d0c7f9 C-b51bd435 every dependency range in the root and web manifests is an exact version (passed, red_assertion) | - | 0.84 |
| C-606611bb | install-time-code › onlyBuiltDependencies equals the reviewed list › The lists match | covered | test.arch.licences.test.ts::C-606611bb C-41ded6c9 onlyBuiltDependencies equals the reviewed list (passed, red_assertion) | - | 0.60 |
| C-41ded6c9 | install-time-code › onlyBuiltDependencies equals the reviewed list › An added package fails | covered | test.arch.licences.test.ts::C-41ded6c9 checkBuiltDependencies fails an added package (passed, red_assertion); test.arch.licences.test.ts::C-606611bb C-41ded6c9 onlyBuiltDependencies equals the reviewed list (passed, red_assertion) | - | 0.88 |
| C-4557b8b9 | install-time-code › onlyBuiltDependencies equals the reviewed list › A removed package or a duplicate fails | covered | test.arch.licences.test.ts::C-4557b8b9 checkBuiltDependencies fails a removed package or a duplicate (passed, red_assertion) | - | 0.84 |
| C-ed7ff850 | install-time-code › onlyBuiltDependencies equals the reviewed list › Absent key, empty reviewed list and unsupported forms | covered | test.arch.licences.test.ts::C-ed7ff850 checkBuiltDependencies handles an absent key, an empty reviewed list and an unsupported form (passed, red_assertion) | - | 0.94 |
| C-59b6d3e2 | install-time-code › onlyBuiltDependencies equals the reviewed list › A missing workspace file fails | covered | test.arch.licences.test.ts::C-59b6d3e2 checkBuiltDependencies fails a missing workspace file (passed, red_assertion) | - | 0.79 |
| C-67d87882 | install-time-code › No code runs at install time outside the reviewed list › A lifecycle script fails | covered | test.arch.licences.test.ts::C-67d87882 checkInstallHooks refuses every install-time lifecycle script (passed, red_assertion); test.arch.licences.test.ts::C-79c32cd5 C-67d87882 the repository runs no install hooks (passed, red_assertion) | - | 0.92 |
| C-7dd0d742 | install-time-code › No code runs at install time outside the reviewed list › A pnpm setting other than overrides fails | covered | test.arch.licences.test.ts::C-7dd0d742 checkInstallHooks refuses a pnpm setting other than overrides (passed, red_assertion) | - | 0.87 |
| C-a223af90 | install-time-code › No code runs at install time outside the reviewed list › Ordinary scripts, overrides and bad shapes | covered | test.arch.licences.test.ts::C-a223af90 checkInstallHooks allows ordinary scripts and overrides and refuses bad shapes (passed, red_assertion) | - | 0.92 |
| C-2ae464e9 | install-time-code › No code runs at install time outside the reviewed list › A pnpmfile fails | covered | test.arch.licences.test.ts::C-2ae464e9 checkInstallFiles reports a root pnpmfile (passed, red_assertion); test.arch.licences.test.ts::C-79c32cd5 C-2ae464e9 checkInstallFiles finds nothing in clean roots and a pnpmfile in a dirty one (passed, red_assertion) | - | 0.93 |
| C-4767d4f0 | install-time-code › No code runs at install time outside the reviewed list › Forbidden workspace keys fail | covered | test.arch.licences.test.ts::C-4767d4f0 checkInstallFiles refuses forbidden workspace keys (passed, red_assertion) | - | 0.90 |
| C-0f36e537 | install-time-code › No code runs at install time outside the reviewed list › Forbidden npmrc keys fail | covered | test.arch.licences.test.ts::C-0f36e537 checkInstallFiles refuses forbidden npmrc keys (passed, red_assertion) | - | 0.93 |
| C-0797a2c3 | install-time-code › No code runs at install time outside the reviewed list › Keys are read from column 0 only | covered | test.arch.licences.test.ts::C-0797a2c3 topLevelKeys reads keys from column zero only (passed, red_assertion) | - | 0.91 |
| C-79c32cd5 | install-time-code › No code runs at install time outside the reviewed list › Nothing to find | covered | test.arch.licences.test.ts::C-79c32cd5 C-2ae464e9 checkInstallFiles finds nothing in clean roots and a pnpmfile in a dirty one (passed, red_assertion); test.arch.licences.test.ts::C-79c32cd5 C-67d87882 the repository runs no install hooks (passed, red_assertion) | - | 0.90 |
| C-ce1eedc7 | install-time-code › The licence gate reads files only › Forbidden imports are found | covered | test.arch.licences.test.ts::C-115a4581 C-ce1eedc7 the licence gate reads files only (passed, red_assertion); test.arch.licences.test.ts::C-ce1eedc7 findForbiddenImports reports imports, dynamic imports, require and fetch (passed, red_assertion) | - | 0.93 |
| C-ed8723d5 | install-time-code › The licence gate reads files only › Clean source, comments and string text | covered | test.arch.licences.test.ts::C-ed8723d5 findForbiddenImports ignores text inside comments and literals (passed, red_assertion) | - | 0.93 |
| C-115a4581 | install-time-code › The licence gate reads files only › The gate's own files are clean | covered | test.arch.licences.test.ts::C-115a4581 C-ce1eedc7 the licence gate reads files only (passed, red_assertion) | - | 0.82 |
| C-2fb3cbe9 | supply-chain › Installed npm packages carry only allowlisted licences › A copyleft term fails | covered | test.arch.licences.test.ts::C-2fb3cbe9 checkLicences fails a copyleft term (passed, red_assertion) | - | 0.93 |
| C-30fdcfea | supply-chain › Installed npm packages carry only allowlisted licences › A permissive licence passes | covered | test.arch.licences.test.ts::C-30fdcfea checkLicences passes permissive licences (passed, red_assertion) | - | 0.90 |
| C-a74a1a7f | supply-chain › Installed npm packages carry only allowlisted licences › A store fixture is walked without following symlinks | covered | test.arch.licences.test.ts::C-a74a1a7f scanNpmStore walks the store without following symlinks (passed, red_assertion) | - | 0.83 |
| C-ae5033da | supply-chain › Installed npm packages carry only allowlisted licences › A package without a licence fails | covered | test.arch.licences.test.ts::C-ae5033da checkLicences reports a package without a licence (passed, red_assertion) | - | 0.93 |
| C-6a008a66 | supply-chain › Installed npm packages carry only allowlisted licences › A legacy or free-text licence is unknown | covered | test.arch.licences.test.ts::C-6a008a66 npmLicenceOf treats a legacy or free-text licence as unknown (passed, red_assertion) | - | 0.93 |
| C-876fb064 | supply-chain › Installed npm packages carry only allowlisted licences › An absent or empty store fails instead of passing | covered | test.arch.licences.test.ts::C-876fb064 an absent or empty store fails instead of passing (passed, red_assertion) | - | 0.92 |
| C-9d08ccc3 | supply-chain › Installed npm packages carry only allowlisted licences › The current lockfile passes | covered | test.arch.licences.test.ts::C-9d08ccc3 every installed npm package has an allowlisted licence (passed, red_assertion) | - | 0.89 |
| C-b7a7ed55 | supply-chain › Every term of a licence expression is judged › Terms are parsed | covered | test.arch.licences.test.ts::C-b7a7ed55 parseLicenceExpression reads the distinct terms of an expression (passed, red_assertion) | - | 0.86 |
| C-30f06cd4 | supply-chain › Every term of a licence expression is judged › Every term is judged | covered | test.arch.licences.test.ts::C-30f06cd4 checkLicences judges every term of a licence expression (passed, red_assertion) | - | 0.93 |
| C-1524fbc5 | supply-chain › Every term of a licence expression is judged › Malformed expressions are unknown | covered | test.arch.licences.test.ts::C-1524fbc5 parseLicenceExpression gives null for malformed expressions only (passed, red_assertion) | - | 0.84 |
| C-ca426357 | supply-chain › Every term of a licence expression is judged › A near-miss identifier is not allowed | covered | test.arch.licences.test.ts::C-ca426357 checkLicences refuses a near-miss identifier (passed, red_assertion) | - | 0.88 |
| C-7f94877e | supply-chain › Every term of a licence expression is judged › Case does not hide a term | covered | test.arch.licences.test.ts::C-7f94877e checkLicences matches terms without regard to case (passed, red_assertion) | - | 0.45 |
| C-92d19a9f | supply-chain › Exceptions are reviewed, pinned and justified › A matching exception passes | covered | test.arch.licences.test.ts::C-92d19a9f C-6107b0c0 checkLicences exempts only the reviewed version and licence text (passed, red_assertion) | - | 0.85 |
| C-6107b0c0 | supply-chain › Exceptions are reviewed, pinned and justified › A new version or a changed licence is not exempt | covered | test.arch.licences.test.ts::C-92d19a9f C-6107b0c0 checkLicences exempts only the reviewed version and licence text (passed, red_assertion) | - | 0.91 |
| C-7b90839f | supply-chain › Exceptions are reviewed, pinned and justified › Malformed policy data fails | covered | test.arch.licences.test.ts::C-7b90839f checkPolicy rejects malformed policy data in order (passed, red_assertion) | - | 0.92 |
| C-c18692e2 | supply-chain › Exceptions are reviewed, pinned and justified › The reviewed policy is well formed | covered | test.arch.licences.test.ts::C-c18692e2 C-73030b3f the licence policy data is well formed (passed, red_assertion) | - | 0.88 |
| C-8eaf01ec | supply-chain › Exception versions are judged per ecosystem › Pypi release segments are exact | covered | test.arch.licences.test.ts::C-8eaf01ec checkPolicy admits pypi release segment versions (passed, red_assertion) | - | 0.92 |
| C-6c266a75 | supply-chain › Exception versions are judged per ecosystem › Pypi versions that are not a release segment fail | covered | test.arch.licences.test.ts::C-6c266a75 checkPolicy refuses pypi versions that are not a release segment (passed, red_assertion) | - | 0.90 |
| C-991042c4 | supply-chain › Exception versions are judged per ecosystem › Npm versions use isExactVersion | covered | test.arch.licences.test.ts::C-991042c4 checkPolicy judges npm exception versions with isExactVersion (passed, red_assertion) | - | 0.89 |
| C-ae2f6322 | supply-chain › Exception versions are judged per ecosystem › An unknown ecosystem is not judged on its version | covered | test.arch.licences.test.ts::C-ae2f6322 checkPolicy does not judge an unknown ecosystem on its version (passed, red_assertion) | - | 0.88 |
| C-65a32526 | supply-chain › Exception versions are judged per ecosystem › The reviewed exception version is exact | covered | test.arch.licences.test.ts::C-65a32526 checkPolicy accepts the reviewed exception version (passed, red_assertion) | - | 0.79 |
| C-706e1113 | supply-chain › Installed Python distributions carry only allowlisted licences › An SPDX expression is read | covered | test.arch.licences.test.ts::C-706e1113 pythonLicenceOf reads an SPDX License-Expression (passed, red_assertion) | - | 0.90 |
| C-0910d0a3 | supply-chain › Installed Python distributions carry only allowlisted licences › A free-text licence falls back to classifiers | covered | test.arch.licences.test.ts::C-0910d0a3 pythonLicenceOf falls back from free text to the classifiers (passed, red_assertion) | - | 0.78 |
| C-dcc52cf2 | supply-chain › Installed Python distributions carry only allowlisted licences › A permissive classifier cannot hide a copyleft text | covered | test.arch.licences.test.ts::C-dcc52cf2 a permissive classifier cannot hide a copyleft License text (passed, red_assertion) | - | 0.94 |
| C-04784843 | supply-chain › Installed Python distributions carry only allowlisted licences › A one-word licence is judged as an identifier | covered | test.arch.licences.test.ts::C-04784843 a one-word License is judged as an identifier (passed, red_assertion) | - | 0.61 |
| C-0db64dfc | supply-chain › Installed Python distributions carry only allowlisted licences › Unmapped classifiers and missing licences fail | covered | test.arch.licences.test.ts::C-0db64dfc unmapped classifiers and missing licences fail (passed, red_assertion) | - | 0.92 |
| C-1fa7c3d4 | supply-chain › Installed Python distributions carry only allowlisted licences › The venv is scanned across Python minors | covered | test.arch.licences.test.ts::C-1fa7c3d4 scanPythonVenv reads dist-info across Python minors (passed, red_assertion) | - | 0.93 |
| C-8be4d4fc | supply-chain › Installed Python distributions carry only allowlisted licences › The current venv passes | covered | test.arch.licences.test.ts::C-8be4d4fc every Python distribution in the e2e venv has an allowlisted licence (passed, red_assertion) | - | 0.84 |
| C-2241065a | supply-chain › A missing e2e venv skips unless it is required › Absent and not required | covered | test.arch.licences.test.ts::C-2241065a decideVenvScan skips an absent venv that is not required (passed, red_assertion) | - | 0.86 |
| C-4ca6b05c | supply-chain › A missing e2e venv skips unless it is required › Absent and required | covered | test.arch.licences.test.ts::C-4ca6b05c decideVenvScan fails an absent venv that is required (passed, red_assertion) | - | 0.94 |
| C-87f4def2 | supply-chain › A missing e2e venv skips unless it is required › Present | covered | test.arch.licences.test.ts::C-87f4def2 C-69c81a68 decideVenvScan scans a present venv, and a present venv with no distributions fails (passed, red_assertion) | - | 0.76 |
| C-69c81a68 | supply-chain › A missing e2e venv skips unless it is required › A present venv with no distributions fails | covered | test.arch.licences.test.ts::C-87f4def2 C-69c81a68 decideVenvScan scans a present venv, and a present venv with no distributions fails (passed, red_assertion) | - | 0.61 |
| C-f0b009a1 | supply-chain › Failures name the package, version, licence and rule › A licence violation message | covered | test.arch.licences.test.ts::C-f0b009a1 formatLicenceViolation names code, subject, licence and detail (passed, red_assertion) | - | 0.96 |
| C-db08d47c | supply-chain › Failures name the package, version, licence and rule › A long licence text is cut | covered | test.arch.licences.test.ts::C-db08d47c formatLicenceViolation cuts a long licence text and omits an absent one (passed, red_assertion) | - | 0.94 |
| C-1c977f83 | supply-chain › Failures name the package, version, licence and rule › All offenders in one run | covered | test.arch.licences.test.ts::C-1c977f83 formatLicenceViolations joins the lines with a newline and gives an empty string for none (passed, red_assertion) | - | 0.94 |
| C-73030b3f | supply-chain › The reviewed policy values are fixed › The values | covered | test.arch.licences.test.ts::C-c18692e2 C-73030b3f the licence policy data is well formed (passed, red_assertion) | - | - |
| C-ff913dc5 | supply-chain › Violations carry fixed subjects and details › Package violations | covered | test.arch.licences.test.ts::C-ff913dc5 checkLicences gives fixed subjects and details (passed, red_assertion) | - | 0.94 |
| C-7fbf0b22 | supply-chain › Violations carry fixed subjects and details › Manifest violations | covered | test.arch.licences.test.ts::C-7fbf0b22 checkExactVersions names manifest violations (passed, red_assertion) | - | 0.90 |
| C-75476b3c | supply-chain › Violations carry fixed subjects and details › Built dependency details | covered | test.arch.licences.test.ts::C-75476b3c checkBuiltDependencies gives the fixed drift details in order (passed, red_assertion) | - | 0.92 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-supply-chain-gate/.l4/ledger/r-20261026T1203Z-cac6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-supply-chain-gate/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/arch/licence-policy.ts` | test | relevant | named in the spec |
| `test/arch/licence-rules.ts` | test | relevant | named in the spec |
| `test/arch/licences.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: test/arch/licence-policy.ts, test/arch/licence-rules.ts

### Tests

156 of 156 passed, 0 failed, 0 errored, 0 skipped.
58 of 58 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-b51bd435 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ec3544f7 | ok | 0.670 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6faaac53 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c39c579d | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-05d0c7f9 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-606611bb | ok | 0.600 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-41ded6c9 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4557b8b9 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ed7ff850 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-59b6d3e2 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-67d87882 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7dd0d742 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a223af90 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2ae464e9 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4767d4f0 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0f36e537 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0797a2c3 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-79c32cd5 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ce1eedc7 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ed8723d5 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-115a4581 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2fb3cbe9 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-30fdcfea | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a74a1a7f | ok | 0.830 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ae5033da | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6a008a66 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-876fb064 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9d08ccc3 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b7a7ed55 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-30f06cd4 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1524fbc5 | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ca426357 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7f94877e | ok | 0.450 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-92d19a9f | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6107b0c0 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7b90839f | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c18692e2 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8eaf01ec | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6c266a75 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-991042c4 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ae2f6322 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-65a32526 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-706e1113 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0910d0a3 | ok | 0.780 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dcc52cf2 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-04784843 | ok | 0.610 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0db64dfc | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1fa7c3d4 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8be4d4fc | ok | 0.840 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2241065a | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4ca6b05c | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87f4def2 | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69c81a68 | ok | 0.610 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f0b009a1 | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-db08d47c | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1c977f83 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-73030b3f | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-ff913dc5 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7fbf0b22 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-75476b3c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-b51bd435 | install-time-code › Every dependency spec in the manifests is an exact version › Ranges, tags and other specs fail | pass | pass | the judge passed it and a discriminating test passes |
| C-ec3544f7 | install-time-code › Every dependency spec in the manifests is an exact version › Exact versions pass | pass | pass | the judge passed it and a discriminating test passes |
| C-6faaac53 | install-time-code › Every dependency spec in the manifests is an exact version › A range in overrides fails | pass | pass | the judge passed it and a discriminating test passes |
| C-c39c579d | install-time-code › Every dependency spec in the manifests is an exact version › Nothing to check and bad manifests | pass | pass | the judge passed it and a discriminating test passes |
| C-05d0c7f9 | install-time-code › Every dependency spec in the manifests is an exact version › The repository manifests are pinned | pass | pass | the judge passed it and a discriminating test passes |
| C-606611bb | install-time-code › onlyBuiltDependencies equals the reviewed list › The lists match | pass | pass | the judge passed it and a discriminating test passes |
| C-41ded6c9 | install-time-code › onlyBuiltDependencies equals the reviewed list › An added package fails | pass | pass | the judge passed it and a discriminating test passes |
| C-4557b8b9 | install-time-code › onlyBuiltDependencies equals the reviewed list › A removed package or a duplicate fails | pass | pass | the judge passed it and a discriminating test passes |
| C-ed7ff850 | install-time-code › onlyBuiltDependencies equals the reviewed list › Absent key, empty reviewed list and unsupported forms | pass | pass | the judge passed it and a discriminating test passes |
| C-59b6d3e2 | install-time-code › onlyBuiltDependencies equals the reviewed list › A missing workspace file fails | pass | pass | the judge passed it and a discriminating test passes |
| C-67d87882 | install-time-code › No code runs at install time outside the reviewed list › A lifecycle script fails | pass | pass | the judge passed it and a discriminating test passes |
| C-7dd0d742 | install-time-code › No code runs at install time outside the reviewed list › A pnpm setting other than overrides fails | pass | pass | the judge passed it and a discriminating test passes |
| C-a223af90 | install-time-code › No code runs at install time outside the reviewed list › Ordinary scripts, overrides and bad shapes | pass | pass | the judge passed it and a discriminating test passes |
| C-2ae464e9 | install-time-code › No code runs at install time outside the reviewed list › A pnpmfile fails | pass | pass | the judge passed it and a discriminating test passes |
| C-4767d4f0 | install-time-code › No code runs at install time outside the reviewed list › Forbidden workspace keys fail | pass | pass | the judge passed it and a discriminating test passes |
| C-0f36e537 | install-time-code › No code runs at install time outside the reviewed list › Forbidden npmrc keys fail | pass | pass | the judge passed it and a discriminating test passes |
| C-0797a2c3 | install-time-code › No code runs at install time outside the reviewed list › Keys are read from column 0 only | pass | pass | the judge passed it and a discriminating test passes |
| C-79c32cd5 | install-time-code › No code runs at install time outside the reviewed list › Nothing to find | pass | pass | the judge passed it and a discriminating test passes |
| C-ce1eedc7 | install-time-code › The licence gate reads files only › Forbidden imports are found | pass | pass | the judge passed it and a discriminating test passes |
| C-ed8723d5 | install-time-code › The licence gate reads files only › Clean source, comments and string text | pass | pass | the judge passed it and a discriminating test passes |
| C-115a4581 | install-time-code › The licence gate reads files only › The gate's own files are clean | pass | pass | the judge passed it and a discriminating test passes |
| C-2fb3cbe9 | supply-chain › Installed npm packages carry only allowlisted licences › A copyleft term fails | pass | pass | the judge passed it and a discriminating test passes |
| C-30fdcfea | supply-chain › Installed npm packages carry only allowlisted licences › A permissive licence passes | pass | pass | the judge passed it and a discriminating test passes |
| C-a74a1a7f | supply-chain › Installed npm packages carry only allowlisted licences › A store fixture is walked without following symlinks | pass | pass | the judge passed it and a discriminating test passes |
| C-ae5033da | supply-chain › Installed npm packages carry only allowlisted licences › A package without a licence fails | pass | pass | the judge passed it and a discriminating test passes |
| C-6a008a66 | supply-chain › Installed npm packages carry only allowlisted licences › A legacy or free-text licence is unknown | pass | pass | the judge passed it and a discriminating test passes |
| C-876fb064 | supply-chain › Installed npm packages carry only allowlisted licences › An absent or empty store fails instead of passing | pass | pass | the judge passed it and a discriminating test passes |
| C-9d08ccc3 | supply-chain › Installed npm packages carry only allowlisted licences › The current lockfile passes | pass | pass | the judge passed it and a discriminating test passes |
| C-b7a7ed55 | supply-chain › Every term of a licence expression is judged › Terms are parsed | pass | pass | the judge passed it and a discriminating test passes |
| C-30f06cd4 | supply-chain › Every term of a licence expression is judged › Every term is judged | pass | pass | the judge passed it and a discriminating test passes |
| C-1524fbc5 | supply-chain › Every term of a licence expression is judged › Malformed expressions are unknown | pass | pass | the judge passed it and a discriminating test passes |
| C-ca426357 | supply-chain › Every term of a licence expression is judged › A near-miss identifier is not allowed | pass | pass | the judge passed it and a discriminating test passes |
| C-7f94877e | supply-chain › Every term of a licence expression is judged › Case does not hide a term | pass | pass | the judge passed it and a discriminating test passes |
| C-92d19a9f | supply-chain › Exceptions are reviewed, pinned and justified › A matching exception passes | pass | pass | the judge passed it and a discriminating test passes |
| C-6107b0c0 | supply-chain › Exceptions are reviewed, pinned and justified › A new version or a changed licence is not exempt | pass | pass | the judge passed it and a discriminating test passes |
| C-7b90839f | supply-chain › Exceptions are reviewed, pinned and justified › Malformed policy data fails | pass | pass | the judge passed it and a discriminating test passes |
| C-c18692e2 | supply-chain › Exceptions are reviewed, pinned and justified › The reviewed policy is well formed | pass | pass | the judge passed it and a discriminating test passes |
| C-8eaf01ec | supply-chain › Exception versions are judged per ecosystem › Pypi release segments are exact | pass | pass | the judge passed it and a discriminating test passes |
| C-6c266a75 | supply-chain › Exception versions are judged per ecosystem › Pypi versions that are not a release segment fail | pass | pass | the judge passed it and a discriminating test passes |
| C-991042c4 | supply-chain › Exception versions are judged per ecosystem › Npm versions use isExactVersion | pass | pass | the judge passed it and a discriminating test passes |
| C-ae2f6322 | supply-chain › Exception versions are judged per ecosystem › An unknown ecosystem is not judged on its version | pass | pass | the judge passed it and a discriminating test passes |
| C-65a32526 | supply-chain › Exception versions are judged per ecosystem › The reviewed exception version is exact | pass | pass | the judge passed it and a discriminating test passes |
| C-706e1113 | supply-chain › Installed Python distributions carry only allowlisted licences › An SPDX expression is read | pass | pass | the judge passed it and a discriminating test passes |
| C-0910d0a3 | supply-chain › Installed Python distributions carry only allowlisted licences › A free-text licence falls back to classifiers | pass | pass | the judge passed it and a discriminating test passes |
| C-dcc52cf2 | supply-chain › Installed Python distributions carry only allowlisted licences › A permissive classifier cannot hide a copyleft text | pass | pass | the judge passed it and a discriminating test passes |
| C-04784843 | supply-chain › Installed Python distributions carry only allowlisted licences › A one-word licence is judged as an identifier | pass | pass | the judge passed it and a discriminating test passes |
| C-0db64dfc | supply-chain › Installed Python distributions carry only allowlisted licences › Unmapped classifiers and missing licences fail | pass | pass | the judge passed it and a discriminating test passes |
| C-1fa7c3d4 | supply-chain › Installed Python distributions carry only allowlisted licences › The venv is scanned across Python minors | pass | pass | the judge passed it and a discriminating test passes |
| C-8be4d4fc | supply-chain › Installed Python distributions carry only allowlisted licences › The current venv passes | pass | pass | the judge passed it and a discriminating test passes |
| C-2241065a | supply-chain › A missing e2e venv skips unless it is required › Absent and not required | pass | pass | the judge passed it and a discriminating test passes |
| C-4ca6b05c | supply-chain › A missing e2e venv skips unless it is required › Absent and required | pass | pass | the judge passed it and a discriminating test passes |
| C-87f4def2 | supply-chain › A missing e2e venv skips unless it is required › Present | pass | pass | the judge passed it and a discriminating test passes |
| C-69c81a68 | supply-chain › A missing e2e venv skips unless it is required › A present venv with no distributions fails | pass | pass | the judge passed it and a discriminating test passes |
| C-f0b009a1 | supply-chain › Failures name the package, version, licence and rule › A licence violation message | pass | pass | the judge passed it and a discriminating test passes |
| C-db08d47c | supply-chain › Failures name the package, version, licence and rule › A long licence text is cut | pass | pass | the judge passed it and a discriminating test passes |
| C-1c977f83 | supply-chain › Failures name the package, version, licence and rule › All offenders in one run | pass | pass | the judge passed it and a discriminating test passes |
| C-73030b3f | supply-chain › The reviewed policy values are fixed › The values | pass | pass | the judge passed it and a discriminating test passes |
| C-ff913dc5 | supply-chain › Violations carry fixed subjects and details › Package violations | pass | pass | the judge passed it and a discriminating test passes |
| C-7fbf0b22 | supply-chain › Violations carry fixed subjects and details › Manifest violations | pass | pass | the judge passed it and a discriminating test passes |
| C-75476b3c | supply-chain › Violations carry fixed subjects and details › Built dependency details | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] Fallback package name for a scoped store directory without package.json is empty (spec gap) (criterion C-a74a1a7f): In scanNpmStore, when a package directory under node_modules/.pnpm/<dir>/node_modules/@scope/pkg has a missing or unreadable package.json, the fallback name is computed from child.name.split("@")[0].replace("+", "/"). Because a scoped store directory name starts with "@" (e.g. "@scope+pkg@1.0.0"), child.name.split("@")[0] is "" instead of "@scope/pkg" (whereas pkgName already holds "@scope/pkg"). No scenario in the specification pins down the fallback name when package.json is missing in scanNpmStore.

## New tests (red then green, `task.red_ok` in the ledger)

- `test.arch.licences.test.ts::C-04784843 a one-word License is judged as an identifier` (task 3.1): passed
- `test.arch.licences.test.ts::C-05d0c7f9 C-b51bd435 every dependency range in the root and web manifests is an exact version` (task 4.1): passed
- `test.arch.licences.test.ts::C-0797a2c3 topLevelKeys reads keys from column zero only` (task 4.3): passed
- `test.arch.licences.test.ts::C-0910d0a3 pythonLicenceOf falls back from free text to the classifiers` (task 3.1): passed
- `test.arch.licences.test.ts::C-0db64dfc unmapped classifiers and missing licences fail` (task 3.1): passed
- `test.arch.licences.test.ts::C-0f36e537 checkInstallFiles refuses forbidden npmrc keys` (task 4.3): passed
- `test.arch.licences.test.ts::C-115a4581 C-ce1eedc7 the licence gate reads files only` (task 5.1): passed
- `test.arch.licences.test.ts::C-1524fbc5 parseLicenceExpression gives null for malformed expressions only` (task 1.1): passed
- `test.arch.licences.test.ts::C-1c977f83 formatLicenceViolations joins the lines with a newline and gives an empty string for none` (task 1.1): passed
- `test.arch.licences.test.ts::C-1fa7c3d4 scanPythonVenv reads dist-info across Python minors` (task 3.1): passed
- `test.arch.licences.test.ts::C-2241065a decideVenvScan skips an absent venv that is not required` (task 3.2): passed
- `test.arch.licences.test.ts::C-2ae464e9 checkInstallFiles reports a root pnpmfile` (task 4.3): passed
- `test.arch.licences.test.ts::C-2fb3cbe9 checkLicences fails a copyleft term` (task 1.2): passed
- `test.arch.licences.test.ts::C-30f06cd4 checkLicences judges every term of a licence expression` (task 1.2): passed
- `test.arch.licences.test.ts::C-30fdcfea checkLicences passes permissive licences` (task 1.2): passed
- `test.arch.licences.test.ts::C-41ded6c9 checkBuiltDependencies fails an added package` (task 4.2): passed
- `test.arch.licences.test.ts::C-4557b8b9 checkBuiltDependencies fails a removed package or a duplicate` (task 4.2): passed
- `test.arch.licences.test.ts::C-4767d4f0 checkInstallFiles refuses forbidden workspace keys` (task 4.3): passed
- `test.arch.licences.test.ts::C-4ca6b05c decideVenvScan fails an absent venv that is required` (task 3.2): passed
- `test.arch.licences.test.ts::C-59b6d3e2 checkBuiltDependencies fails a missing workspace file` (task 4.2): passed
- `test.arch.licences.test.ts::C-606611bb C-41ded6c9 onlyBuiltDependencies equals the reviewed list` (task 4.2): passed
- `test.arch.licences.test.ts::C-65a32526 checkPolicy accepts the reviewed exception version` (task 1.3): passed
- `test.arch.licences.test.ts::C-67d87882 checkInstallHooks refuses every install-time lifecycle script` (task 4.3): passed
- `test.arch.licences.test.ts::C-6a008a66 npmLicenceOf treats a legacy or free-text licence as unknown` (task 2.1): passed
- `test.arch.licences.test.ts::C-6c266a75 checkPolicy refuses pypi versions that are not a release segment` (task 1.3): passed
- `test.arch.licences.test.ts::C-6faaac53 checkExactVersions refuses a range in pnpm overrides` (task 4.1): passed
- `test.arch.licences.test.ts::C-706e1113 pythonLicenceOf reads an SPDX License-Expression` (task 3.1): passed
- `test.arch.licences.test.ts::C-75476b3c checkBuiltDependencies gives the fixed drift details in order` (task 4.2): passed
- `test.arch.licences.test.ts::C-79c32cd5 C-2ae464e9 checkInstallFiles finds nothing in clean roots and a pnpmfile in a dirty one` (task 4.3): passed
- `test.arch.licences.test.ts::C-79c32cd5 C-67d87882 the repository runs no install hooks` (task 4.3): passed
- `test.arch.licences.test.ts::C-7b90839f checkPolicy rejects malformed policy data in order` (task 1.3): passed
- `test.arch.licences.test.ts::C-7dd0d742 checkInstallHooks refuses a pnpm setting other than overrides` (task 4.3): passed
- `test.arch.licences.test.ts::C-7f94877e checkLicences matches terms without regard to case` (task 1.2): passed
- `test.arch.licences.test.ts::C-7fbf0b22 checkExactVersions names manifest violations` (task 4.1): passed
- `test.arch.licences.test.ts::C-876fb064 an absent or empty store fails instead of passing` (task 2.1): passed
- `test.arch.licences.test.ts::C-87f4def2 C-69c81a68 decideVenvScan scans a present venv, and a present venv with no distributions fails` (task 3.2): passed
- `test.arch.licences.test.ts::C-8be4d4fc every Python distribution in the e2e venv has an allowlisted licence` (task 3.2): passed
- `test.arch.licences.test.ts::C-8eaf01ec checkPolicy admits pypi release segment versions` (task 1.3): passed
- `test.arch.licences.test.ts::C-92d19a9f C-6107b0c0 checkLicences exempts only the reviewed version and licence text` (task 1.3): passed
- `test.arch.licences.test.ts::C-991042c4 checkPolicy judges npm exception versions with isExactVersion` (task 1.3): passed
- `test.arch.licences.test.ts::C-9d08ccc3 every installed npm package has an allowlisted licence` (task 2.1): passed
- `test.arch.licences.test.ts::C-a223af90 checkInstallHooks allows ordinary scripts and overrides and refuses bad shapes` (task 4.3): passed
- `test.arch.licences.test.ts::C-a74a1a7f scanNpmStore walks the store without following symlinks` (task 2.1): passed
- `test.arch.licences.test.ts::C-ae2f6322 checkPolicy does not judge an unknown ecosystem on its version` (task 1.3): passed
- `test.arch.licences.test.ts::C-ae5033da checkLicences reports a package without a licence` (task 1.2): passed
- `test.arch.licences.test.ts::C-b51bd435 checkExactVersions refuses ranges, tags and other specs` (task 4.1): passed
- `test.arch.licences.test.ts::C-b7a7ed55 parseLicenceExpression reads the distinct terms of an expression` (task 1.1): passed
- `test.arch.licences.test.ts::C-c18692e2 C-73030b3f the licence policy data is well formed` (task 1.3): passed
- `test.arch.licences.test.ts::C-c39c579d checkExactVersions ignores other fields and refuses bad manifests` (task 4.1): passed
- `test.arch.licences.test.ts::C-ca426357 checkLicences refuses a near-miss identifier` (task 1.2): passed
