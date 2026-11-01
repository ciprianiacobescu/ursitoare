# Verification: openspec:add-taint-static: PASS (round 1)

traceability: 16/16 criteria covered by a discriminating test

- Base: `eec9a3b95ec91d8acef4fb84569020e319388a61`
- Head: `9e8565df8b18fa27ea960de16d07c3c611761bae`
- Implementer profiles: deepseek-free
- Judge: claude-judge (claude-opus-5-5), 1 call(s), prompt sha256 `ecaf4cee31fb996a237f21c76bdc89e7f4b43f15d84640df2bf93fb8e72f831e`
- Judge replies of claude-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek-free deepseek (declared)
- Cost: $1.2687

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.4 | base main@eec9a3b95e contained |
| 1 | integrity | ok | 99.8 | 11 sub-checks (+1 unfrozen by human answers); scope: 18 changed file(s) |
| 2 | build | ok | 27.5 |  |
| 3 | tests | ok | 131.6 |  |
| 4 | traceability | ok | 0.1 | 16/16 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/authoring/index.ts, src/authoring/taint/analyze.ts, src/authoring/taint/capabilities.ts, src/authoring/taint/errors.ts, src/authoring/taint/hooks.ts and 2 more |
| 8 | s1 judge | ok | 1.0 | 15/16 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 79.7 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261101T0652Z-fcf6/050-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261101T0652Z-fcf6/051-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261101T0652Z-fcf6/052-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261101T0652Z-fcf6/053-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261101T0652Z-fcf6/054-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261101T0652Z-fcf6/055-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261101T0652Z-fcf6/056-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 6 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/authoring/index.ts, src/authoring/taint/analyze.test.ts, src/authoring/taint/analyze.ts, src/authoring/taint/capabilities.test.ts, src/authoring/taint/capabilities.ts (+9 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1173 of 1173 base tests pass on the unit's code with its 6 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/authoring/taint/hooks.test.ts kept at head for the run (task 2.3: unfrozen by Q-001)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/authoring/taint/hooks.test.ts (task 2.3, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-375163e0 | taint › Taint labels form a union algebra › Join is a union in canonical order | covered | src.authoring.taint.labels.test.ts::C-375163e0 join is a union in canonical order (passed, red_assertion) | - | 0.77 |
| C-9dbb1d4e | taint › Taint labels form a union algebra › Normalize, relabel and include | covered | src.authoring.taint.labels.test.ts::C-9dbb1d4e normalize relabel and include (passed, red_assertion) | - | 0.95 |
| C-feb77bd3 | taint › Taint propagates over references by node-kind rules › RF-1 labels and edges | covered | src.authoring.taint.analyze.test.ts::C-feb77bd3 RF-1 labels and edges (passed, red_assertion) | - | 0.94 |
| C-7e5f540a | taint › Taint propagates over references by node-kind rules › Code does not launder and fields are precise | covered | src.authoring.taint.analyze.test.ts::C-7e5f540a Code does not launder and fields are precise (passed, red_assertion) | - | 0.94 |
| C-9543ab61 | taint › Taint propagates over references by node-kind rules › Sources of untrusted data and the closed outcome | covered | src.authoring.taint.sources.test.ts::C-9543ab61 sources of untrusted data and the closed outcome (passed, red_assertion) | - | 0.92 |
| C-6b3829ee | taint › Taint propagates over references by node-kind rules › Context sources are untrusted unless approved | covered | src.authoring.taint.sources.test.ts::C-6b3829ee context sources are untrusted unless approved (passed, red_assertion) | - | 0.93 |
| C-be8bdbfa | taint › Hooks add taint and never remove it › Hook references, widening and flow rules | covered | src.authoring.taint.hooks.test.ts::C-be8bdbfa Hook references widening and flow rules (passed, red_assertion) | - | 0.93 |
| C-96450187 | taint › Anything unresolved is untrusted and the analysis is total › Unknown and malformed input fails closed | covered | src.authoring.taint.closed.test.ts::C-96450187 unknown and malformed input fails closed (passed, red_assertion) | - | - |
| C-218f2fa6 | taint › Anything unresolved is untrusted and the analysis is total › Malformed hook structures fail closed | covered | src.authoring.taint.hooks.test.ts::C-218f2fa6 Malformed hook structures fail closed (passed, red_assertion) | - | 0.92 |
| C-382d778d | taint › Propagation reaches one deterministic fixpoint within bounded size › Cycles, self-references and order | covered | src.authoring.taint.analyze.test.ts::C-382d778d Cycles self-references and order (passed, red_assertion) | - | 0.92 |
| C-0309b412 | taint › Propagation reaches one deterministic fixpoint within bounded size › Size limits | covered | src.authoring.taint.closed.test.ts::C-0309b412 size limits (passed, red_assertion) | - | 0.94 |
| C-6792eb26 | taint › Flow capabilities are derived from the catalogue and fail closed › RF-1 and one-block flags | covered | src.authoring.taint.capabilities.test.ts::C-6792eb26 RF-1 and one-block flags (passed, red_assertion) | - | 0.95 |
| C-5e5ffb19 | taint › Flow capabilities are derived from the catalogue and fail closed › Agents, hooks, subflows, context and order | covered | src.authoring.taint.capabilities.test.ts::C-5e5ffb19 agents hooks subflows context and order (passed, red_assertion) | - | 0.94 |
| C-238ff645 | taint › Flow capabilities are derived from the catalogue and fail closed › Unknown sites fail closed and catalogue errors propagate | covered | src.authoring.taint.capabilities.test.ts::C-238ff645 unknown sites fail closed and catalogue errors propagate (passed, red_assertion) | - | 0.94 |
| C-9c5fbf5b | taint › Flow capabilities are derived from the catalogue and fail closed › Malformed hook structures are unknown sites | covered | src.authoring.taint.capabilities.test.ts::C-9c5fbf5b malformed hook structures are unknown sites (passed, red_assertion) | - | 0.94 |
| C-a609be4d | taint › The authoring surface exports the taint module › Names are exported by the authoring surface | covered | src.authoring.taint.surface.test.ts::C-a609be4d names are exported by the authoring surface (passed, red_assertion) | - | 0.89 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-taint-static/.l4/ledger/r-20261101T0551Z-0bc2.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-static/.l4/ledger/r-20261101T0652Z-fcf6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-static/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-taint-static/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/authoring/index.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/analyze.test.ts` |  | relevant | new test file |
| `src/authoring/taint/analyze.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/capabilities.test.ts` |  | relevant | new test file |
| `src/authoring/taint/capabilities.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/closed.test.ts` |  | relevant | new test file |
| `src/authoring/taint/errors.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/hooks.test.ts` |  | relevant | new test file |
| `src/authoring/taint/hooks.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/labels.test.ts` |  | relevant | new test file |
| `src/authoring/taint/labels.ts` | authoring | relevant | named in the spec |
| `src/authoring/taint/sources.test.ts` |  | relevant | new test file |
| `src/authoring/taint/surface.test.ts` |  | relevant | new test file |
| `src/authoring/taint/tools.ts` | authoring | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/authoring/index.ts, src/authoring/taint/analyze.ts, src/authoring/taint/capabilities.ts, src/authoring/taint/errors.ts, src/authoring/taint/hooks.ts and 2 more

### Tests

1240 of 1240 passed, 0 failed, 0 errored, 0 skipped.
16 of 16 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-375163e0 | ok | 0.770 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9dbb1d4e | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-feb77bd3 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7e5f540a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9543ab61 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6b3829ee | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-be8bdbfa | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-96450187 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-218f2fa6 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-382d778d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0309b412 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6792eb26 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5e5ffb19 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-238ff645 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c5fbf5b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a609be4d | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-375163e0 | taint › Taint labels form a union algebra › Join is a union in canonical order | pass | pass | the judge passed it and a discriminating test passes |
| C-9dbb1d4e | taint › Taint labels form a union algebra › Normalize, relabel and include | pass | pass | the judge passed it and a discriminating test passes |
| C-feb77bd3 | taint › Taint propagates over references by node-kind rules › RF-1 labels and edges | pass | pass | the judge passed it and a discriminating test passes |
| C-7e5f540a | taint › Taint propagates over references by node-kind rules › Code does not launder and fields are precise | pass | pass | the judge passed it and a discriminating test passes |
| C-9543ab61 | taint › Taint propagates over references by node-kind rules › Sources of untrusted data and the closed outcome | pass | pass | the judge passed it and a discriminating test passes |
| C-6b3829ee | taint › Taint propagates over references by node-kind rules › Context sources are untrusted unless approved | pass | pass | the judge passed it and a discriminating test passes |
| C-be8bdbfa | taint › Hooks add taint and never remove it › Hook references, widening and flow rules | pass | pass | the judge passed it and a discriminating test passes |
| C-96450187 | taint › Anything unresolved is untrusted and the analysis is total › Unknown and malformed input fails closed | pass | pass | the judge passed it and a discriminating test passes |
| C-218f2fa6 | taint › Anything unresolved is untrusted and the analysis is total › Malformed hook structures fail closed | pass | pass | the judge passed it and a discriminating test passes |
| C-382d778d | taint › Propagation reaches one deterministic fixpoint within bounded size › Cycles, self-references and order | pass | pass | the judge passed it and a discriminating test passes |
| C-0309b412 | taint › Propagation reaches one deterministic fixpoint within bounded size › Size limits | pass | pass | the judge passed it and a discriminating test passes |
| C-6792eb26 | taint › Flow capabilities are derived from the catalogue and fail closed › RF-1 and one-block flags | pass | pass | the judge passed it and a discriminating test passes |
| C-5e5ffb19 | taint › Flow capabilities are derived from the catalogue and fail closed › Agents, hooks, subflows, context and order | pass | pass | the judge passed it and a discriminating test passes |
| C-238ff645 | taint › Flow capabilities are derived from the catalogue and fail closed › Unknown sites fail closed and catalogue errors propagate | pass | pass | the judge passed it and a discriminating test passes |
| C-9c5fbf5b | taint › Flow capabilities are derived from the catalogue and fail closed › Malformed hook structures are unknown sites | pass | pass | the judge passed it and a discriminating test passes |
| C-a609be4d | taint › The authoring surface exports the taint module › Names are exported by the authoring surface | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] A non-array `context` neither taints the input nor adds a capability site (spec gap) (criterion C-6b3829ee): When `context` is present but is not an array, contextTainted returns false and addContext returns early, so a malformed context is treated as trusted rather than failing closed. No scenario covers this input.
- [minor, judge] An `effect` selector matches a node of unknown kind (spec gap) (criterion C-be8bdbfa): effectClass returns undefined for unknown kinds and non-object nodes, and an undefined class matches every `effect` selector. This is consistent with fail-closed, but no scenario states it.
- [minor, judge] An empty-path output reference carries only `output`, not the join with `fields` (criterion C-96450187): Decision 4 says a Ref with an empty path that still reaches this module carries the join of `output` and every `fields` entry. resolveReference returns state.output alone. U22's grammar refuses such references, so the case may be unreachable.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.authoring.taint.analyze.test.ts::C-382d778d Cycles self-references and order` (task 2.1): passed
- `src.authoring.taint.analyze.test.ts::C-7e5f540a Code does not launder and fields are precise` (task 2.1): passed
- `src.authoring.taint.analyze.test.ts::C-feb77bd3 RF-1 labels and edges` (task 2.1): passed
- `src.authoring.taint.capabilities.test.ts::C-238ff645 unknown sites fail closed and catalogue errors propagate` (task 3.1): passed
- `src.authoring.taint.capabilities.test.ts::C-5e5ffb19 agents hooks subflows context and order` (task 3.1): passed
- `src.authoring.taint.capabilities.test.ts::C-6792eb26 RF-1 and one-block flags` (task 3.1): passed
- `src.authoring.taint.capabilities.test.ts::C-9c5fbf5b malformed hook structures are unknown sites` (task 3.1): passed
- `src.authoring.taint.closed.test.ts::C-0309b412 size limits` (task 2.4): passed
- `src.authoring.taint.closed.test.ts::C-96450187 unknown and malformed input fails closed` (task 2.4): passed
- `src.authoring.taint.hooks.test.ts::C-218f2fa6 Malformed hook structures fail closed` (task 2.3): passed
- `src.authoring.taint.hooks.test.ts::C-be8bdbfa Hook references widening and flow rules` (task 2.3): passed
- `src.authoring.taint.labels.test.ts::C-375163e0 join is a union in canonical order` (task 1.1): passed
- `src.authoring.taint.labels.test.ts::C-9dbb1d4e normalize relabel and include` (task 1.1): passed
- `src.authoring.taint.sources.test.ts::C-6b3829ee context sources are untrusted unless approved` (task 2.2): passed
- `src.authoring.taint.sources.test.ts::C-9543ab61 sources of untrusted data and the closed outcome` (task 2.2): passed
- `src.authoring.taint.surface.test.ts::C-a609be4d names are exported by the authoring surface` (task 1.1): passed

## Guard events

- guard.violation: src/authoring/index.ts
