# Verification: openspec:add-web-flow-graph: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `17e35b4be73d6976553dec336d7b23911811f77b`
- Head: `5bb3142eb419fb4380990860ee22d34caecc0039`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: beam-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.2 | base main@17e35b4be7 contained |
| 1 | integrity | ok | 84.9 | 11 sub-checks; scope: 22 changed file(s) |
| 2 | build | ok | 19.1 |  |
| 3 | tests | failed | 126.2 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph[chromium], test_m3_authoring::test_c_68b2dc11_bob_reads_t... |
| 4 | traceability | not_run | 0.0 | an earlier step failed |
| 4a | audit sampling | not_run | 0.0 | an earlier step failed |
| 5 | ui test generation | not_run | 0.0 | an earlier step failed |
| 6 | quality | not_run | 0.0 | an earlier step failed |
| 8 | s1 judge | not_run | 0.0 | an earlier step failed |
| 9 | judge | not_run | 0.0 | an earlier step failed |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261102T1017Z-2f08/126-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261102T1017Z-2f08/127-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261102T1017Z-2f08/128-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261102T1017Z-2f08/129-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261102T1017Z-2f08/130-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261102T1017Z-2f08/131-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261102T1017Z-2f08/132-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 6 task(s): red and green compared |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/journeys/m3-authoring.test.ts, test/web-flow-graph/layout-rf1.test.ts, test/web-flow-graph/successor-parity.test.ts, web/src/features/75-flow-graph.tsx, web/src/flow-graph/FlowGraphPage.tsx (+13 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 1374 of 1374 base tests pass on the unit's code with its 10 test and support files at the base (base: not needed) |

## Evidence

### Needs attention

- blocker: new tests failed: test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph[chromium], test_m3_authoring::test_c_68b2dc11_bob_reads_the_graph_but_cannot_save[chromium]

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m3_authoring.py` |  | relevant | new test file |
| `openspec/changes/add-web-flow-graph/.l4/ledger/r-20261102T1017Z-2f08.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `test/journeys/m3-authoring.test.ts` |  | relevant | new test file |
| `test/web-flow-graph/layout-rf1.test.ts` |  | relevant | new test file |
| `test/web-flow-graph/successor-parity.test.ts` |  | relevant | new test file |
| `web/src/features/75-flow-graph.tsx` | web | relevant | named in the spec |
| `web/src/flow-graph/FlowGraphPage.tsx` | web | relevant | named in the spec |
| `web/src/flow-graph/FlowGraphView.tsx` | web | relevant | named in the spec |
| `web/src/flow-graph/GraphPanel.tsx` | web | relevant | named in the spec |
| `web/src/flow-graph/drawing.test.ts` |  | relevant | new test file |
| `web/src/flow-graph/drawing.ts` | web | relevant | named in the spec |
| `web/src/flow-graph/flow-graph.css` | web | relevant | named in the spec |
| `web/src/flow-graph/graph-model.test.ts` |  | relevant | new test file |
| `web/src/flow-graph/graph-model.ts` | web | relevant | named in the spec |
| `web/src/flow-graph/graph-source.test.ts` |  | relevant | new test file |
| `web/src/flow-graph/graph-source.ts` | web | relevant | named in the spec |
| `web/src/flow-graph/layout.test.ts` |  | relevant | new test file |
| `web/src/flow-graph/layout.ts` | web | relevant | named in the spec |
| `web/src/flow-graph/pages.test.ts` |  | relevant | new test file |
| `web/src/flow-graph/pages.ts` | web | relevant | named in the spec |
| `web/src/flow-graph/view-sources.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/features/75-flow-graph.tsx, web/src/flow-graph/FlowGraphPage.tsx, web/src/flow-graph/FlowGraphView.tsx, web/src/flow-graph/GraphPanel.tsx, web/src/flow-graph/drawing.ts and 4 more

### Tests

1453 of 1455 passed, 2 failed, 0 errored, 0 skipped.
25 of 27 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph[chromium], test_m3_authoring::test_c_68b2dc11_bob_reads_the_graph_but_cannot_save[chromium] Log: `.l4-out/gates/r-20261102T1017Z-2f08/132-e2e.log`.
- [blocker, deterministic] new tests failed: test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph[chromium], test_m3_authoring::test_c_68b2dc11_bob_reads_the_graph_but_cannot_save[chromium]

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae, F-7e9a81fb e2e gate failed (+1 more)

## New tests (red then green, `task.red_ok` in the ledger)

- `test.journeys.m3-authoring.test.ts::C-830797f7 alice, bob and mallory read graphs from the engine` (task 6.1): passed
- `test.web-flow-graph.layout-rf1.test.ts::C-1129d3e7 RF-1 and the journey flow have fixed coordinates` (task 1.1): passed
- `test.web-flow-graph.successor-parity.test.ts::C-1616f6aa the successor table agrees with the format model` (task 1.1): passed
- `web.src.flow-graph.drawing.test.ts::C-5070339e drawEdges of S CYCLE and a long case label` (task 3.1): passed
- `web.src.flow-graph.drawing.test.ts::C-5070339e drawNodes of ODD with an added long id` (task 3.1): passed
- `web.src.flow-graph.drawing.test.ts::C-5070339e drawNodes of S and its classes` (task 3.1): passed
- `web.src.flow-graph.drawing.test.ts::C-5070339e viewBox of the S layout` (task 3.1): passed
- `web.src.flow-graph.graph-model.test.ts::C-54028b08 selecting a node` (task 2.1): passed
- `web.src.flow-graph.graph-model.test.ts::C-793687fa node details are read only text` (task 2.1): passed
- `web.src.flow-graph.graph-model.test.ts::C-cf729adf states messages and the node list` (task 2.1): passed
- `web.src.flow-graph.graph-source.test.ts::C-4ca8acf8 loadGraphDocument reads the document of one version` (task 6.1): passed
- `web.src.flow-graph.graph-source.test.ts::C-4ca8acf8 settleGraphLoad maps a RangeError to a 404 and keeps other errors` (task 6.1): passed
- `web.src.flow-graph.graph-source.test.ts::C-4ca8acf8 settleGraphLoad settles a document and a null document` (task 6.1): passed
- `web.src.flow-graph.graph-source.test.ts::C-4ca8acf8 settleGraphLoad turns a 403 into an error with its decision id` (task 6.1): passed
- `web.src.flow-graph.graph-source.test.ts::C-99ed5dc0 loadLatestGraph passes a rejection on and refuses a bad id` (task 6.1): passed
- `web.src.flow-graph.graph-source.test.ts::C-99ed5dc0 loadLatestGraph reads the flow then the latest version` (task 6.1): passed
- `web.src.flow-graph.graph-source.test.ts::C-99ed5dc0 loadLatestGraph without a saved version makes one call` (task 6.1): passed
- `web.src.flow-graph.layout.test.ts::C-024a069e invalid documents the empty flow and the size bound` (task 1.1): passed
- `web.src.flow-graph.layout.test.ts::C-7a375c7a cycles unreachable nodes unknown kinds and missing targets` (task 1.1): passed
- `web.src.flow-graph.layout.test.ts::C-c1de3761 layers order coordinates and labels of a small flow` (task 1.1): passed
- `web.src.flow-graph.pages.test.ts::C-5be45b98: graphPath validates the id and versionNote names the version` (task 5.1): passed
- `web.src.flow-graph.pages.test.ts::C-5be45b98: the feature file declares the page and registers the panel` (task 5.1): passed
- `web.src.flow-graph.pages.test.ts::C-5be45b98: the graph page and panel are registered with the flow pages` (task 5.1): passed
- `web.src.flow-graph.view-sources.test.ts::C-ada22065: the flow graph stylesheet defines the drawn classes from kit tokens` (task 4.1): passed
- `web.src.flow-graph.view-sources.test.ts::C-ada22065: the flow graph view is decorative and free of inline styles` (task 4.1): passed
