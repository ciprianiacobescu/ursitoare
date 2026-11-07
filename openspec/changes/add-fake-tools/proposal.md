## Why

U47, U48, U50, U51 and the M6 journey need tools to reach: the 20 catalogue blocks as loopback HTTP handlers that the fake egress forwards to under `tools.fake.test`, with recorded calls, idempotent effects, per-block delay and failure, and a reset. This unit ports the handlers of the seed's `mock-tools` and drops its process, files and control routes.

Observable result: `await startFakeTools()` returns `{ origin }`; `POST {origin}/blocks/erp.lookup_vendor@1` with `{"vendor_name":"Acme GmbH"}` answers 200 `{"vendor_id":"V-ACME","status":"active","payment_terms_days":30}` and `calls()` holds one `FakeToolCall`; `mail.send@1` replays its first output with `duplicate: true` on a repeated `Idempotency-Key`; through a fake egress routed with `addUpstream(FAKE_TOOLS_HOST, tools.origin)` a credentialed call reaches the handler with `host` `tools.fake.test` and `keyHeaderSeen: true`.

Batch `m6-grants` (U40b, U45, U46, U45b, U47, U48, U49, U49b, U50, U51, U52, U52b in plan order; closing unit `add-web-dry-runs`, journey `e2e/test_m6_grants.py`) delivers M6: admins register tool servers and grant tools per role and step; an attended dry run reads through the broker with a one-step token and shows each effect's permit while stubbing it. This unit's part: the 20 catalogue blocks as loopback tool handlers behind the fake egress, with the part that wires them into the e2e stack. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New `test/support/fake-tools/` (`index.ts`, `fixtures.ts`, `contract.ts`) and `test/support/e2e-stack/tools-part.ts`, with tests; the discovered file `test/support/e2e-stack/parts/50-tools.ts` is created in the task that makes the part real.
- Edited in task 5.1: `test/support/README.md` (the `fake-tools/` row and the stale sentence about bootstrap placeholders, roadmap conflict 17).
- Capability `test-fake-tools` (ADDED, new). Nothing in `src/`; no migration, API code, dependency (ajv is one already), module-graph edge or frozen test change.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (scaffold, `docs/decisions/0002`); this change implements them. Not scaffolded: the re-export line of `index.ts` (`export * from "./contract.ts"`, task 4.1), the discovered file `parts/50-tools.ts` and the README edit.
- **Depends on:** (evidence = the names under Interfaces taken) U06 `add-e2e-stack`, U09 `add-fake-oidc`, U24 `add-test-catalogue`, U32 `add-crash-harness`, U45 `add-fake-egress-proxy`, U46 `add-gateway-client`. Edges added to the roadmap's row: U09 (`ContractCheck`) and U32 (the crash cluster).
- **Seeds** (`seed/shared/mocks/mock-tools.mjs`, `lib/fixtures.mjs`, `lib/common.mjs`) are restated inline in `design.md` § Fixtures.
- **Rulings** (`m6-decisions.md`): D24 (no module-graph edge), conflict 17 (the README sentence).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@cf34c628, and from the M5 folders named, checked line by line).

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// test/support/fake-tools/index.ts
export const FAKE_TOOLS_HOST: string;        // "tools.fake.test"
export const FAKE_TOOLS_ORIGIN: string;      // "https://tools.fake.test"
export const FAKE_TOOLS_KEY_HEADER: string;  // "x-fake-tools-key": the header a provisioned API_KEY_HEADER credential uses
export function fakeToolPath(ref: string): string;   // `/blocks/${ref}`, e.g. "/blocks/erp.lookup_vendor@1"
export interface FakeToolCall {
  seq: number; ref: string; effect: "read" | "write" | "send" | "pay"; method: string; path: string; host: string;
  callHeader: string | null; idempotencyKey: string | null; keyHeaderSeen: boolean;   // never the key's value
  input: unknown; bodySha256: string; status: number; duplicate: boolean;
}
export interface FakeToolsOptions { strict?: boolean; catalogue?: string }   // strict (default true): inputs checked against the block schema; catalogue: the path given to readCatalogueDocument (default: the checked-in catalogue)
export interface FakeTools {
  readonly origin: string;                               // http://127.0.0.1:<port>
  calls(filter?: { ref?: string; callHeader?: string }): FakeToolCall[];
  setDelay(ref: string, ms: number): void;              // 0-30000
  failNext(ref: string, status: number, times?: number): void;   // 400-599, default once
  reset(): void;                                        // calls, delays, failures and the idempotency memory
  close(): Promise<void>;
}
export function startFakeTools(opts?: FakeToolsOptions): Promise<FakeTools>;
// test/support/fake-tools/contract.ts (re-exported by index.ts)
export function fakeToolsContract(baseUrl: string, opts: { host: string }): ContractCheck[];
// test/support/e2e-stack/tools-part.ts (parts/50-tools.ts re-exports it as `part`)
export const toolsPart: E2eStackPart;     // name "tools"
export function toolsApi(handles: ReadonlyMap<string, PartHandle>): { tools: FakeTools };
// test/support/fake-tools/fixtures.ts (not re-exported; task 1.1's test imports it)
export const FIXTURE_REFS: readonly string[];   // the 20 refs, in catalogue order
export function digestHex(value: unknown, length: number): string;   // h(value, length)
export function lookupVendor(name: unknown): { vendor_id: string; name: string; status: "active" | "blocked"; payment_terms_days: number };
export type FixtureResult = { status: 200; output: unknown } | { status: 404; body: unknown };
export function fixtureFor(ref: string, input: Record<string, unknown>, key: string): FixtureResult;   // RangeError for a ref that is not an own fixture
```

**Interfaces taken:**

- From `add-fake-egress-proxy`: `FakeEgress` (with `addUpstream`), `startFakeEgress`.
- Also used: the vault-write helper `putCredential` of U45's `vault-client.ts` (in U45's Interfaces given, with `VaultPutInput`; restated in `delivered-shapes.md`).
- From `add-gateway-client`: `egressApi`, `egressPart`.
- From `add-e2e-stack`: `E2eStackPart`, `PartHandle`, `PartContext`, `E2eStackError`, `discoverParts`.
- From `add-fake-oidc`: `ContractCheck`.
- From `add-test-catalogue`: `readCatalogueDocument`, `loadTestCatalogue`, `TEST_CATALOGUE_PATH`, `CatalogueDataError`.
- From `add-crash-harness`: `startCrashCluster`.

## Out of scope

The gateway, the tool registry and the credential store (U46 to U48); real tool servers, MCP and HTTP/OpenAPI adapters (M7); TLS; HTTP control routes and files (replaced by the JS API); running the contract suite against the real stack (no real tool server exists there); the e2e part `52-tool-servers` (U48, which also extends the part-order assertion P3 when it adds that file) and `45-egress` (U46).
