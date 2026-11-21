# Delivered shapes taken by add-fake-mcp

Declarations from the merged code, main@3daa5c35, checked line by line (`file:line`). This unit takes no name from another M7 unit.

```ts
// test/support/fake-oidc/contract.ts:18 (U09), re-exported as a type by fake-oidc/index.ts:8
export type ContractCheck = Readonly<{ name: string; run(): Promise<void> }>
// test/support/e2e-stack/part.ts (U06)
:3   export class E2eStackError extends Error { code: string; details: Readonly<Record<string, string | number | string[]>> }
:19  export interface PartHandle { readonly env: Readonly<Record<string, string>>; readonly api?: unknown; close(): Promise<void> }
:25  export type PartContext = Readonly<{ name: string; dataDir: string; engineOrigin: string; controlOrigin: string; env: Readonly<Record<string, string>>; handles: ReadonlyMap<string, PartHandle> }>
:34  export interface E2eStackPart { name: string; start(ctx: PartContext): Promise<PartHandle>; beforeReset?(ctx: PartContext): Promise<void>; seed?(ctx: PartContext): Promise<void> }
// test/support/e2e-stack/discover.ts:53 (U06)
export async function discoverParts(dir?: string): Promise<E2eStackPart[]>
// test/support/e2e-stack/egress-part.ts (U46)
:71  export const egressPart: E2eStackPart   // name "egress"; api { fake }
:77  export function egressApi(handles: ReadonlyMap<string, PartHandle>): { fake: FakeEgress }   // throws E2eStackError when absent
// test/support/fake-egress/index.ts (U45)
:68  export interface FakeEgress { brokerUrl; proxyUrl; vaultUrl; brokerServiceToken; vaultAdmin; addUpstream(host: string, origin: string): void; requests(): ForwardedRequest[]; clearRecords(): void; close(): Promise<void>; ... }
:119 export async function startFakeEgress(opts?: FakeEgressOptions): Promise<FakeEgress>
// test/support/fake-egress/vault-client.ts:58 (U45; not re-exported; VaultPutInput is wire.ts:3)
export async function putCredential(vaultUrl: string, who: { identity: string; token: string } | null, input: VaultPutInput): Promise<{ grpcStatus: number; grpcMessage: string; keyVersion: number | null }>
// test/support/crash/cluster.ts:59 (U32)
export async function startCrashCluster(parts: readonly E2eStackPart[]): Promise<{ cluster: CrashCluster; close(): Promise<void> }>
```

## Facts from the merged code

- `addUpstream` takes a host `<label>.fake.test` and a loopback http origin (`fake-egress/index.ts:196-203`). The proxy sends `/<service id><path>` to the upstream of the credential's `target_url` host with `Host` set to it (`proxy.ts:112-126`, `:185`), drops the caller's `authorization`, sets `authorization: Bearer <value>` (`authScheme` 3; 1 sets the named header), recorded `[credential]` (`:189-191`); other headers, the body and the response headers pass unchanged (`:266-283`); no credential is 502 `bad gateway: vault error\n` (`:179-181`).
- `egressPart.beforeReset` only calls `clearRecords()` (`egress-part.ts:66-68`), which keeps the upstream table (`fake-egress/index.ts:219-223`). `/reset` runs `beforeReset` last part first, then every `seed` (`reset.ts:42-57`, `:76-82`); `STACK_ENV_CONFLICT` on a duplicate env key (`stack.ts:260`, `crash/cluster.ts:124`). `discoverParts` loads `<NN>-<name>.ts` in file-name order (`discover.ts:53-96`); main names `database, web, oidc, tenant-b, rbac, catalogue, durable, egress, tools, tool-servers` (ran).
- `test/support/README.md:28` is `` | `fake-mcp/` | `add-mcp-client` | An MCP server for the tool adapter tests | ``; `test/support/readme.test.ts` pins only the `fake-tools/` row (grep of `fake-mcp` outside the archive: `README.md`, `docs/testing.md:30`, `docs/roadmap.md:226`, no test).
