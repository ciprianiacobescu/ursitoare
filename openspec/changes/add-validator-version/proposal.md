## Why

A stored `validated` version is never checked again when the validators get stricter, so it keeps running under rules it would now fail; and a node id of any length passes L1 although the run store refuses a step whose node id is over 128 characters (`RUN_DATA_INVALID`). This unit stores the validator version with each validation, refuses a non-draft version validated by an older validator at run start (refuse, not re-validate: D5, rule R5), and bounds the node id at 128 characters in L1, in references, in the grants API and in the format document.

Observable result: a `pay-once` version whose `validator_version` is NULL or 1 is refused by `POST /api/v1/flows/pay-once/versions/{hash}/test` and `.../dry-run` with 422 `OPERATION_REFUSED` `{ reason: "version_not_runnable", cause: "validation_stale" }`, no run is stored, and after one `POST .../validate` the same request is 202; a flow whose end node has a 128-character id validates and one with 129 characters fails L1 with `L1_PATTERN` and the message `node id "<its first 32 characters>…" is too long: at most 128 characters`; `POST /api/v1/grants` with a 129-character `scope.nodeId` is 400 at `body/scope/nodeId`.

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: the carry-forward "stale validation" and the node-id bound, the first stricter validator change, so U53 to U56b are written against both. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

New: `src/authoring/validate/version.ts`, `src/registry/flows/validator-version.ts`, `src/db/migrations/0275_validator_version.sql`, tests. Edited in named tasks: `src/authoring/index.ts` (export line), `src/authoring/validate/schema.ts`, `src/authoring/validate/l1.ts`, `src/authoring/format/refs.ts`, `src/registry/index.ts` (export line), `src/registry/flows/validate.ts`, `src/interpreter/types.ts` (shared with U47b: one member), `src/interpreter/start.ts`, `src/api/test-run-routes.ts` (the loader only), `src/api/grant-routes.ts`, `docs/authoring/format.md` (the node-id rule and the line-46 `match` wording), `docs/api/openapi.json` (regenerated; shared with U53 to U55). Capabilities `flow-validation`, `flow-format`, `flow-registry`, `interpreter` and `grants`: ADDED requirements only; no base requirement states what changes (design decisions 3 and 6). No API error code, interpreter error code, dependency, module edge, part, web change or new test-support file. Every non-draft version stored before 0275 is refused at run start until it is validated again (design decision 5).

## Impact

- **Scaffold:** signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`). Not scaffolded: `LoadedVersion.stale?` (`src/interpreter/types.ts`), migration `0275_validator_version.sql`, the export lines of `src/authoring/index.ts` (`VALIDATOR_VERSION`, `MAX_NODE_ID_LENGTH`) and `src/registry/index.ts` (`isValidationStale`, `validatorVersionOf`), and the edits of `validateVersion`, `registryVersionLoader`, `startRun`, `schema.ts`, `l1.ts`, `refs.ts`, `grant-routes.ts`, `format.md` and `openapi.json`.
- **Depends on:** U22 `add-flow-format-model`, U25 `add-flow-validator`, U27 `add-flow-registry`, U33 `add-interpreter-core`, U35 `add-mock-test-runs`, U49 `add-grants-model`, U51 `add-dry-runs` (all merged: names restated in `delivered-shapes.md`), and U47b `add-tool-adapters`, in plan order before this unit, because both edit `src/interpreter/types.ts` (different members: `CallAuthorization.permit` and `LoadedVersion.stale?`); no name of it is used. Plan m7 activates after m6 completes, so M0 to M6 are on main.
- **Changed:** no frozen test is edited and no requirement is MODIFIED. These hold: `src/api/test-run-loader.test.ts::C-771f9778` (a current version has no `stale` member), `test/support/flow-cases/invalid/l1-pattern-node-id.yaml` (node `Fetch-Doc` fails the old pattern, so its message stays), `src/api/grant-routes.test.ts::C-8028b9c3` (its node is `pay`), `src/registry/flows/schema.test.ts` (it never calls `validateVersion`; its own app-role `UPDATE` sets `state`, `validation` and `validated_at` and must still succeed, which the added `GRANT UPDATE (validator_version)` keeps true, so the new stamp in `validateVersion` does not reach it), `src/db/migrate.test.ts`, `src/authoring/format/doc-terms.test.ts` and `running-code-section.test.ts` (terms and the running-code section are untouched); `src/main.conventions.test.ts::C-d150bfa4` guards the regenerated OpenAPI document. The harness of U50 (`test/support/invoke-runs/harness.ts`) forces `state` and never sets `stale`.

**Interfaces given** (exact shapes in `design.md` § Interfaces)

```ts
// src/authoring/validate/version.ts (exported from src/authoring/index.ts)
export const VALIDATOR_VERSION: number;    // 2 (1: every validation stored before this change)
export const MAX_NODE_ID_LENGTH: number;   // 128
// src/registry/flows/validator-version.ts (exported from src/registry/index.ts)
export function validatorVersionOf(tx: TenantTx, ctx: TenantContext, flowId: string, hash: string): Promise<number | null>;   // null: no row, or a row stored before this change
export function isValidationStale(state: VersionState, validatorVersion: number | null): boolean;   // state !== "draft" && (v === null || v < VALIDATOR_VERSION)
// Not scaffolded: LoadedVersion gains `readonly stale?: true` (src/interpreter/types.ts; present only when stale);
//   migration 0275; the edits of validateVersion, registryVersionLoader, startRun, schema.ts, refs.ts, l1.ts, grant-routes.ts
```

**Interfaces taken:** the names of `delivered-shapes.md` (merged code of M3 to M6); from U47b only the shared file `src/interpreter/types.ts`.

Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

## Out of scope

Catalogue-change staleness (block versions are immutable and `startRun` already refuses a missing block); re-validation inside `startRun`; a backfill of old rows; refusing to publish or live-run a stale or not-ok version (U77, M11); the grants client bound and the stale text in the test-run and dry-run panels (U56); the unbounded node-id patterns of `src/grants/compile.ts`, `src/interpreter/hooks/actions.ts` and `web/src/app/features.ts` (D22); a pattern for the hook `nodes` selector (membership bounds it, design decision 8); IPv6 origins and the other hardening items the cards decline. Each later stricter validator change bumps `VALIDATOR_VERSION` in its own unit (R5).
