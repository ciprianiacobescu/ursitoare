# Verification: openspec:add-web-flow-graph: NEEDS_HUMAN (round 2)

traceability: 14/16 criteria covered by a discriminating test

- Base: `f2167b6abe4a9ead347c378ac3d2d20d4d5a2071`
- Head: `d42ab184d3c40d60f69d44803c027662d1fedda9`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 1 call(s), prompt sha256 `0c6785e9c87a71cd25d680a799eb5c02164daa14ed6b1e6b6a3fdaac3b64c01a`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.8 | base merged: main@f2167b6abe as d42ab184d3 (1 commit) |
| 1 | integrity | ok | 126.0 | 11 sub-checks; scope: 32 changed file(s) |
| 2 | build | ok | 31.8 |  |
| 3 | tests | ok | 173.1 |  |
| 4 | traceability | ok | 0.2 | 14/16 criteria covered |
| 4a | audit sampling | ok | 330.9 | 2 rejected, 3 skipped; support files at the base: 10 |
| 5 | ui test generation | ok | 1307.6 | 2 fails_at_head, 12 not_testable, 1 uncollectable, 1 writer_failed |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/features/75-flow-graph.tsx, web/src/flow-graph/FlowGraphPage.tsx, web/src/flow-graph/FlowGraphView.tsx, web/src/flow-graph/GraphPanel.tsx, web/src/flow-graph/drawing.ts and 4 more |
| 8 | s1 judge | ok | 1.3 | 12/16 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 125.5 | 1 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261102T1500Z-d5d5/021-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261102T1500Z-d5d5/022-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261102T1500Z-d5d5/023-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261102T1500Z-d5d5/024-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261102T1500Z-d5d5/025-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261102T1500Z-d5d5/026-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261102T1500Z-d5d5/027-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 6 task(s): red and green compared |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: test/journeys/m3-authoring.test.ts, test/web-flow-graph/layout-rf1.test.ts, test/web-flow-graph/successor-parity.test.ts, web/src/features/75-flow-graph.tsx, web/src/flow-graph/FlowGraphPage.tsx (+13 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 1374 of 1374 base tests pass on the unit's code with its 9 test and support files at the base (base: not needed) |

## Test changes made by humans (allowed, L4-SEC-004)

- e2e/test_m3_authoring.py kept at head for the run (people changed it last (3c57183737, 8b608044ed))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-c1de3761 | web-flow-graph › The layout places every node deterministically › Layers, order, coordinates and labels of a small flow | covered | web.src.flow-graph.layout.test.ts::C-c1de3761 layers order coordinates and labels of a small flow (passed, red_assertion) | - | 0.88 | - |
| C-7a375c7a | web-flow-graph › The layout places every node deterministically › Cycles, unreachable nodes, unknown kinds and missing targets | covered | web.src.flow-graph.layout.test.ts::C-7a375c7a cycles unreachable nodes unknown kinds and missing targets (passed, red_assertion) | - | 0.93 | `e2e/test_l4_c_7a375c7a.py`, `test-results/test-l4-c-7a375c7a-py-test-flow-graphs-render-layout-outcomes-chromium/test-failed-1.png`, `test-results/test-l4-c-7a375c7a-py-test-flow-graphs-render-layout-outcomes-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-024a069e | web-flow-graph › The layout places every node deterministically › Invalid documents, the empty flow and the size bound | covered | web.src.flow-graph.layout.test.ts::C-024a069e invalid documents the empty flow and the size bound (passed, red_assertion) | - | 0.82 | - |
| C-1616f6aa | web-flow-graph › The layout places every node deterministically › The successor table agrees with the format model | covered | test.web-flow-graph.successor-parity.test.ts::C-1616f6aa the successor table agrees with the format model (passed, red_assertion) | - | 0.95 | - |
| C-1129d3e7 | web-flow-graph › The layout places every node deterministically › RF-1 and the journey flow have fixed coordinates | covered | test.web-flow-graph.layout-rf1.test.ts::C-1129d3e7 RF-1 and the journey flow have fixed coordinates (passed, red_assertion) | - | 0.88 | - |
| C-cf729adf | web-flow-graph › The graph has a text equivalent and a state for every case › States, messages and the node list | covered | web.src.flow-graph.graph-model.test.ts::C-cf729adf states messages and the node list (passed, red_assertion) | - | 0.95 | - |
| C-793687fa | web-flow-graph › The graph has a text equivalent and a state for every case › Node details are read-only text | covered | web.src.flow-graph.graph-model.test.ts::C-793687fa node details are read only text (passed, red_assertion) | - | 0.86 | - |
| C-54028b08 | web-flow-graph › The graph has a text equivalent and a state for every case › Selecting a node | covered | web.src.flow-graph.graph-model.test.ts::C-54028b08 selecting a node (passed, red_assertion) | - | 0.79 | `e2e/test_l4_c_54028b08.py`, `.l4-out/e2e/page.html` |
| C-5070339e | web-flow-graph › The drawing is decorative and uses kit tokens only › The drawing model | covered | web.src.flow-graph.drawing.test.ts::C-5070339e drawEdges of S CYCLE and a long case label (passed, red_assertion); web.src.flow-graph.drawing.test.ts::C-5070339e drawNodes of ODD with an added long id (passed, red_assertion); web.src.flow-graph.drawing.test.ts::C-5070339e drawNodes of S and its clas... | - | - | - |
| C-ada22065 | web-flow-graph › The drawing is decorative and uses kit tokens only › Styles and sources follow the policy | covered | web.src.flow-graph.view-sources.test.ts::C-ada22065: the flow graph stylesheet defines the drawn classes from kit tokens (passed, red_assertion); web.src.flow-graph.view-sources.test.ts::C-ada22065: the flow graph view is decorative and free of inline styles (passed, red_assertion) | - | 0.95 | - |
| C-99ed5dc0 | web-flow-graph › The graph loads the saved version it shows › Loading the latest version and a version's document | covered | web.src.flow-graph.graph-source.test.ts::C-99ed5dc0 loadLatestGraph passes a rejection on and refuses a bad id (passed, red_assertion); web.src.flow-graph.graph-source.test.ts::C-99ed5dc0 loadLatestGraph reads the flow then the latest version (passed, red_assertion); web.src.flow-graph.graph-source.... | - | 0.93 | - |
| C-4ca8acf8 | web-flow-graph › The graph loads the saved version it shows › The panel loads a missing document and says when it fails | covered | web.src.flow-graph.graph-source.test.ts::C-4ca8acf8 loadGraphDocument reads the document of one version (passed, red_assertion); web.src.flow-graph.graph-source.test.ts::C-4ca8acf8 settleGraphLoad maps a RangeError to a 404 and keeps other errors (passed, red_assertion); web.src.flow-graph.graph-sou... | - | - | `e2e/test_l4_c_4ca8acf8.py`, `.l4-out/e2e/page.html` |
| C-5be45b98 | web-flow-graph › The graph appears in the editor and on its own page › Registration, path and sources of the pages | covered | web.src.flow-graph.pages.test.ts::C-5be45b98: graphPath validates the id and versionNote names the version (passed, red_assertion); web.src.flow-graph.pages.test.ts::C-5be45b98: the feature file declares the page and registers the panel (passed, red_assertion); web.src.flow-graph.pages.test.ts::C-5b... | - | - | - |
| C-830797f7 | web-flow-graph › The graph logic works against the real engine › Alice, bob and mallory read graphs from the engine | covered | test.journeys.m3-authoring.test.ts::C-830797f7 alice, bob and mallory read graphs from the engine (passed, red_assertion) | - | 0.93 | - |
| C-2619a93b | web-flow-graph › The M3 journey proves authoring in a browser › Alice creates a flow from YAML and reads its graph | uncovered | - | test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph[chromium] (no proof that it discriminates (no red, audit or generated record)) | - | `e2e/test_l4_c_2619a93b.py`, `.l4-out/e2e/page.html` |
| C-68b2dc11 | web-flow-graph › The M3 journey proves authoring in a browser › Bob reads the graph but cannot save | uncovered | - | test_m3_authoring::test_c_68b2dc11_bob_reads_the_graph_but_cannot_save[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.14 | `e2e/test_l4_c_68b2dc11.py`, `test-results/test-l4-c-68b2dc11-py-test-bob-reads-graph-but-cannot-save-chromium/test-failed-1.png`, `test-results/test-l4-c-68b2dc11-py-test-bob-reads-graph-but-cannot-save-chromium/trace.zip`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m3_authoring.py` |  | relevant | new test file |
| `openspec/changes/add-web-flow-graph-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/.l4/ledger/r-20261102T1017Z-2f08.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/.l4/ledger/r-20261102T1458Z-80fb.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/.l4/ledger/r-20261102T1500Z-d5d5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-flow-graph/verification.md` |  | none | exempt: harness, spec or documentation path |
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

1455 of 1455 passed, 0 failed, 0 errored, 0 skipped.
27 of 27 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-c1de3761 | not_testable | - | - | - | 1 | Criterion C-c1de3761 asserts internal layout.ts module behavior: layoutFlow return deep-equality on S, reversed-key and frozen copies, SLASH/ONE sections, and the GRAPH_GEOMETRY and MAX_GRAPH_NODES constants. None of these are exposed through the web page's public interface or observable as user-fac... | - |
| C-7a375c7a | fails_at_head | e2e/test_l4_c_7a375c7a.py | fail | fail | 2 | the test fails at the head: test_l4_c_7a375c7a::test_flow_graphs_render_layout_outcomes[chromium] | test-results/test-l4-c-7a375c7a-py-test-flow-graphs-render-layout-outcomes-chromium/test-failed-1.png, test-results/test-l4-c-7a375c7a-py-test-flow-graphs-render-layout-outcomes-chromium/trace.zip |
| C-024a069e | not_testable | - | - | - | 1 | layoutFlow is an internal client-side function, not exposed over HTTP or through the page DOM; its structured results ({status, reason/layout/count/limit}) are not observable by a user, so an E2E page test cannot drive or observe it. | - |
| C-1616f6aa | not_testable | - | - | - | 1 | This criterion checks internal TypeScript functions/constants (successorFields/successorTargets, NODE_KINDS/GRAPH_NODE_KINDS) agreement with no user-visible behavior, so it cannot be asserted through a pytest-playwright page fixture. | - |
| C-1129d3e7 | not_testable | - | - | - | 1 | The criterion checks internal JS function outputs (layoutFlow/validateFlow deep-equality against reference.md sections and a single L2_UNKNOWN_BLOCK error at /nodes/fetch/uses) using test fixtures; these are not user-observable through the browser page at the base URL origin, so an e2e page test can... | - |
| C-cf729adf | not_testable | - | - | - | 1 | The criterion drives internal functions graphView and kindText with arbitrary document inputs (a mapping, missing nodes mapping, empty flow, 201 nodes, saved/unsaved flags). The page loads one server-provided document per flow and exposes no control to inject those documents, so the specified states... | - |
| C-793687fa | not_testable | - | - | - | 1 | The criterion verifies exact output of the internal nodeDetailRows(doc, node) function for specific documents (flowS, flowODD, a 400-char source node, a __proto__ node). An e2e test hitting only L4_E2E_BASE_URL cannot create or guarantee those flow versions/documents exist or authenticate to load th... | - |
| C-54028b08 | writer_failed | e2e/test_l4_c_54028b08.py | - | - | 2 | opencode's permission rules rejected a tool call (bash) | - |
| C-5070339e | not_testable | - | - | - | 1 | The criterion directly exercises the drawing model functions viewBox, drawNodes and drawEdges across four unrelated layouts (S, ODD, CYCLE, switch). A single E2E page renders one flow graph and cannot reproduce these per-layout function calls through the public UI; this is unit-level behaviour, not ... | - |
| C-ada22065 | not_testable | - | - | - | 1 | The criterion is a static source-code analysis (reading CSS/TSX files for findRawColours, findInlineStyleUse, absence of dangerouslySetInnerHTML/fill/stroke/color literals); these properties are not observable through the browser's public interface, only a subset such as aria attributes is user-visi... | - |
| C-99ed5dc0 | not_testable | - | - | - | 1 | loadLatestGraph's exact mock-client call sequence, opts, return value, and error propagation are internal to the function; there is no user-visible page behavior to assert through the Playwright Page fixture. | - |
| C-4ca8acf8 | not_testable | e2e/test_l4_c_4ca8acf8.py | - | - | 2 | The criterion asserts internal unit-level contracts (settleGraphLoad settle phases, errorPanelModel status/title/decisionId, ApiRequestError conversions, needsDocument booleans) that are not exposed through any user-observable page interface; it has no end-to-end observable outcome to assert via the... | - |
| C-5be45b98 | not_testable | - | - | - | 1 | Asserts internal registration objects (GRAPH_PAGE, GRAPH_PANEL), graphPath/versionNote functions, registry contents, and static .tsx source contents (literals, registerEditorPanel(, dangerouslySetInnerHTML); none are observable through a browser's public interface via pytest-playwright. | - |
| C-830797f7 | not_testable | - | - | - | 1 | The criterion is a multi-user stack integration scenario that depends on undisclosed sign-in/editor UI selectors and GRAPH_GOOD/GRAPH_BAD fixture text; a self-contained e2e test cannot be written from the provided info without mirroring implementation details. | - |
| C-2619a93b | uncollectable | e2e/test_l4_c_2619a93b.py | - | - | 1 | no test of the new file ran at the merge base (collection error or no test) | - |
| C-68b2dc11 | fails_at_head | e2e/test_l4_c_68b2dc11.py | fail | fail | 2 | the test fails at the head: test_l4_c_68b2dc11::test_bob_reads_graph_but_cannot_save[chromium] | test-results/test-l4-c-68b2dc11-py-test-bob-reads-graph-but-cannot-save-chromium/test-failed-1.png, test-results/test-l4-c-68b2dc11-py-test-bob-reads-graph-but-cannot-save-chromium/trace.zip |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-c1de3761 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7a375c7a | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-024a069e | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1616f6aa | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1129d3e7 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cf729adf | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-793687fa | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-54028b08 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5070339e | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-ada22065 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-99ed5dc0 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-4ca8acf8 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-5be45b98 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-830797f7 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2619a93b | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-68b2dc11 | ok | 0.140 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-c1de3761 | skipped | - | - | cap |
| C-024a069e | skipped | - | - | cap |
| C-7a375c7a | skipped | - | - | cap |
| C-54028b08 | rejected | e2e/test_l4_audit_c_54028b08_r2.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_54028b08_r2.py |
| C-cf729adf | rejected | e2e/test_l4_audit_c_cf729adf_r2.py | base | the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_cf729adf_r2.py |

## Rejected audit tests

- C-54028b08: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_54028b08_r2.py
- C-cf729adf: the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_cf729adf_r2.py

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-c1de3761 | web-flow-graph › The layout places every node deterministically › Layers, order, coordinates and labels of a small flow | pass | pass | the judge passed it and a discriminating test passes |
| C-7a375c7a | web-flow-graph › The layout places every node deterministically › Cycles, unreachable nodes, unknown kinds and missing targets | pass | pass | the judge passed it and a discriminating test passes |
| C-024a069e | web-flow-graph › The layout places every node deterministically › Invalid documents, the empty flow and the size bound | pass | pass | the judge passed it and a discriminating test passes |
| C-1616f6aa | web-flow-graph › The layout places every node deterministically › The successor table agrees with the format model | pass | pass | the judge passed it and a discriminating test passes |
| C-1129d3e7 | web-flow-graph › The layout places every node deterministically › RF-1 and the journey flow have fixed coordinates | pass | pass | the judge passed it and a discriminating test passes |
| C-cf729adf | web-flow-graph › The graph has a text equivalent and a state for every case › States, messages and the node list | pass | pass | the judge passed it and a discriminating test passes |
| C-793687fa | web-flow-graph › The graph has a text equivalent and a state for every case › Node details are read-only text | pass | pass | the judge passed it and a discriminating test passes |
| C-54028b08 | web-flow-graph › The graph has a text equivalent and a state for every case › Selecting a node | pass | pass | the judge passed it and a discriminating test passes |
| C-5070339e | web-flow-graph › The drawing is decorative and uses kit tokens only › The drawing model | pass | pass | the judge passed it and a discriminating test passes |
| C-ada22065 | web-flow-graph › The drawing is decorative and uses kit tokens only › Styles and sources follow the policy | pass | pass | the judge passed it and a discriminating test passes |
| C-99ed5dc0 | web-flow-graph › The graph loads the saved version it shows › Loading the latest version and a version's document | pass | pass | the judge passed it and a discriminating test passes |
| C-4ca8acf8 | web-flow-graph › The graph loads the saved version it shows › The panel loads a missing document and says when it fails | pass | pass | the judge passed it and a discriminating test passes |
| C-5be45b98 | web-flow-graph › The graph appears in the editor and on its own page › Registration, path and sources of the pages | pass | pass | the judge passed it and a discriminating test passes |
| C-830797f7 | web-flow-graph › The graph logic works against the real engine › Alice, bob and mallory read graphs from the engine | pass | pass | the judge passed it and a discriminating test passes |
| C-2619a93b | web-flow-graph › The M3 journey proves authoring in a browser › Alice creates a flow from YAML and reads its graph | pass | needs_human | uncovered: no adequate discriminating test traces it |
| C-68b2dc11 | web-flow-graph › The M3 journey proves authoring in a browser › Bob reads the graph but cannot save | pass | needs_human | uncovered: no adequate discriminating test traces it |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-2619a93b): test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-68b2dc11): test_m3_authoring::test_c_68b2dc11_bob_reads_the_graph_but_cannot_save[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] an audit test was rejected (criterion C-54028b08): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_54028b08_r2.py
- [minor, deterministic] an audit test was rejected (criterion C-cf729adf): the test command `pnpm run test` does not collect the audit test file e2e/test_l4_audit_c_cf729adf_r2.py
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c1de3761): No end-to-end test traces criterion C-c1de3761 (web-flow-graph › The layout places every node deterministically › Layers, order, coordinates and labels of a small flow); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-7a375c7a): No end-to-end test traces criterion C-7a375c7a (web-flow-graph › The layout places every node deterministically › Cycles, unreachable nodes, unknown kinds and missing targets); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-024a069e): No end-to-end test traces criterion C-024a069e (web-flow-graph › The layout places every node deterministically › Invalid documents, the empty flow and the size bound); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1616f6aa): No end-to-end test traces criterion C-1616f6aa (web-flow-graph › The layout places every node deterministically › The successor table agrees with the format model); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1129d3e7): No end-to-end test traces criterion C-1129d3e7 (web-flow-graph › The layout places every node deterministically › RF-1 and the journey flow have fixed coordinates); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-cf729adf): No end-to-end test traces criterion C-cf729adf (web-flow-graph › The graph has a text equivalent and a state for every case › States, messages and the node list); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-793687fa): No end-to-end test traces criterion C-793687fa (web-flow-graph › The graph has a text equivalent and a state for every case › Node details are read-only text); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-54028b08): No end-to-end test traces criterion C-54028b08 (web-flow-graph › The graph has a text equivalent and a state for every case › Selecting a node); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5070339e): No end-to-end test traces criterion C-5070339e (web-flow-graph › The drawing is decorative and uses kit tokens only › The drawing model); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ada22065): No end-to-end test traces criterion C-ada22065 (web-flow-graph › The drawing is decorative and uses kit tokens only › Styles and sources follow the policy); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-99ed5dc0): No end-to-end test traces criterion C-99ed5dc0 (web-flow-graph › The graph loads the saved version it shows › Loading the latest version and a version's document); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-4ca8acf8): No end-to-end test traces criterion C-4ca8acf8 (web-flow-graph › The graph loads the saved version it shows › The panel loads a missing document and says when it fails); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5be45b98): No end-to-end test traces criterion C-5be45b98 (web-flow-graph › The graph appears in the editor and on its own page › Registration, path and sources of the pages); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-830797f7): No end-to-end test traces criterion C-830797f7 (web-flow-graph › The graph logic works against the real engine › Alice, bob and mallory read graphs from the engine); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2619a93b): The end-to-end test test_m3_authoring::test_c_2619a93b_alice_creates_a_flow_from_yaml_and_reads_its_graph[chromium] traces criterion C-2619a93b (web-flow-graph › The M3 journey proves authoring in a browser › Alice creates a flow from YAML and reads its graph), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-68b2dc11): The end-to-end test test_m3_authoring::test_c_68b2dc11_bob_reads_the_graph_but_cannot_save[chromium] traces criterion C-68b2dc11 (web-flow-graph › The M3 journey proves authoring in a browser › Bob reads the graph but cannot save), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] start naming a non-existent node is unpinned (spec gap) (criterion C-7a375c7a): No scenario pins down layoutFlow when doc.start is a string that names no node. The committed code treats start as absent (all nodes unreachable layer 0); another reasonable implementation could reject it. This is observable only outside the specified scenarios.

## Needs a human

- UI criterion C-c1de3761 has no end-to-end test; see the generated UI tests table
- UI criterion C-7a375c7a has no end-to-end test; see the generated UI tests table
- UI criterion C-024a069e has no end-to-end test; see the generated UI tests table
- UI criterion C-1616f6aa has no end-to-end test; see the generated UI tests table
- UI criterion C-1129d3e7 has no end-to-end test; see the generated UI tests table
- UI criterion C-cf729adf has no end-to-end test; see the generated UI tests table
- UI criterion C-793687fa has no end-to-end test; see the generated UI tests table
- UI criterion C-54028b08 has no end-to-end test; see the generated UI tests table
- UI criterion C-5070339e has no end-to-end test; see the generated UI tests table
- UI criterion C-ada22065 has no end-to-end test; see the generated UI tests table
- UI criterion C-99ed5dc0 has no end-to-end test; see the generated UI tests table
- UI criterion C-4ca8acf8 has no end-to-end test; see the generated UI tests table
- UI criterion C-5be45b98 has no end-to-end test; see the generated UI tests table
- UI criterion C-830797f7 has no end-to-end test; see the generated UI tests table
- UI criterion C-2619a93b has no end-to-end test; see the generated UI tests table
- UI criterion C-68b2dc11 has no end-to-end test; see the generated UI tests table

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

## Guard events

- guard.test_tamper: e2e/test_m3_authoring.py
