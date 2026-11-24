# Verification: openspec:add-web-tools: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `eefc582758dc820b20384b3ea8aaa1b509db1476`
- Head: `13fc817677b98e1bf1fcce3ddab17e401ca235d6`
- Implementer profiles: deepseek-free, beam, claude-sonnet
- Judge: nemotron-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base merged: main@eefc582758 as 13fc817677 (1 commit) |
| 1 | integrity | ok | 1320.9 | 11 sub-checks; scope: 29 changed file(s) |
| 2 | build | ok | 52.0 |  |
| 3 | tests | failed | 701.0 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium], test_m6b_section_layout::test_surface_region_puts_t... |
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
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261124T1654Z-97e6/020-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261124T1654Z-97e6/021-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261124T1654Z-97e6/022-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261124T1654Z-97e6/023-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261124T1654Z-97e6/024-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261124T1654Z-97e6/025-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261124T1654Z-97e6/026-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 8 task(s): red and green compared |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/features/67-admin-tool-register.tsx, web/src/runs/stale.test.ts, web/src/runs/stale.ts, web/src/runs/test-run.ts, web/src/tools/CredentialSection.tsx (+16 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3008 of 3008 base tests pass on the unit's code with its 11 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- web.src.tools.calls.test.ts::C-78ea404d loadToolRefs returns the bound refs over two requests (named by the task text, plan:m7@0956170ee72eb868)
- web.src.tools.calls.test.ts::C-78ea404d loadToolRefs stops after ten pages without failing (named by the task text, plan:m7@0956170ee72eb868)

## Evidence

### Needs attention

- tests are not all green (a failed or errored test, or a new test that did not pass)

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m7_tool_registration.py` |  | relevant | new test file |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T0843Z-680c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1053Z-85c7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1311Z-f4b6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1454Z-d23f.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/.l4/ledger/r-20261124T1654Z-97e6.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-tools/tasks.md` |  | none | exempt: harness, spec or documentation path |
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

3180 of 3182 passed, 2 failed, 0 errored, 0 skipped.
49 of 49 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_admin::test_tool_servers_show_who_registered_outside_the_surface_region[chromium], test_m6b_section_layout::test_surface_region_puts_the_body_below_the_heading[chromium] Log: `.l4-out/gates/r-20261124T1654Z-97e6/026-e2e.log`.

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae e2e gate failed

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
