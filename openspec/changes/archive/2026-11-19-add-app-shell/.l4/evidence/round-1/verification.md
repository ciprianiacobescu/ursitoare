# Verification: openspec:add-app-shell: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `c2129af737f8ba6b447d66d3a592f7e9089b9f2d`
- Head: `4644d735c0435082caf18a01b4fba8c4fa05b37c`
- Implementer profiles: claude-sonnet
- Judge: nemotron-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.7 | base main@c2129af737 contained |
| 1 | integrity | ok | 404.3 | 11 sub-checks; scope: 17 changed file(s) |
| 2 | build | ok | 49.6 |  |
| 3 | tests | failed | 548.1 | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium]; test_m6b_shell::test_sign_in_and_not_found_render_as_centred_card... |
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
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261119T1103Z-0896/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261119T1103Z-0896/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261119T1103Z-0896/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261119T1103Z-0896/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261119T1103Z-0896/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261119T1103Z-0896/009-test.log |
| e2e | fail | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261119T1103Z-0896/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/app/App.tsx, web/src/app/Shell.tsx, web/src/app/nav-group-map.test.ts, web/src/app/nav-groups.test.ts, web/src/app/nav-groups.ts (+7 more) |
| tdd history | ok | 7 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 2543 of 2543 base tests pass on the unit's code with its 8 test and support files at the base (base: not needed) |

## Evidence

### Needs attention

- blocker: new tests failed: test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium]

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m6b_shell.py` |  | relevant | new test file |
| `openspec/changes/add-app-shell/.l4/ledger/r-20261119T0832Z-886c.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-app-shell/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `web/src/app/App.tsx` | web | relevant | named in the spec |
| `web/src/app/Shell.tsx` | web | relevant | named in the spec |
| `web/src/app/nav-group-map.test.ts` |  | relevant | new test file |
| `web/src/app/nav-groups.test.ts` |  | relevant | new test file |
| `web/src/app/nav-groups.ts` | web | relevant | named in the spec |
| `web/src/app/nav-placement.test.ts` |  | relevant | new test file |
| `web/src/app/shell-css.test.ts` |  | relevant | new test file |
| `web/src/app/shell-layout.test.ts` |  | relevant | new test file |
| `web/src/app/shell-sources.test.ts` |  | relevant | new test file |
| `web/src/app/shell.css` | web | relevant | named in the spec |
| `web/src/auth/AccountMenu.tsx` | web | relevant | named in the spec |
| `web/src/auth/SignInPage.tsx` | web | relevant | named in the spec |
| `web/src/auth/auth-sources.test.ts` |  | relevant | new test file |
| `web/src/auth/auth.css` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/app/App.tsx, web/src/app/Shell.tsx, web/src/app/nav-groups.ts, web/src/auth/AccountMenu.tsx, web/src/auth/SignInPage.tsx

### Tests

2639 of 2640 passed, 1 failed, 0 errored, 0 skipped.
22 of 23 new tests passed.

## Criteria

None judged.

## Findings

- [blocker, deterministic] e2e gate failed: `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` failed: exit code 1; failing: test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium] Log: `.l4-out/gates/r-20261119T1103Z-0896/010-e2e.log`.
- [blocker, deterministic] new tests failed: test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium]

## Fix unit

Fix unit 1 is created for these tasks:
- F-22a9abae, F-7e9a81fb e2e gate failed (+1 more)

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.app.nav-group-map.test.ts::C-e722bbf4 the group labels are fixed` (task 1.1): passed
- `web.src.app.nav-group-map.test.ts::C-e722bbf4 the map holds exactly the ten navigation ids with their groups` (task 1.1): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G1 carol's ten entries form three groups` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G2 and G3 leave out empty groups` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G5 an unknown id goes to more after build` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G6 prototype-style ids go to more` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G7 frozen input passes through unchanged` (task 1.2): passed
- `web.src.app.nav-groups.test.ts::C-4ef0679b G8 and G9 keep input order inside a group` (task 1.2): passed
- `web.src.app.nav-placement.test.ts::C-20b4a37d navPlacement follows the session state` (task 1.4): passed
- `web.src.app.shell-css.test.ts::C-9eeb9987 auth.css is a 24rem card that truncates` (task 2.1): passed
- `web.src.app.shell-css.test.ts::C-9eeb9987 both stylesheets hold no raw colour and only kit tokens` (task 2.1): passed
- `web.src.app.shell-css.test.ts::C-9eeb9987 shell.css holds a light scheme and script focus draws no frame` (task 2.1): passed
- `web.src.app.shell-layout.test.ts::C-b054e7d6 shellLayout is a sidebar from 1024 px and collapsed below` (task 1.3): passed
- `web.src.app.shell-sources.test.ts::C-ffb190b2 the shell source holds the landmark, group and menu markup` (task 4.1): passed
- `web.src.auth.auth-sources.test.ts::C-2159a890 the account, sign-in and not-found sources use the shared Button` (task 3.1): passed
