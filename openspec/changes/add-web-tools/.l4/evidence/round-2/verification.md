# Verification: openspec:add-web-tools: NEEDS_HUMAN (round 2)

traceability: 10/14 criteria covered by a discriminating test

- Base: `eefc582758dc820b20384b3ea8aaa1b509db1476`
- Head: `70b281a2695e2ad8195b2faf0d55fb497d2ac227`
- Implementer profiles: deepseek-free, beam, claude-sonnet
- Judge: nemotron-judge, 4 call(s), prompt sha256 `c1a629549100ee4fbdc8fe28642ffff1130a8abc34153145f5cd82df0a2c6c60`
- Judge replies of nemotron-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: -
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), beam reflection (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 1.0 | base main@eefc582758 contained |
| 1 | integrity | ok | 881.0 | 11 sub-checks; scope: 38 changed file(s) |
| 2 | build | ok | 52.0 |  |
| 3 | tests | ok | 654.8 |  |
| 4 | traceability | ok | 0.3 | 10/14 criteria covered |
| 4a | audit sampling | ok | 73.7 | 2 not_testable, 1 skipped; support files at the base: 11 |
| 5 | ui test generation | ok | 3093.8 | 3 fails_at_head, 10 not_testable, 1 writer_failed; 8 not_testable covered by step 4: notes, no hold (L4-VER-067); e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/features/67-admin-tool-register.tsx, web/src/runs/stale.ts, web/src/runs/test-run.ts, web/src/tools/CredentialSection.tsx, web/src/tools/GrantsPage.tsx and 6 more |
| 8 | s1 judge | ok | 1.1 | 12/14 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | failed | 2402.6 | timeout: no answer within 600s |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261124T2154Z-1244/005-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261124T2154Z-1244/006-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261124T2154Z-1244/007-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261124T2154Z-1244/008-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261124T2154Z-1244/009-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261124T2154Z-1244/010-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261124T2154Z-1244/011-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 8 task(s): red and green compared |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/features/67-admin-tool-register.tsx, web/src/runs/stale.test.ts, web/src/runs/stale.ts, web/src/runs/test-run.ts, web/src/tools/CredentialSection.tsx (+16 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3008 of 3008 base tests pass on the unit's code with its 11 test and support files at the base (base: evidence) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- web.src.tools.calls.test.ts::C-78ea404d loadToolRefs returns the bound refs over two requests (named by the task text, plan:m7@0956170ee72eb868)
- web.src.tools.calls.test.ts::C-78ea404d loadToolRefs stops after ten pages without failing (named by the task text, plan:m7@0956170ee72eb868)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-a7a348b2 | web-runs › A stale validation has its own text in the test-run and dry-run panels › A stale version reads as one message in both panels | covered | web.src.runs.stale.test.ts::C-a7a348b2 dryRunFormErrors reads a stale refusal as one message (passed, red_assertion); web.src.runs.stale.test.ts::C-a7a348b2 staleVersionText gives the text for a stale version and null otherwise (passed, red_assertion); web.src.runs.stale.test.ts::C-a7a348b2 testRunF... | - | 0.88 | `e2e/test_l4_c_a7a348b2.py`, `.l4-out/e2e/page.html` |
| C-3ad08589 | web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix | covered | web.src.tools.register.test.ts::C-3ad08589 codeRegistration builds one tool without a description and one with it (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 codeRegistration refuses the input before the output schema (passed, red_assertion); web.src.tools.register.test.ts::C... | - | - | `e2e/test_l4_c_3ad08589.py`, `.l4-out/e2e/page.html` |
| C-a4971512 | web-tools › A preview is read strictly, the calls use their routes and a refusal lands on the form › Previews, calls and refusals | covered | web.src.tools.register-calls.test.ts::C-a4971512 codeDraftOf reads one code tool and refuses any other surface (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 loadCodeDraft reads the server and prefers the pending surface (passed, red_assertion); web.src.tools.register-call... | - | - | - |
| C-9153e19d | web-tools › A credential is read without its secret, and its body, texts and refusals are fixed › A credential view never carries a secret and its body, texts and refusals are fixed | covered | web.src.tools.credentials.test.ts::C-9153e19d credentialBody builds the bearer and API key bodies (passed, red_assertion); web.src.tools.credentials.test.ts::C-9153e19d credentialBody refuses the header before the value and a bad server id (passed, red_assertion); web.src.tools.credentials.test.ts::... | - | 0.91 | - |
| C-29e43442 | web-tools › The credential calls page the list and send the secret only in the body › The credential calls page the list and send the secret only in the body | covered | web.src.tools.credentials-calls.test.ts::C-29e43442 loadServerCredential pages the list and resolves the first credential of the server (passed, red_assertion); web.src.tools.credentials-calls.test.ts::C-29e43442 loadServerCredential resolves null and refuses unreadable pages, a forbidden list and a... | - | 0.73 | - |
| C-a714f000 | web-tools › A step id of the grant form is at most 128 characters › A step id of 128 characters is accepted and one of 129 is refused | covered | web.src.tools.grant-node-bound.test.ts::C-a714f000 grantBody accepts a step id of 128 characters and refuses 129 and 1024 (passed, red_assertion); web.src.tools.grant-node-bound.test.ts::C-a714f000 parseGrant accepts a step id of 128 characters and refuses 129 and 1024 (passed, red_assertion) | - | 0.93 | - |
| C-0f038efb | web-tools › A server whose tools carry a call is parsed and listed › Servers of every adapter parse and list | covered | web.src.tools.servers-call.test.ts::C-0f038efb cursorPageFetcher lists servers of every adapter (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer reads a tool ... | - | 0.85 | - |
| C-2ec0cc21 | web-tools › The registration page carries fixed names, one feature file and kit components only › The registration page carries fixed names and its own feature file | covered | web.src.tools.register-pages.test.ts::C-2ec0cc21 the feature file has no navLabel and the nav lists the three tool pages (passed, red_assertion); web.src.tools.register-pages.test.ts::C-2ec0cc21 the new pages use the kit and keep the secret field a password (passed, red_assertion); web.src.tools.reg... | - | 0.89 | - |
| C-e3ab2add | web-tools › The registration and credential pages show the states of the API's answers › An MCP server is registered and a code-block server shows no credential form | uncovered | - | test_m7_tool_registration::test_register_mcp_server_and_code_block_detail[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.10 | `e2e/test_l4_c_e3ab2add.py`, `test-results/test-l4-c-e3ab2add-py-test-mcp-registration-and-code-block-credential-chromium/test-failed-1.png`, `test-results/test-l4-c-e3ab2add-py-test-mcp-registration-and-code-block-credential-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-0a8c70b3 | web-tools › The registration and credential pages show the states of the API's answers › An OpenAPI document is previewed, given effects and registered | uncovered | - | test_m7_tool_registration::test_register_openapi_preview_effects_and_retry[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.10 | `e2e/test_l4_c_0a8c70b3.py`, `test-results/test-l4-c-0a8c70b3-py-test-openapi-document-preview-effects-and-register-chromium/test-failed-1.png`, `test-results/test-l4-c-0a8c70b3-py-test-openapi-document-preview-effects-and-register-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-62f4785e | web-tools › The registration and credential pages show the states of the API's answers › A credential is stored and rotated and its secret never shows | uncovered | - | test_m7_tool_registration::test_credential_stored_rotated_secret_never_shows[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.10 | `e2e/test_l4_c_62f4785e.py`, `test-results/test-l4-c-62f4785e-py-test-credential-stored-rotated-secret-never-shows-chromium/test-failed-1.png`, `test-results/test-l4-c-62f4785e-py-test-credential-stored-rotated-secret-never-shows-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-c3420a43 | web-tools › The registration and credential pages show the states of the API's answers › A document and a code block are replaced from the server detail | uncovered | - | test_m7_tool_registration::test_replace_document_and_edit_code_from_detail[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.04 | - |
| C-78ea404d | web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages | covered | web.src.tools.calls.test.ts::C-78ea404d loadToolRefs returns the bound refs over two requests (passed, red_assertion); web.src.tools.calls.test.ts::C-78ea404d loadToolRefs stops after ten pages without failing (passed, red_assertion) | web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id (no proof that it discrimi... | 0.75 | - |
| C-5d82c84b | web-tools › The calls use the right routes and headers and refuse unreadable answers › The tool list is read for up to 100 pages and says when it is cut off | covered | web.src.tools.refs.test.ts::C-5d82c84b an empty tool list is complete and only a cut list carries the note (passed, red_assertion); web.src.tools.refs.test.ts::C-5d82c84b loadToolRefs is complete when the hundredth page ends the list and refuses unreadable answers (passed, red_assertion) | - | 0.91 | - |

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m7_tool_registration.py` |  | relevant | new test file |
| `openspec/changes/add-web-tools-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T0843Z-680c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1053Z-85c7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1311Z-f4b6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1454Z-d23f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1654Z-97e6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1914Z-695e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/verification.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/features/67-admin-tool-register.tsx` | web | relevant | named in the spec |
| `web/src/runs/stale.test.ts` |  | relevant | new test file |
| `web/src/runs/stale.ts` | web | relevant | named in the spec |
| `web/src/runs/test-run.ts` | web | relevant | named in the spec |
| `web/src/tools/CredentialSection.tsx` | web | relevant | named in the spec |
| `web/src/tools/GrantsPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/RegisterPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ReplaceSection.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/calls.test.ts` |  | relevant | named in the spec |
| `web/src/tools/credentials-calls.test.ts` |  | relevant | new test file |
| `web/src/tools/credentials.test.ts` |  | relevant | new test file |
| `web/src/tools/credentials.ts` | web | relevant | named in the spec |
| `web/src/tools/grant-node-bound.test.ts` |  | relevant | new test file |
| `web/src/tools/grants.ts` | web | relevant | named in the spec |
| `web/src/tools/refs.test.ts` |  | relevant | new test file |
| `web/src/tools/register-calls.test.ts` |  | relevant | new test file |
| `web/src/tools/register-pages.test.ts` |  | relevant | new test file |
| `web/src/tools/register.test.ts` |  | relevant | new test file |
| `web/src/tools/register.ts` | web | relevant | named in the spec |
| `web/src/tools/servers-call.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/features/67-admin-tool-register.tsx, web/src/runs/stale.ts, web/src/runs/test-run.ts, web/src/tools/CredentialSection.tsx, web/src/tools/GrantsPage.tsx and 6 more

### Tests

3181 of 3182 passed, 1 failed, 0 errored, 0 skipped.
49 of 49 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-a7a348b2 | not_testable | e2e/test_l4_c_a7a348b2.py | - | - | 2 | The criterion names internal message functions (staleVersionText, testRunFormErrors, dryRunFormErrors); the UI diff adds no test-run or dry-run panel and the page snapshot is an empty shell, so playwright has no public page or endpoint to assert the stale message against without mirroring the implem... | - |
| C-3ad08589 | not_testable | e2e/test_l4_c_3ad08589.py | - | - | 2 | test-plan.md § Drafts rows (M1–M3, P1–P3, O1, O2, C1–C3, R1, R2) with their draft contents, expected request bodies, and failing fields are not provided, so the specific observable outcomes cannot be asserted without fabricating values.; covered by step 4: web.src.tools.register.test.ts::C-3ad08589 ... | - |
| C-a4971512 | not_testable | - | - | - | 1 | test-plan.md § Preview, calls and answers (PV, the 8 malformed values, rows K1-K6 and E1-E4) and the internal parsePreview function are not provided, so no observable public-interface input or outcome can be defined.; covered by step 4: web.src.tools.register-calls.test.ts::C-a4971512 codeDraftOf re... | - |
| C-9153e19d | not_testable | - | - | - | 1 | Criterion C-9153e19d tests the TypeScript unit function `parseCredential` with test-specific fixtures (CREC, CV, VAL_T, eight malformed values, test-plan.md rows B1/B2/T1/T2). None of these are exposed through the browser UI or the pytest-playwright e2e harness at L4_E2E_BASE_URL; its outcomes are f... | - |
| C-29e43442 | not_testable | - | - | - | 1 | The criterion is defined by test-plan.md § Credentials rows L1/L2/S1/S2 run against a recording fake whose endpoints and behavior are not provided, and no "credential calls page" path or public interface is defined in the diff or page snapshot, so there is no concrete origin-relative page to drive o... | - |
| C-a714f000 | not_testable | - | - | - | 2 | The criterion asserts internal return values of `parseGrant`/`grantBody` (`null` and `{ ok: false, field: "nodeId", … }`), which are not user-observable through a browser page; it is a unit-level criterion, not an end-to-end one.; covered by step 4: web.src.tools.grant-node-bound.test.ts::C-a714f000... | - |
| C-0f038efb | not_testable | - | - | - | 2 | The criterion’s decisive assertions are internal `parseToolServer`/`cursorPageFetcher` results (`http: null`, per-adapter flags, a "—" Call, malformed server `null`) not exposed through any named public page or endpoint; no route is given for the page holding `acme`, `crm`, `snips`, so the page fixt... | - |
| C-2ec0cc21 | not_testable | - | - | - | 1 | The criterion is a TypeScript unit test (tools/register-pages.test.ts) that reads source-code constants, feature literals, and a registry; nothing about it is observable through the browser's public interface, so a Playwright page test cannot verify it.; covered by step 4: web.src.tools.register-pag... | - |
| C-e3ab2add | fails_at_head | e2e/test_l4_c_e3ab2add.py | fail | fail | 2 | the test fails at the head: test_l4_c_e3ab2add::test_mcp_registration_and_code_block_credential[chromium] | test-results/test-l4-c-e3ab2add-py-test-mcp-registration-and-code-block-credential-chromium/test-failed-1.png, test-results/test-l4-c-e3ab2add-py-test-mcp-registration-and-code-block-credential-chromium/trace.zip |
| C-0a8c70b3 | fails_at_head | e2e/test_l4_c_0a8c70b3.py | fail | fail | 2 | the test fails at the head: test_l4_c_0a8c70b3::test_openapi_document_preview_effects_and_register[chromium] | test-results/test-l4-c-0a8c70b3-py-test-openapi-document-preview-effects-and-register-chromium/test-failed-1.png, test-results/test-l4-c-0a8c70b3-py-test-openapi-document-preview-effects-and-register-chromium/trace.zip |
| C-62f4785e | fails_at_head | e2e/test_l4_c_62f4785e.py | fail | fail | 2 | the test fails at the head: test_l4_c_62f4785e::test_credential_stored_rotated_secret_never_shows[chromium] | test-results/test-l4-c-62f4785e-py-test-credential-stored-rotated-secret-never-shows-chromium/test-failed-1.png, test-results/test-l4-c-62f4785e-py-test-credential-stored-rotated-secret-never-shows-chromium/trace.zip |
| C-c3420a43 | not_testable | - | - | - | 1 | Cannot drive the WHEN steps: no route, server-list/detail page markup, or seed-approved-server fixture is provided to reach a server's replace page, and ReplaceSection.tsx source is truncated, so the save/preview flow and detail state cannot be addressed through a known public interface. | - |
| C-78ea404d | not_testable | - | - | - | 1 | The criterion asserts internal HTTP call counts and loadToolRefs resolution (exactly two requests for T1, 100 paginated requests for T2, complete flags) against a recording fake. These are not observable through the browser's public interface; the page fixture cannot count internal requests or read ... | - |
| C-5d82c84b | writer_failed | - | - | - | 1 | no answer within 600s | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-a7a348b2 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3ad08589 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-a4971512 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-9153e19d | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-29e43442 | ok | 0.730 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a714f000 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0f038efb | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2ec0cc21 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-e3ab2add | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0a8c70b3 | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-62f4785e | ok | 0.100 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c3420a43 | ok | 0.040 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-78ea404d | ok | 0.750 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5d82c84b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-78ea404d | skipped | - | - | cap |
| C-0f038efb | not_testable | - | - | The criterion targets TypeScript functions parseToolServer/cursorPageFetcher and fixtures S_MCP/S_CODE/S_FIX from test-plan.md § Servers; no Python module under test or fixture values are provided to import and call, so no automated pytest test can be written from the shown sources. |
| C-a7a348b2 | not_testable | - | - | The named functions (staleVersionText, testRunFormErrors, dryRunFormErrors) and STALE constant are TypeScript/React panel code described only in design.md (TestRunPanel.tsx, DryRunPanel.tsx); no Python module under test or existing pytest header is provided, so a self-contained pytest test cannot im |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-a7a348b2 | web-runs › A stale validation has its own text in the test-run and dry-run panels › A stale version reads as one message in both panels | - | needs_human | the judge gave no verdict for this criterion |
| C-3ad08589 | web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix | - | needs_human | the judge gave no verdict for this criterion |
| C-a4971512 | web-tools › A preview is read strictly, the calls use their routes and a refusal lands on the form › Previews, calls and refusals | - | needs_human | the judge gave no verdict for this criterion |
| C-9153e19d | web-tools › A credential is read without its secret, and its body, texts and refusals are fixed › A credential view never carries a secret and its body, texts and refusals are fixed | - | needs_human | the judge gave no verdict for this criterion |
| C-29e43442 | web-tools › The credential calls page the list and send the secret only in the body › The credential calls page the list and send the secret only in the body | - | needs_human | the judge gave no verdict for this criterion |
| C-a714f000 | web-tools › A step id of the grant form is at most 128 characters › A step id of 128 characters is accepted and one of 129 is refused | - | needs_human | the judge gave no verdict for this criterion |
| C-0f038efb | web-tools › A server whose tools carry a call is parsed and listed › Servers of every adapter parse and list | - | needs_human | the judge gave no verdict for this criterion |
| C-2ec0cc21 | web-tools › The registration page carries fixed names, one feature file and kit components only › The registration page carries fixed names and its own feature file | - | needs_human | the judge gave no verdict for this criterion |
| C-e3ab2add | web-tools › The registration and credential pages show the states of the API's answers › An MCP server is registered and a code-block server shows no credential form | - | needs_human | uncovered: no adequate discriminating test traces it |
| C-0a8c70b3 | web-tools › The registration and credential pages show the states of the API's answers › An OpenAPI document is previewed, given effects and registered | - | needs_human | uncovered: no adequate discriminating test traces it |
| C-62f4785e | web-tools › The registration and credential pages show the states of the API's answers › A credential is stored and rotated and its secret never shows | - | needs_human | uncovered: no adequate discriminating test traces it |
| C-c3420a43 | web-tools › The registration and credential pages show the states of the API's answers › A document and a code block are replaced from the server detail | - | needs_human | uncovered: no adequate discriminating test traces it |
| C-78ea404d | web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages | - | needs_human | the judge gave no verdict for this criterion |
| C-5d82c84b | web-tools › The calls use the right routes and headers and refuse unreadable answers › The tool list is read for up to 100 pages and says when it is cut off | - | needs_human | the judge gave no verdict for this criterion |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-e3ab2add): test_m7_tool_registration::test_register_mcp_server_and_code_block_detail[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-0a8c70b3): test_m7_tool_registration::test_register_openapi_preview_effects_and_retry[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-62f4785e): test_m7_tool_registration::test_credential_stored_rotated_secret_never_shows[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-c3420a43): test_m7_tool_registration::test_replace_document_and_edit_code_from_detail[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d confirmGrantById posts an empty body and resolves with nothing: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d deployPolicy posts the source under the key and returns the version: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadPolicy gets the view and refuses an unreadable answer: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadToolRefs refuses an unreadable item: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadToolServer gets the server and reads the view: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d loadToolServer passes the signal and refuses what it cannot read: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d postGrant posts the body under the key and returns the id: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d postGrant refuses a bad draft, a blank key and unreadable answers: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d revokeGrantById deletes the grant and resolves with nothing: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-78ea404d): web.src.tools.calls.test.ts::C-78ea404d validatePolicy posts the source and returns ok and problems: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a7a348b2): No end-to-end test traces criterion C-a7a348b2 (web-runs › A stale validation has its own text in the test-run and dry-run panels › A stale version reads as one message in both panels); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3ad08589): No end-to-end test traces criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a4971512): No end-to-end test traces criterion C-a4971512 (web-tools › A preview is read strictly, the calls use their routes and a refusal lands on the form › Previews, calls and refusals); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-9153e19d): No end-to-end test traces criterion C-9153e19d (web-tools › A credential is read without its secret, and its body, texts and refusals are fixed › A credential view never carries a secret and its body, texts and refusals are fixed); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-29e43442): No end-to-end test traces criterion C-29e43442 (web-tools › The credential calls page the list and send the secret only in the body › The credential calls page the list and send the secret only in the body); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a714f000): No end-to-end test traces criterion C-a714f000 (web-tools › A step id of the grant form is at most 128 characters › A step id of 128 characters is accepted and one of 129 is refused); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0f038efb): No end-to-end test traces criterion C-0f038efb (web-tools › A server whose tools carry a call is parsed and listed › Servers of every adapter parse and list); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2ec0cc21): No end-to-end test traces criterion C-2ec0cc21 (web-tools › The registration page carries fixed names, one feature file and kit components only › The registration page carries fixed names and its own feature file); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-e3ab2add): The end-to-end test test_m7_tool_registration::test_register_mcp_server_and_code_block_detail[chromium] traces criterion C-e3ab2add (web-tools › The registration and credential pages show the states of the API's answers › An MCP server is registered and a code-block server shows no credential form), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0a8c70b3): The end-to-end test test_m7_tool_registration::test_register_openapi_preview_effects_and_retry[chromium] traces criterion C-0a8c70b3 (web-tools › The registration and credential pages show the states of the API's answers › An OpenAPI document is previewed, given effects and registered), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-62f4785e): The end-to-end test test_m7_tool_registration::test_credential_stored_rotated_secret_never_shows[chromium] traces criterion C-62f4785e (web-tools › The registration and credential pages show the states of the API's answers › A credential is stored and rotated and its secret never shows), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-c3420a43): The end-to-end test test_m7_tool_registration::test_replace_document_and_edit_code_from_detail[chromium] traces criterion C-c3420a43 (web-tools › The registration and credential pages show the states of the API's answers › A document and a code block are replaced from the server detail), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-78ea404d): No end-to-end test traces criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5d82c84b): No end-to-end test traces criterion C-5d82c84b (web-tools › The calls use the right routes and headers and refuse unreadable answers › The tool list is read for up to 100 pages and says when it is cut off); step 5 generates one.

## Needs a human

- UI criterion C-0f038efb has no end-to-end test; see the generated UI tests table
- UI criterion C-e3ab2add has no end-to-end test; see the generated UI tests table
- UI criterion C-0a8c70b3 has no end-to-end test; see the generated UI tests table
- UI criterion C-62f4785e has no end-to-end test; see the generated UI tests table
- UI criterion C-c3420a43 has no end-to-end test; see the generated UI tests table
- UI criterion C-5d82c84b has no end-to-end test; see the generated UI tests table
- the judge's reply was discarded (part 1 of 2, timeout: no answer within 600s)

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.runs.stale.test.ts::C-a7a348b2 dryRunFormErrors reads a stale refusal as one message` (task 2.3): passed
- `web.src.runs.stale.test.ts::C-a7a348b2 staleVersionText gives the text for a stale version and null otherwise` (task 2.3): passed
- `web.src.runs.stale.test.ts::C-a7a348b2 testRunFormErrors reads a stale refusal as one message` (task 2.3): passed
- `web.src.tools.credentials-calls.test.ts::C-29e43442 loadServerCredential pages the list and resolves the first credential of the server` (task 1.4): passed
- `web.src.tools.credentials-calls.test.ts::C-29e43442 loadServerCredential resolves null and refuses unreadable pages, a forbidden list and a bad id` (task 1.4): passed
- `web.src.tools.credentials-calls.test.ts::C-29e43442 rotateServerCredential sends the value and scheme and refuses a bad id, a bad value and an unreadable answer` (task 1.4): passed
- `web.src.tools.credentials-calls.test.ts::C-29e43442 storeCredential posts the body under the key and refuses a blank key, a non-object body and an unreadable answer` (task 1.4): passed
- `web.src.tools.credentials.test.ts::C-9153e19d credentialBody builds the bearer and API key bodies` (task 1.3): passed
- `web.src.tools.credentials.test.ts::C-9153e19d credentialBody refuses the header before the value and a bad server id` (task 1.3): passed
- `web.src.tools.credentials.test.ts::C-9153e19d credentialErrors maps the conflict, the code-block refusal, the vault and the fields` (task 1.3): passed
- `web.src.tools.credentials.test.ts::C-9153e19d credentialText says when a credential is missing or stored and a code block needs none` (task 1.3): passed
- `web.src.tools.credentials.test.ts::C-9153e19d parseCredential reads the five members and never a secret` (task 1.3): passed
- `web.src.tools.credentials.test.ts::C-9153e19d parseCredential refuses the malformed records` (task 1.3): passed
- `web.src.tools.grant-node-bound.test.ts::C-a714f000 grantBody accepts a step id of 128 characters and refuses 129 and 1024` (task 2.2): passed
- `web.src.tools.grant-node-bound.test.ts::C-a714f000 parseGrant accepts a step id of 128 characters and refuses 129 and 1024` (task 2.2): passed
- `web.src.tools.refs.test.ts::C-5d82c84b an empty tool list is complete and only a cut list carries the note` (task 2.1): passed
- `web.src.tools.refs.test.ts::C-5d82c84b loadToolRefs is complete when the hundredth page ends the list and refuses unreadable answers` (task 2.1): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 codeDraftOf reads one code tool and refuses any other surface` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 loadCodeDraft reads the server and prefers the pending surface` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 parsePreview reads the operations without the version and refuses malformed previews` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 prefillEffects maps each non-excluded operation to its tool effect` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 previewOperations posts the preview and refuses another path and an unreadable answer` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 registerServer posts under the key and reads the id from the server for MCP` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 registerServer refuses unreadable answers a blank key and another path` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 registrationFormErrors maps the conflict and the named validation fields` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 registrationFormErrors puts an unknown field and a forbidden answer on the form` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 registrationFormErrors reads every engine reason and the payload text` (task 1.2): passed
- `web.src.tools.register-calls.test.ts::C-a4971512 replaceServer puts a replacement and refuses an unreadable answer and a registration request` (task 1.2): passed
- `web.src.tools.register-pages.test.ts::C-2ec0cc21 the feature file has no navLabel and the nav lists the three tool pages` (task 3.1): passed
- `web.src.tools.register-pages.test.ts::C-2ec0cc21 the new pages use the kit and keep the secret field a password` (task 3.1): passed
- `web.src.tools.register-pages.test.ts::C-2ec0cc21 the registration constants hold the fixed names` (task 3.1): passed
- `web.src.tools.register-pages.test.ts::C-2ec0cc21 the servers and grants pages carry the link, the sections and the note` (task 3.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 codeRegistration builds one tool without a description and one with it` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 codeRegistration refuses the input before the output schema` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 codeReplacement checks the schemas and refuses a server id off the pattern` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 mcpRegistration builds the trimmed MCP body and refuses the id before the url` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 mcpRegistration keeps a local http address as typed` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 no builder changes the draft it is given` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 openApiRegistration builds the overlay of the chosen effects and refuses the first failing field` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 openApiReplacement checks the document and overlay and ignores the origin` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 previewRequest sends the origin it parses and the document, refusing origin first` (task 1.1): passed
- `web.src.tools.register.test.ts::C-3ad08589 the replacement builders build the PUT bodies and refuse a bad server id` (task 1.1): passed
- `web.src.tools.servers-call.test.ts::C-0f038efb cursorPageFetcher lists servers of every adapter` (task 2.2): passed
- `web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer reads a tool with a call and no http as http null` (task 2.2): passed
- `web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer refuses a present http that is not a method and path` (task 2.2): passed
