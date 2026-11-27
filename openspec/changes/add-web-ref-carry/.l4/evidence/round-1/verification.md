# Verification: openspec:add-web-ref-carry: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `573790765e5cfba65969dee050afd165db21018b`
- Head: `45b495f281e21f70de58517e22da89a3879a57b3`
- Implementer profiles: deepseek-free, beam, claude-sonnet
- Judge: nemotron-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base main@573790765e contained |
| 1 | integrity | failed | 0.3 | an inline suppression was not declared (+1 unfrozen by human answers); scope: 19 changed file(s) |
| 2 | build | not_run | 0.0 | an earlier step failed |
| 3 | tests | not_run | 0.0 | an earlier step failed |
| 4 | traceability | not_run | 0.0 | an earlier step failed |
| 4a | audit sampling | not_run | 0.0 | an earlier step failed |
| 5 | ui test generation | not_run | 0.0 | an earlier step failed |
| 6 | quality | not_run | 0.0 | an earlier step failed |
| 8 | s1 judge | not_run | 0.0 | an earlier step failed |
| 9 | judge | not_run | 0.0 | an earlier step failed |
| 10 | aggregation | ok | 0.0 | FAIL |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 2 test file(s) compared with the base |
| red-green freeze | ok | 6 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 6 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | failed | 1 new suppression(s), 0 declared; not checked: python only; changed files outside it: web/src/tools/GrantsPage.tsx, web/src/tools/RefCarryPanel.tsx, web/src/tools/RefMarker.tsx, web/src/tools/ServersPage.tsx, web/src/tools/ref-carry-copy.test.ts (+6 more) |
| tdd history | ok | 6 task(s); red tests passing at head: step 3 |
| python encoding | ok | 2 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | skipped | step 1 already failed |

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- e2e/test_m8_ref_carry.py (task 4.1, unfrozen by Q-001 (delegate_override, claude-fable-5-1))

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m8_ref_carry.py` |  | relevant | new test file |
| `e2e/test_m8_ref_carry_grants.py` |  | relevant | new test file |
| `openspec/changes/add-web-ref-carry/.l4/ledger/r-20261127T0637Z-36df.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/ledger/r-20261127T0851Z-5327.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/ledger/r-20261127T1106Z-2a77.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/.l4/ledger/r-20261127T1428Z-eae0.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-ref-carry/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/tools/GrantsPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/RefCarryPanel.tsx` | web | relevant | named in the spec |
| `web/src/tools/RefMarker.tsx` | web | relevant | named in the spec |
| `web/src/tools/ServersPage.tsx` | web | relevant | named in the spec |
| `web/src/tools/ref-carry-copy.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry-pages.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry-read.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry-refs.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry-view.test.ts` |  | relevant | new test file |
| `web/src/tools/ref-carry.ts` | web | relevant | named in the spec |
| `web/src/tools/ref-marker-pages.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not run.

### Tests

Tests-ran check not run.

## Criteria

None judged.

## Findings

- [major, deterministic] an inline suppression was not declared: e2e/test_m8_ref_carry.py:187 # type: ignore. Remove each comment by fixing what it hides; declare one only if it cannot be removed

## Fix unit

Fix unit 1 is created for these tasks:
- F-6eb0cc43 an inline suppression was not declared

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 carryKeys reuses one key per pair and refuses a key outside the header alphabet` (task 3.1): not in the report
- `web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 copyGrants reports a refusal reason or an error code without stopping` (task 3.1): not in the report
- `web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 copyGrants sends nothing for an unusable key and for an empty plan` (task 3.1): not in the report
- `web.src.tools.ref-carry-copy.test.ts::C-0db1d5a2 copyGrants sends one post per grant in order and reports each answer` (task 3.1): not in the report
- `web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyGrantBody returns a fresh any step body and refuses a bad ref` (task 3.1): not in the report
- `web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyPlan copies any step grants and lists node grants as update the flow first` (task 3.1): not in the report
- `web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyPlan gives empty lists without changes or grants` (task 3.1): not in the report
- `web.src.tools.ref-carry-copy.test.ts::C-b4fa2d61 copyPlan lists a changed effect whatever the grant scope` (task 3.1): not in the report
- `web.src.tools.ref-carry-pages.test.ts::C-88f41f1b the carry panel and Servers page keep every pin` (task 4.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants always passes an AbortSignal` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants reads every page with its cursor limit and signal` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants refuses a bad item and a bad page` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants rejects with the failed request error` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllGrants stops at a hundred pages and reports it incomplete` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllToolServers reads every page with its cursor limit and signal` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllToolServers refuses an unreadable item` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllToolServers rejects a 401 from the real client` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-b97e74b9 loadAllToolServers stops at a hundred pages and reports it incomplete` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-d7d00513 parseGrantRecord reads a grant with its arguments and the boundary values` (task 2.1): not in the report
- `web.src.tools.ref-carry-read.test.ts::C-d7d00513 parseGrantRecord refuses each malformed record` (task 2.1): not in the report
- `web.src.tools.ref-carry-refs.test.ts::C-568a8224 REF_MARKERS holds the superseded and waiting texts` (task 1.1): not in the report
- `web.src.tools.ref-carry-refs.test.ts::C-568a8224 refState gives null for a ref that no non-pending server lists` (task 1.1): not in the report
- `web.src.tools.ref-carry-refs.test.ts::C-568a8224 refState tells current superseded and waiting on the listing server` (task 1.1): not in the report
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 approvedEffects maps a readable surface and is empty otherwise` (task 1.1): not in the report
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 changedRefs adds an effect only from the approved effects` (task 1.1): not in the report
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 changedRefs finds the bumped tool and sorts the changes by tool name` (task 1.1): not in the report
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 changedRefs skips a first approval an added and a removed tool and a null ref` (task 1.1): not in the report
- `web.src.tools.ref-carry-refs.test.ts::C-d008fd69 refNoticeText words the changes as old to new` (task 1.1): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants never copies a grant whose effect changed` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants posts nothing when no grant names an old ref` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants reads every page then copies and reports every grant` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryGrants rejects with the read error before any post` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView gives one line per outcome then the update the flow first line` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView lists a changed effect and copies nothing for it` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView notes an incomplete read and deploys only after a created grant` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView of nothing says no grant names the old refs` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 carryView refuses outcomes that do not follow the plan copy` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 fillRefText replaces own keys once and literally` (task 3.2): not in the report
- `web.src.tools.ref-carry-view.test.ts::C-1733a357 grantLabel names the subject and the scope` (task 3.2): not in the report
- `web.src.tools.ref-marker-pages.test.ts::C-5db13202 the ref marker and the Grants page keep every pin` (task 4.2): not in the report
