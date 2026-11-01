# Verification: openspec:add-flow-format-model: PASS (round 1)

traceability: 15/15 criteria covered by a discriminating test

- Base: `1f7c1966655023b20c8f3b14a8b5a86d79fbe282`
- Head: `10aa64980d3cfe2cddc513799e6cdeaec59a674b`
- Implementer profiles: deepseek-free
- Judge: claude-judge (claude-opus-5-5), 1 call(s), prompt sha256 `b58500b7fd87b5721e90654b86aead99673285911714625bc988877230884e58`
- Judge replies of claude-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared)
- Cost: $1.2074

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@1f7c196665 contained |
| 1 | integrity | ok | 101.0 | 11 sub-checks; scope: 20 changed file(s) |
| 2 | build | ok | 28.0 |  |
| 3 | tests | ok | 134.4 |  |
| 4 | traceability | ok | 0.1 | 15/15 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/authoring/format/canonical.ts, src/authoring/format/catalogue.ts, src/authoring/format/doc-terms.ts, src/authoring/format/errors.ts, src/authoring/format/hash.ts and 5 more |
| 8 | s1 judge | ok | 1.0 | 11/15 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 79.2 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261101T0413Z-757a/131-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261101T0413Z-757a/132-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261101T0413Z-757a/133-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261101T0413Z-757a/134-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261101T0413Z-757a/135-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261101T0413Z-757a/136-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261101T0413Z-757a/137-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/authoring/format/canonical.test.ts, src/authoring/format/canonical.ts, src/authoring/format/catalogue.test.ts, src/authoring/format/catalogue.ts, src/authoring/format/doc-terms.test.ts (+12 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1147 of 1147 base tests pass on the unit's code with its 7 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-5a870b6a | flow-format › Flow text is parsed into a plain document or refused with a code › YAML and JSON parse to the same document | covered | src.authoring.format.parse.test.ts::C-5a870b6a YAML and JSON parse to the same document (passed, red_assertion) | - | 0.94 |
| C-b34a6605 | flow-format › Flow text is parsed into a plain document or refused with a code › Malformed text is refused with a code and a position | covered | src.authoring.format.parse.test.ts::C-b34a6605 Malformed text is refused with a code and a position (passed, red_assertion) | - | 0.91 |
| C-9b479b34 | flow-format › Flow text is parsed into a plain document or refused with a code › Values that are not JSON are refused | covered | src.authoring.format.parse.test.ts::C-9b479b34 Values that are not JSON are refused (passed, red_assertion) | - | 0.94 |
| C-f9d80fce | flow-format › Parsing is bounded in size, depth and aliases › Size is measured in bytes before parsing | covered | src.authoring.format.parse.test.ts::C-f9d80fce Size is measured in bytes before parsing (passed, red_assertion) | - | 0.91 |
| C-9f520db7 | flow-format › Parsing is bounded in size, depth and aliases › Deep and self-referencing documents are refused | covered | src.authoring.format.parse.test.ts::C-9f520db7 Deep and self-referencing documents are refused (passed, red_assertion) | - | 0.95 |
| C-e189e07d | flow-format › Parsing is bounded in size, depth and aliases › Alias expansion is bounded | covered | src.authoring.format.parse.test.ts::C-e189e07d Alias expansion is bounded (passed, red_assertion) | - | 0.90 |
| C-dd8c9820 | flow-format › Canonical JSON is one string per meaning › Canonical JSON ignores order, surface and reference spacing | covered | src.authoring.format.canonical.test.ts::C-dd8c9820 Canonical JSON ignores order surface and reference spacing (passed, red_assertion) | - | 0.94 |
| C-c52ba109 | flow-format › Canonical JSON is one string per meaning › Canonical JSON keeps real differences and unusual keys | covered | src.authoring.format.canonical.test.ts::C-c52ba109 Canonical JSON keeps real differences and unusual keys (passed, red_assertion) | - | 0.94 |
| C-c757def3 | flow-format › Canonical JSON is one string per meaning › Canonical form refuses what is not JSON | covered | src.authoring.format.canonical.test.ts::C-c757def3 Canonical form refuses what is not JSON (passed, red_assertion) | - | 0.95 |
| C-eaddbece | flow-format › The content hash identifies a canonical flow › The hash is sha256 of the canonical JSON | covered | src.authoring.format.hash.test.ts::C-eaddbece contentHash differs for a real change (passed, red_assertion); src.authoring.format.hash.test.ts::C-eaddbece contentHash ignores surface key order and reference spacing (passed, red_assertion); src.authoring.format.hash.test.ts::C-eaddbece contentHash of... | - | - |
| C-ef57ecc3 | flow-format › References are parsed by one grammar › A reference is parsed or explained | covered | src.authoring.format.refs.test.ts::C-ef57ecc3 A reference is parsed or explained (passed, red_assertion) | - | - |
| C-8c080699 | flow-format › References are parsed by one grammar › Templates are scanned into segments | covered | src.authoring.format.refs.test.ts::C-8c080699 Templates are scanned into segments (passed, red_assertion) | - | - |
| C-b2c430f1 | flow-format › Node structure is read through shared helpers › Value fields and successors per node kind | covered | src.authoring.format.nodes.test.ts::C-b2c430f1 Required successor fields per node kind (passed, red_assertion); src.authoring.format.nodes.test.ts::C-b2c430f1 Successor fields per node kind (passed, red_assertion); src.authoring.format.nodes.test.ts::C-b2c430f1 Value fields per hook kind (passed, re... | - | - |
| C-118137a2 | flow-format › The catalogue is an interface with a versioned-reference helper › Empty catalogue and versioned references | covered | src.authoring.format.catalogue.test.ts::C-118137a2 Empty catalogue and versioned references (passed, red_assertion) | - | 0.95 |
| C-0ec8f597 | flow-format › The format is documented and the documentation is checked › The documentation names every term | covered | src.authoring.format.doc-terms.test.ts::C-0ec8f597 a document without the hooks term misses only hooks (passed, red_assertion); src.authoring.format.doc-terms.test.ts::C-0ec8f597 an empty document is missing every term (passed, red_assertion); src.authoring.format.doc-terms.test.ts::C-0ec8f597 docum... | - | 0.95 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/authoring/format.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-format-model/.l4/ledger/r-20261101T0413Z-757a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-format-model/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/authoring/format/canonical.test.ts` |  | relevant | new test file |
| `src/authoring/format/canonical.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/catalogue.test.ts` |  | relevant | new test file |
| `src/authoring/format/catalogue.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/doc-terms.test.ts` |  | relevant | new test file |
| `src/authoring/format/doc-terms.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/errors.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/hash.test.ts` |  | relevant | new test file |
| `src/authoring/format/hash.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/json-value.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/nodes.test.ts` |  | relevant | new test file |
| `src/authoring/format/nodes.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/parse.test.ts` |  | relevant | new test file |
| `src/authoring/format/parse.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/refs.test.ts` |  | relevant | new test file |
| `src/authoring/format/refs.ts` | authoring | relevant | named in the spec |
| `src/authoring/format/types.ts` | authoring | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/authoring/format/canonical.ts, src/authoring/format/catalogue.ts, src/authoring/format/doc-terms.ts, src/authoring/format/errors.ts, src/authoring/format/hash.ts and 5 more

### Tests

1224 of 1224 passed, 0 failed, 0 errored, 0 skipped.
24 of 24 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-5a870b6a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b34a6605 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9b479b34 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f9d80fce | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9f520db7 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e189e07d | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-dd8c9820 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c52ba109 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c757def3 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-eaddbece | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-ef57ecc3 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-8c080699 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-b2c430f1 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-118137a2 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0ec8f597 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-5a870b6a | flow-format › Flow text is parsed into a plain document or refused with a code › YAML and JSON parse to the same document | pass | pass | the judge passed it and a discriminating test passes |
| C-b34a6605 | flow-format › Flow text is parsed into a plain document or refused with a code › Malformed text is refused with a code and a position | pass | pass | the judge passed it and a discriminating test passes |
| C-9b479b34 | flow-format › Flow text is parsed into a plain document or refused with a code › Values that are not JSON are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-f9d80fce | flow-format › Parsing is bounded in size, depth and aliases › Size is measured in bytes before parsing | pass | pass | the judge passed it and a discriminating test passes |
| C-9f520db7 | flow-format › Parsing is bounded in size, depth and aliases › Deep and self-referencing documents are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-e189e07d | flow-format › Parsing is bounded in size, depth and aliases › Alias expansion is bounded | pass | pass | the judge passed it and a discriminating test passes |
| C-dd8c9820 | flow-format › Canonical JSON is one string per meaning › Canonical JSON ignores order, surface and reference spacing | pass | pass | the judge passed it and a discriminating test passes |
| C-c52ba109 | flow-format › Canonical JSON is one string per meaning › Canonical JSON keeps real differences and unusual keys | pass | pass | the judge passed it and a discriminating test passes |
| C-c757def3 | flow-format › Canonical JSON is one string per meaning › Canonical form refuses what is not JSON | pass | pass | the judge passed it and a discriminating test passes |
| C-eaddbece | flow-format › The content hash identifies a canonical flow › The hash is sha256 of the canonical JSON | pass | pass | the judge passed it and a discriminating test passes |
| C-ef57ecc3 | flow-format › References are parsed by one grammar › A reference is parsed or explained | pass | pass | the judge passed it and a discriminating test passes |
| C-8c080699 | flow-format › References are parsed by one grammar › Templates are scanned into segments | pass | pass | the judge passed it and a discriminating test passes |
| C-b2c430f1 | flow-format › Node structure is read through shared helpers › Value fields and successors per node kind | pass | pass | the judge passed it and a discriminating test passes |
| C-118137a2 | flow-format › The catalogue is an interface with a versioned-reference helper › Empty catalogue and versioned references | pass | pass | the judge passed it and a discriminating test passes |
| C-0ec8f597 | flow-format › The format is documented and the documentation is checked › The documentation names every term | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] suspiciousInterpolation flags a correctly written reference (spec gap) (criterion C-8c080699): The pattern /\{\{[^{}]*\}\}/ also matches inside "${{ inputs.x }}", so a correct reference returns the "{{ ... }}" warning. Any caller that passes a whole value string instead of only its text segments gets a false warning. No scenario pins this down.
- [minor, judge] Node-level pre/post hooks given as a single object are not normalised (spec gap) (criterion C-dd8c9820): normalizeNode re-prints references only when a node's pre/post is an array. A single hook object, which U25 would refuse but which can reach canonicalJson, keeps its reference spacing. Two such documents that differ only in reference spacing therefore hash differently.
- [minor, judge] maxDepth 0 refuses every container (spec gap) (criterion C-9f520db7): resolveLimits accepts 0 as a non-negative integer. With maxDepth 0, any object or array root fails with FORMAT_TOO_DEEP, while a scalar root still passes. No scenario pins this down.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.authoring.format.canonical.test.ts::C-c52ba109 Canonical JSON keeps real differences and unusual keys` (task 5.1): passed
- `src.authoring.format.canonical.test.ts::C-c757def3 Canonical form refuses what is not JSON` (task 5.1): passed
- `src.authoring.format.canonical.test.ts::C-dd8c9820 Canonical JSON ignores order surface and reference spacing` (task 5.1): passed
- `src.authoring.format.catalogue.test.ts::C-118137a2 Empty catalogue and versioned references` (task 1.1): passed
- `src.authoring.format.doc-terms.test.ts::C-0ec8f597 a document without the hooks term misses only hooks` (task 7.1): passed
- `src.authoring.format.doc-terms.test.ts::C-0ec8f597 an empty document is missing every term` (task 7.1): passed
- `src.authoring.format.doc-terms.test.ts::C-0ec8f597 documentedTerms lists every term without duplicates` (task 7.1): passed
- `src.authoring.format.doc-terms.test.ts::C-0ec8f597 the documentation is missing no term` (task 7.1): passed
- `src.authoring.format.hash.test.ts::C-eaddbece contentHash differs for a real change` (task 6.1): passed
- `src.authoring.format.hash.test.ts::C-eaddbece contentHash ignores surface key order and reference spacing` (task 6.1): passed
- `src.authoring.format.hash.test.ts::C-eaddbece contentHash of the golden documents` (task 6.1): passed
- `src.authoring.format.hash.test.ts::C-eaddbece isContentHash accepts only the sha256 content hash form` (task 6.1): passed
- `src.authoring.format.nodes.test.ts::C-b2c430f1 Required successor fields per node kind` (task 3.1): passed
- `src.authoring.format.nodes.test.ts::C-b2c430f1 Successor fields per node kind` (task 3.1): passed
- `src.authoring.format.nodes.test.ts::C-b2c430f1 Value fields per hook kind` (task 3.1): passed
- `src.authoring.format.nodes.test.ts::C-b2c430f1 Value fields per node kind` (task 3.1): passed
- `src.authoring.format.parse.test.ts::C-5a870b6a YAML and JSON parse to the same document` (task 4.1): passed
- `src.authoring.format.parse.test.ts::C-9b479b34 Values that are not JSON are refused` (task 4.1): passed
- `src.authoring.format.parse.test.ts::C-9f520db7 Deep and self-referencing documents are refused` (task 4.1): passed
- `src.authoring.format.parse.test.ts::C-b34a6605 Malformed text is refused with a code and a position` (task 4.1): passed
- `src.authoring.format.parse.test.ts::C-e189e07d Alias expansion is bounded` (task 4.1): passed
- `src.authoring.format.parse.test.ts::C-f9d80fce Size is measured in bytes before parsing` (task 4.1): passed
- `src.authoring.format.refs.test.ts::C-8c080699 Templates are scanned into segments` (task 2.1): passed
- `src.authoring.format.refs.test.ts::C-ef57ecc3 A reference is parsed or explained` (task 2.1): passed
