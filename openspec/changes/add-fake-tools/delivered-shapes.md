# Delivered shapes taken by add-fake-tools

Declarations from main@cf34c628 (`file:line`) and from the in-plan folders named. This unit takes no M5 name.

```ts
// test/support/fake-oidc/contract.ts (U09), exported by test/support/fake-oidc/index.ts
:18  export type ContractCheck = Readonly<{ name: string; run(): Promise<void> }>
// test/support/e2e-stack/part.ts (U06)
:3   export class E2eStackError extends Error { code: string; details: Readonly<Record<string, string | number | string[]>> }   // (code, message, details?)
:19  export interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void> }
:25  export type PartContext = Readonly<{ name: string; dataDir: string; engineOrigin: string; controlOrigin: string; env: Readonly<Record<string, string>>; handles: ReadonlyMap<string, PartHandle> }>
:34  export interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; beforeReset?(ctx: PartContext): Promise<void>; seed?(ctx: PartContext): Promise<void> }
// test/support/e2e-stack/discover.ts:53 (U06)
export async function discoverParts(dir?: string): Promise<E2eStackPart[]>
// test/support/catalogue/document.ts (U24)
:15  export interface CatalogueDocument { blocks: { [ref: string]: BlockDef }; ... }   // BlockDef { effect: Effect; input: JsonSchema; output: JsonSchema; ... } (src/authoring/format/catalogue.ts:5)
:151 export function readCatalogueDocument(path?: string): CatalogueDocument   // CatalogueDataError when unreadable
// test/support/catalogue/loader.ts:85 (U24)
export function loadTestCatalogue(path?: string): TestCatalogue   // TestCatalogue has blockRefs(): string[] (:15)
// test/support/crash/cluster.ts:59 (U32)
export async function startCrashCluster(parts: readonly E2eStackPart[]): Promise<{ cluster: CrashCluster; close(): Promise<void> }>   // starts each part in order, seeds them, never calls beforeReset, exposes no handles
// src/interpreter/schema.ts:5 (the Ajv pattern this unit copies; import { Ajv2020 } from "ajv/dist/2020.js")
const ajv = new Ajv2020({ allErrors: false, strict: false, validateFormats: false })
```

From `add-fake-egress-proxy` (U45) the members of `FakeEgress` are in its `proposal.md` Interfaces given. The helper the egress test uses is in its `proposal.md` Interfaces given:

```ts
// test/support/fake-egress/wire.ts (U45; not re-exported)
export interface VaultPutInput { tenantId: string; serviceId: string; authScheme: number; value: Uint8Array; headerName: string; callerActorId: string; targetUrl: string }
// test/support/fake-egress/vault-client.ts (U45; not re-exported)
export function putCredential(vaultUrl: string, who: { identity: string; token: string } | null, input: VaultPutInput): Promise<{ grpcStatus: number; grpcMessage: string; keyVersion: number | null }>;
```

From U46 (`add-gateway-client`, its Interfaces given):

```ts
// test/support/e2e-stack/egress-part.ts (U46; parts/45-egress.ts re-exports egressPart as `part`)
export const egressPart: E2eStackPart;   // name "egress"; api { fake }; beforeReset calls fake.clearRecords()
export function egressApi(handles: ReadonlyMap<string, PartHandle>): { fake: FakeEgress };   // E2eStackError when absent
```

## Facts from the merged code

- No frozen test pins the part count or the last part (`web-part.test.ts:43-66` pins the first two names). `oidc-part.ts:102-113` and `database-part.ts:61-69` are the accessor pattern `toolsApi` follows.
- `test/support/README.md:22` is the `fake-tools/` row; `:27` says "Bootstrap placeholders exist for `global-setup.ts` and `e2e-stack/main.ts`; their owner changes replace them.", stale: both files are real.
- `package.json` lists `ajv` 8.20.0; `tsconfig.json` has `erasableSyntaxOnly`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`; `test/arch/sources.ts` reads only `src/`, so `test/` may use `node:http`.
