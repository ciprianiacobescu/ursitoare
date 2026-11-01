# Verification: openspec:add-block-registry: PASS (round 1)

traceability: 13/13 criteria covered by a discriminating test

- Base: `079567d24600b8929689d8cbb8bac0228567880c`
- Head: `181bb5499fb70b6cce00a0818a421114edb0b98f`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: beam-judge, 3 call(s), prompt sha256 `76b0eed0205489b77b55a86da7154e89616a103ae308550de81af7cb6dcd6d7e`
- Judge replies of beam-judge (this unit, all rounds): valid 1, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): beam-judge reflection (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@079567d246 as 181bb5499f (2 commits) |
| 1 | integrity | ok | 92.9 | 11 sub-checks; scope: 21 changed file(s) |
| 2 | build | ok | 23.1 |  |
| 3 | tests | ok | 118.4 |  |
| 4 | traceability | ok | 0.1 | 13/13 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/api/block-routes.ts, src/api/index.ts, src/main.ts, src/registry/block-input.ts, src/registry/block-store.ts and 2 more |
| 8 | s1 judge | ok | 1.1 | 11/13 criteria judged by jev; the state does not fit 450 tokens even without the excerpt |
| 9 | judge | ok | 335.6 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261101T1544Z-a2a6/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261101T1544Z-a2a6/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261101T1544Z-a2a6/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261101T1544Z-a2a6/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261101T1544Z-a2a6/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261101T1544Z-a2a6/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261101T1544Z-a2a6/010-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no test file changed |
| red-green freeze | ok | 8 task(s): red and green compared |
| test path freeze | ok | 8 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/block-routes.test.ts, src/api/block-routes.ts, src/api/index.ts, src/main.blocks.test.ts, src/main.ts (+10 more) |
| tdd history | ok | 8 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1248 of 1248 base tests pass on the unit's code with its 8 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-ab2d00df | registry-blocks › Block versions are stored per tenant and can only be added › Objects, checks, privileges and two tenants | covered | src.registry.schema.test.ts::C-ab2d00df migration 0260 stores immutable block versions per tenant (passed, red_assertion) | - | 0.90 |
| C-43294732 | registry-blocks › A block is checked and normalised before it is stored › A block is normalised and hashed | covered | src.registry.block-input.test.ts::C-43294732 A block is normalised and hashed (passed, red_assertion) | - | 0.89 |
| C-180a7986 | registry-blocks › A block is checked and normalised before it is stored › Bad blocks are refused | covered | src.registry.block-input.test.ts::C-180a7986 Bad block fields are refused in order (passed, red_assertion); src.registry.block-input.test.ts::C-180a7986 Bad refs and non-object blocks are refused (passed, red_assertion); src.registry.block-input.test.ts::C-180a7986 Invalid input and output schemas a... | - | - |
| C-c82d0207 | registry-blocks › importCatalogue adds immutable block versions and audits each › An import adds versions and one event each | covered | src.registry.import.test.ts::C-c82d0207 an import adds versions and one event each (passed, red_assertion) | - | 0.90 |
| C-fc62e0a1 | registry-blocks › importCatalogue adds immutable block versions and audits each › A repeat changes nothing and a changed definition is refused | covered | src.registry.import.test.ts::C-fc62e0a1 a repeat changes nothing and a changed definition is refused (passed, red_assertion) | - | 0.93 |
| C-3657b7b4 | registry-blocks › importCatalogue adds immutable block versions and audits each › Parallel imports and a failing audit | covered | src.registry.import.test.ts::C-3657b7b4 parallel imports and a failing audit (passed, red_assertion) | - | 0.95 |
| C-d907c4d9 | registry-blocks › Stored versions are read by ref or by page › Get, list and the tenant guard | covered | src.registry.block-read.test.ts::C-d907c4d9 a stored version is read back in normalised form (passed, red_assertion); src.registry.block-read.test.ts::C-d907c4d9 each tenant reads its own versions and a mismatched context is refused (passed, red_assertion); src.registry.block-read.test.ts::C-d907c4d... | - | - |
| C-94cec17b | registry-blocks › RegistryCatalogue answers the Catalogue interface from a snapshot › Lookups answer exactly | covered | src.registry.catalogue.test.ts::C-94cec17b a returned definition is a copy and the other lookups are undefined (passed, red_assertion); src.registry.catalogue.test.ts::C-94cec17b block and role answer from the snapshot by exact key (passed, red_assertion) | - | 0.94 |
| C-845617bb | registry-blocks › RegistryCatalogue answers the Catalogue interface from a snapshot › A load reads one tenant and stays fixed | covered | src.registry.catalogue.test.ts::C-845617bb a load reads one tenant's blocks and roles (passed, red_assertion); src.registry.catalogue.test.ts::C-845617bb a loaded catalogue stays fixed and a new tenant has no blocks (passed, red_assertion) | - | 0.89 |
| C-69798f82 | registry-blocks › GET /api/v1/blocks lists the tenant's blocks a page at a time › A page of blocks and the walk | covered | src.api.block-routes.test.ts::C-69798f82 alice walks her blocks two at a time (passed, red_assertion); src.api.block-routes.test.ts::C-69798f82 each tenant sees only its own blocks (passed, red_assertion) | - | 0.93 |
| C-8c4615c5 | registry-blocks › GET /api/v1/blocks lists the tenant's blocks a page at a time › Refusals of the list | covered | src.api.block-routes.test.ts::C-8c4615c5 a keyless server refuses a cursor or a further page (passed, red_assertion); src.api.block-routes.test.ts::C-8c4615c5 a request without a session or a permit is refused (passed, red_assertion); src.api.block-routes.test.ts::C-8c4615c5 bad queries and bad curs... | - | 0.91 |
| C-d0096357 | registry-blocks › Reading the registry needs the read_registry action › Who may read | covered | src.registry.policy.test.ts::C-d0096357 the default sources hold exactly three registry permits (passed, red_assertion); src.registry.policy.test.ts::C-d0096357 who may read the registry (passed, red_assertion) | - | 0.93 |
| C-5490622f | registry-blocks › The engine serves the route and documents it › The real engine serves and documents the list | covered | src.main.blocks.test.ts::C-5490622f the real engine serves and documents the block list (passed, red_assertion) | - | 0.91 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/api/openapi.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-block-registry/.l4/ledger/r-20261101T1334Z-29ab.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-block-registry/.l4/ledger/r-20261101T1542Z-69be.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-block-registry/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/block-routes.test.ts` |  | relevant | new test file |
| `src/api/block-routes.ts` | api | relevant | named in the spec |
| `src/api/index.ts` | api | relevant | named in the spec |
| `src/db/migrations/0260_block_registry.sql` | db | relevant | named in the spec |
| `src/main.blocks.test.ts` |  | relevant | new test file |
| `src/main.ts` | main | relevant | named in the spec |
| `src/registry/block-input.test.ts` |  | relevant | new test file |
| `src/registry/block-input.ts` | registry | relevant | named in the spec |
| `src/registry/block-read.test.ts` |  | relevant | new test file |
| `src/registry/block-store.ts` | registry | relevant | named in the spec |
| `src/registry/catalogue.test.ts` |  | relevant | new test file |
| `src/registry/catalogue.ts` | registry | relevant | named in the spec |
| `src/registry/errors.ts` | registry | relevant | named in the spec |
| `src/registry/import.test.ts` |  | relevant | new test file |
| `src/registry/policy.test.ts` |  | relevant | new test file |
| `src/registry/policy/blocks.cedar` | registry | relevant | named in the spec |
| `src/registry/schema.test.ts` |  | relevant | new test file |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/block-routes.ts, src/api/index.ts, src/main.ts, src/registry/block-input.ts, src/registry/block-store.ts and 2 more

### Tests

1328 of 1328 passed, 0 failed, 0 errored, 0 skipped.
27 of 27 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-ab2d00df | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-43294732 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-180a7986 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-c82d0207 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fc62e0a1 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3657b7b4 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d907c4d9 | unavailable | - | - | jev | the state does not fit 450 tokens even without the excerpt |
| C-94cec17b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-845617bb | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69798f82 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8c4615c5 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d0096357 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5490622f | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-ab2d00df | registry-blocks › Block versions are stored per tenant and can only be added › Objects, checks, privileges and two tenants | pass | pass | the judge passed it and a discriminating test passes |
| C-43294732 | registry-blocks › A block is checked and normalised before it is stored › A block is normalised and hashed | pass | pass | the judge passed it and a discriminating test passes |
| C-180a7986 | registry-blocks › A block is checked and normalised before it is stored › Bad blocks are refused | pass | pass | the judge passed it and a discriminating test passes |
| C-c82d0207 | registry-blocks › importCatalogue adds immutable block versions and audits each › An import adds versions and one event each | pass | pass | the judge passed it and a discriminating test passes |
| C-fc62e0a1 | registry-blocks › importCatalogue adds immutable block versions and audits each › A repeat changes nothing and a changed definition is refused | pass | pass | the judge passed it and a discriminating test passes |
| C-3657b7b4 | registry-blocks › importCatalogue adds immutable block versions and audits each › Parallel imports and a failing audit | pass | pass | the judge passed it and a discriminating test passes |
| C-d907c4d9 | registry-blocks › Stored versions are read by ref or by page › Get, list and the tenant guard | pass | pass | the judge passed it and a discriminating test passes |
| C-94cec17b | registry-blocks › RegistryCatalogue answers the Catalogue interface from a snapshot › Lookups answer exactly | pass | pass | the judge passed it and a discriminating test passes |
| C-845617bb | registry-blocks › RegistryCatalogue answers the Catalogue interface from a snapshot › A load reads one tenant and stays fixed | pass | pass | the judge passed it and a discriminating test passes |
| C-69798f82 | registry-blocks › GET /api/v1/blocks lists the tenant's blocks a page at a time › A page of blocks and the walk | pass | pass | the judge passed it and a discriminating test passes |
| C-8c4615c5 | registry-blocks › GET /api/v1/blocks lists the tenant's blocks a page at a time › Refusals of the list | pass | pass | the judge passed it and a discriminating test passes |
| C-d0096357 | registry-blocks › Reading the registry needs the read_registry action › Who may read | pass | pass | the judge passed it and a discriminating test passes |
| C-5490622f | registry-blocks › The engine serves the route and documents it › The real engine serves and documents the list | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] registryCatalogue keeps the last of duplicate block refs (spec gap) (criterion C-94cec17b): registryCatalogue builds its Map from blocks.map(...), so two BlockVersion entries with the same ref silently collapse to the later one; no scenario pins this input.
- [minor, judge] registryCatalogue deduplicates role names (spec gap) (criterion C-94cec17b): Roles are stored in a Set, so duplicate role strings collapse; no scenario pins this input.
- [minor, judge] registryCatalogue preserves insertion order of block refs (spec gap) (criterion C-94cec17b): blockRefs() returns Map insertion order, so an unsorted input array yields an unsorted ref list; no scenario pins input order.
- [minor, judge] importCatalogue accepts null-prototype blocks objects (spec gap) (criterion C-180a7986): The plain-object check accepts both Object.prototype and null prototypes, so a null-prototype object is imported rather than rejected; no scenario pins this input.
- [minor, judge] importCatalogue skips actor validation for an empty import (spec gap) (criterion C-180a7986): An empty blocks map returns before appendAudit, so an invalid actor resolves successfully instead of throwing AUDIT_EVENT_INVALID; no scenario pins this combination.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.block-routes.test.ts::C-69798f82 alice walks her blocks two at a time` (task 7.1): passed
- `src.api.block-routes.test.ts::C-69798f82 each tenant sees only its own blocks` (task 7.1): passed
- `src.api.block-routes.test.ts::C-8c4615c5 a keyless server refuses a cursor or a further page` (task 7.1): passed
- `src.api.block-routes.test.ts::C-8c4615c5 a request without a session or a permit is refused` (task 7.1): passed
- `src.api.block-routes.test.ts::C-8c4615c5 bad queries and bad cursors are refused` (task 7.1): passed
- `src.main.blocks.test.ts::C-5490622f the real engine serves and documents the block list` (task 8.1): passed
- `src.registry.block-input.test.ts::C-180a7986 Bad block fields are refused in order` (task 2.1): passed
- `src.registry.block-input.test.ts::C-180a7986 Bad refs and non-object blocks are refused` (task 2.1): passed
- `src.registry.block-input.test.ts::C-180a7986 Invalid input and output schemas are refused` (task 2.1): passed
- `src.registry.block-input.test.ts::C-43294732 A block is normalised and hashed` (task 2.1): passed
- `src.registry.block-read.test.ts::C-d907c4d9 a stored version is read back in normalised form` (task 3.1): passed
- `src.registry.block-read.test.ts::C-d907c4d9 each tenant reads its own versions and a mismatched context is refused` (task 3.1): passed
- `src.registry.block-read.test.ts::C-d907c4d9 listing refuses a bad limit or an empty after` (task 3.1): passed
- `src.registry.block-read.test.ts::C-d907c4d9 versions are listed in ref order a page at a time` (task 3.1): passed
- `src.registry.catalogue.test.ts::C-845617bb a load reads one tenant's blocks and roles` (task 5.1): passed
- `src.registry.catalogue.test.ts::C-845617bb a loaded catalogue stays fixed and a new tenant has no blocks` (task 5.1): passed
- `src.registry.catalogue.test.ts::C-94cec17b a returned definition is a copy and the other lookups are undefined` (task 5.1): passed
- `src.registry.catalogue.test.ts::C-94cec17b block and role answer from the snapshot by exact key` (task 5.1): passed
- `src.registry.import.test.ts::C-180a7986 an invalid actor leaves no row` (task 4.1): passed
- `src.registry.import.test.ts::C-180a7986 importCatalogue refuses a bad ref without writing` (task 4.1): passed
- `src.registry.import.test.ts::C-180a7986 importCatalogue refuses a malformed or oversized map` (task 4.1): passed
- `src.registry.import.test.ts::C-3657b7b4 parallel imports and a failing audit` (task 4.1): passed
- `src.registry.import.test.ts::C-c82d0207 an import adds versions and one event each` (task 4.1): passed
- `src.registry.import.test.ts::C-fc62e0a1 a repeat changes nothing and a changed definition is refused` (task 4.1): passed
- `src.registry.policy.test.ts::C-d0096357 the default sources hold exactly three registry permits` (task 6.1): passed
- `src.registry.policy.test.ts::C-d0096357 who may read the registry` (task 6.1): passed
- `src.registry.schema.test.ts::C-ab2d00df migration 0260 stores immutable block versions per tenant` (task 1.1): passed
