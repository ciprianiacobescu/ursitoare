## Why

U54's MCP client and U56c's journey need an MCP server. This loopback fake speaks the modern era (2026-07-28) and the legacy `initialize` eras (with and without `Mcp-Session-Id`), serves `FAKE_MCP_TOOLS` with their annotations, records every request and has failure and surface knobs; a contract suite checks any base URL (M8 runs it against a real server); part `55-mcp` routes `mcp.fake.test` to it through the fake egress. Split from U54 (D2).

Observable result: a modern `tools/call` of `find_vendor` for `Acme GmbH` answers `structuredContent` `{"vendor_id":"V-ACME","status":"active"}` and `requests()` records it with `toolName` `find_vendor`; `startFakeMcp({ era: "legacy", session: true })` answers `initialize` with `mcp-session-id: fake-mcp-session-1` (U54's R2); a `tools` option with an `x-mcp-header` property reaches `tools/list` verbatim (R4).

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: the fake MCP server and its e2e part, which U54 and the journey call. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- New `test/support/fake-mcp/` (`index.ts`, `server.ts`, `wire.ts`, `contract.ts`) and `test/support/e2e-stack/mcp-part.ts`, with tests; `parts/55-mcp.ts` is created in task 6.1, which also edits the `fake-mcp/` row of `test/support/README.md`.
- Capability `test-fake-mcp` (ADDED, new). Nothing in `src/`; no migration, dependency, graph edge, egress site or frozen test change.

## Impact

- **Scaffold:** Signature stubs for the interfaces given below are on the base branch (`docs/decisions/0002`). Not scaffolded: `server.ts` (internal, task 2.1), the re-export line of `index.ts` (`export * from "./contract.ts"`, task 5.1), `parts/55-mcp.ts` and the README edit. `FAKE_MCP_TOOLS` is an empty array at red.
- **Depends on:** U06 `add-e2e-stack`, U09 `add-fake-oidc`, U32 `add-crash-harness`, U45 `add-fake-egress-proxy`, U46 `add-gateway-client` (all merged; edges added to the roadmap's U54 row by the split). U47b also edits `test/support/README.md` (it appends the `adapter-kit.ts` row); this unit edits the `fake-mcp/` line: no edge.
- **Rulings** (`m7-decisions.md`): D2, D10, D21; R2, R3, R4 are U54's, made testable here (design.md § Decisions 11).
- Shapes of the delivered names above: `delivered-shapes.md` in this folder (declarations from the merged code, main@3daa5c35, checked line by line).

**Interfaces given** (the block of `design.md` § Interfaces)

```ts
// test/support/fake-mcp/index.ts
export type FakeMcpEra = "modern" | "legacy" | "dual";
export interface FakeMcpTool {
  name: string; description?: string;
  inputSchema: Record<string, unknown>; outputSchema?: Record<string, unknown>; annotations?: Record<string, unknown>;
  result(args: Record<string, unknown>): { structuredContent?: Record<string, unknown>; text: string; isError?: boolean };
}
export interface FakeMcpOptions {
  era?: FakeMcpEra;             // default "dual"
  session?: boolean;            // legacy initialize returns an Mcp-Session-Id (default false)
  path?: string;                // MCP endpoint path (default "/mcp")
  keyHeader?: string | null;    // header the fake requires, value not checked (default "authorization"); null: none
  tools?: readonly FakeMcpTool[];   // default FAKE_MCP_TOOLS
  sse?: boolean;                // answer requests as text/event-stream (default false)
  pageSize?: number;            // tools/list page size (default 50)
}
export interface FakeMcpRequest {
  seq: number; method: string; era: "modern" | "legacy" | null; host: string; path: string;
  headers: Readonly<Record<string, string>>;   // the key header's value replaced by "[credential]"
  bodySha256: string; status: number; callHeader: string | null; toolName: string | null;
}
export interface FakeMcp {
  readonly origin: string;      // http://127.0.0.1:<port>
  requests(filter?: { method?: string }): FakeMcpRequest[];
  failNext(method: string, status: number, times?: number): void;   // 400-599, default once
  setTools(tools: readonly FakeMcpTool[]): void;
  reset(): void;                // records, failures, tools back to the start options
  close(): Promise<void>;
}
export const FAKE_MCP_HOST: string;     // "mcp.fake.test"
export const FAKE_MCP_ORIGIN: string;   // "https://mcp.fake.test"
export const FAKE_MCP_TOOLS: readonly FakeMcpTool[];   // find_vendor and log_note (design.md § Decisions 12)
export function startFakeMcp(opts?: FakeMcpOptions): Promise<FakeMcp>;
// test/support/fake-mcp/contract.ts (re-exported by index.ts)
export function fakeMcpContract(baseUrl: string, opts: { host: string; path: string; key: { name: string; value: string } | null }): ContractCheck[];
// test/support/fake-mcp/wire.ts (not re-exported)
export function decodeMcpName(raw: string): string | null;   // the Mcp-Name sentinel: plain as is, "=?base64?<b64>?=" decoded, null if invalid
// test/support/e2e-stack/mcp-part.ts (parts/55-mcp.ts re-exports it as `part`)
export const mcpPart: E2eStackPart;     // name "mcp"
export function mcpApi(handles: ReadonlyMap<string, PartHandle>): { mcp: FakeMcp };   // E2eStackError when absent
```

**Interfaces taken:**

- From `add-fake-oidc`: `ContractCheck`.
- From `add-fake-egress-proxy`: `FakeEgress` (with `addUpstream`), `startFakeEgress`; `putCredential` and `VaultPutInput` (restated in `delivered-shapes.md`).
- From `add-gateway-client`: `egressApi`, `egressPart`.
- From `add-e2e-stack`: `E2eStackPart`, `PartHandle`, `PartContext`, `E2eStackError`, `discoverParts`.
- From `add-crash-harness`: `startCrashCluster`.

## Out of scope

The MCP client and adapter (U54); real servers and the suite against the real stack (M8); `x-mcp-header` mirroring (M13); sessions beyond issuing and checking an id; the 2024-11-05 transport, GET streams, session DELETE; resources and prompts; TLS.
