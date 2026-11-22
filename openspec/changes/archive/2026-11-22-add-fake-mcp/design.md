## Context

U54's client and U56c's journey need an MCP server. This loopback fake speaks 2026-07-28 and the older `initialize` eras, records every request, has failure and surface knobs, a contract suite for any base URL (M8 runs it against a real server) and part `55-mcp`. U54 owns R2, R3, R4 of `m7-decisions.md`; the fake only makes them testable (§ 11).

## Protocol facts

Fetched 2026-11-13 (TinyFish `fetch_content`); the rest is UNVERIFIED.

- **Streamable HTTP 2026-07-28** (`/specification/2026-07-28/basic/transports/streamable-http`): a notification gets 202 with no body; `MCP-Protocol-Version` MUST equal `_meta["io.modelcontextprotocol/protocolVersion"]`, `Mcp-Method` is on all requests and `Mcp-Name` on `tools/call`, else 400 `-32020`; a `=?base64?...?=` value MUST be decoded before comparing; an unimplemented method is 404 `-32601`; a recognised modern error body means a modern server, an empty or other body legacy; a modern-only server SHOULD answer legacy GET or DELETE 405 and ignore `Mcp-Session-Id`.
- **Versioning** (`.../basic/versioning`): an unsupported version is 400 `-32022` with `data: { supported, requested }`; a modern-only server SHOULD name its versions in its error to `initialize`.
- **Tools** (`.../server/tools`): `tools/list` answers `{ resultType, tools, nextCursor?, ttlMs, cacheScope }`; `tools/call` `{ resultType, content, structuredContent?, isError? }`; an unknown tool is JSON-RPC `-32602`.
- **Legacy 2025-11-25** (`/specification/2025-11-25/basic/transports`): a server MAY return `MCP-Session-Id` on the initialize answer; one that needs it SHOULD answer a later request without it 400, an unknown session 404; later requests carry `MCP-Protocol-Version`.
- **UNVERIFIED (the fake chooses; a real server may differ):** `ttlMs` and `cacheScope` on `server/discover` (the card gives them; the fetched page does not); HTTP 200 for `-32602` and every legacy JSON-RPC error; `-32020` for a non-modern message on a modern-only server (inferred from the matrix); `-32700`, `-32600` for bad bodies and for a missing legacy version or session header; the SSE `notifications/progress` content; that a legacy server with no session answers `tools/call` without a prior `initialize` (the lifecycle says `initialize` MUST be first; the fake accepts it because U54's D11 relies on it, so a green U54 test proves nothing about real servers: M8 stack run); that the real Mintkey proxy passes `Accept`, `Mcp-*` and SSE bodies (only the fake egress is proven).

## Decisions

1. **Layout.** `index.ts`: constants, types, `FAKE_MCP_TOOLS`, `startFakeMcp` (the options are checked before it listens) and the re-export of `contract.ts`; `server.ts`: the pipeline; `wire.ts`: `decodeMcpName`; `contract.ts`: the suite (the card put `fakeMcpContract` in `index.ts`; as in `fake-tools` it is declared in `contract.ts` so a red test imports it from the declaring file; callers import it from `index.ts`); `mcp-part.ts`: the part, re-exported by `parts/55-mcp.ts`.
2. **Pipeline.** The body is read to its end (no size limit) and parsed once; a message is a JSON object with a string `method`; every request is recorded from that parse. The first failing check answers: `Host` 421, path 404, method 405, key 401, a pending `failNext`, an unparsable body 400 `-32700`, a non-message 400 `-32600`, then the era pipelines. Only "the key check follows the first three" is pinned. The record is appended just before the answer.
3. **Modern** (a string `_meta` protocolVersion): era `legacy` answers 400 with an empty body (not a recognised modern error); else the spec's checks in order, messages in `test-plan.md` § Modern refusal rows; `_meta` `2025-11-25` is `-32022` too. The fake validates no `Mcp-Param-*` header against `x-mcp-header` (U54 leaves such tools out; carry-forward M13) and does not check `Accept`; the recorded headers let U54 assert what its client sent.
4. **Results.** `ttlMs` 60000, `cacheScope` `private`. A cursor is `page-<offset>` (`^page-(0|[1-9][0-9]*)$`), valid below the tool count; `nextCursor` appears while more tools follow. A list entry is `name` plus the tool's other members when present, as given. `tools/call` runs `tool.result(arguments ?? {})`; errors: `Unknown tool: <name>`, `Invalid params: arguments must be an object`.
5. **Legacy** (no string `_meta` protocolVersion). Era `modern` answers it 400 `-32020` `This server speaks MCP 2026-07-28 only (no initialize handshake); supported versions: 2026-07-28`; a bad legacy version header is 400 `-32600 Missing or unsupported MCP-Protocol-Version header`; unknown methods are 200 `-32601`. No `initialize` is needed first (UNVERIFIED above).
6. **Session.** `n` counts initializes since the start or the last `reset()`; both refusals are `-32600`, messages `Missing Mcp-Session-Id header` (400) and `Unknown session` (404).
7. **Records.** `era` follows the body rule of § 3 and 5, whatever the server's era. The key header, `authorization`, `cookie` and `proxy-authorization` are recorded `[credential]` and `mcp-session-id` `[session]`: the card names only the key header, the rest is added so no secret and no session id is ever recorded (rule 8). `requests()` returns `structuredClone` copies in `seq` order.
8. **Knobs.** `failNext` accepts any non-empty method (one the fake never receives never fires); its body is not a JSON-RPC error, so a client sees a 400 as a legacy sign. `setTools` checks names are unique and non-empty, no grammar, so a client can be tested against hostile names. `close()` is memoised.
9. **Contract suite.** Sent with `node:http`; each failure is an `assert.AssertionError` starting `<name>:`. A modern-only target cannot pass the eighth check; the caller drops it by filtering on its name (the seam has no option for it). `key: null` leaves out `a missing key is refused` (none vacuous).
10. **Part.** `start` resolves `egressApi` first (it throws when egress is absent, so no listener is open yet), starts the fake (era `dual`), calls `addUpstream(FAKE_MCP_HOST, mcp.origin)` (closing the fake if it throws) and returns `{ env: {}, api: { mcp }, close }`. **What a reset does** (a fake's in-memory state survives `/reset` unless its part clears it): `beforeReset` calls `mcp.reset()`, so records, failures, `setTools` changes and session counters go; the listener, the start options, the upstream registration on the fake egress (its `beforeReset` only clears records) and the credential in the fake vault (kept across resets, M6 D22) stay. No `seed`: nothing to re-establish. `env` is `{}`, so `STACK_ENV_CONFLICT` cannot arise; the crash harness starts `mcp` after `egress` with no engine.
11. **Fixtures for U54 and U56b**, all through the options:

| Need | How |
|---|---|
| R2: legacy server issuing `Mcp-Session-Id` | `startFakeMcp({ era: "legacy", session: true })`: a modern request gets the empty 400 (fallback), `initialize` answers `fake-mcp-session-<n>` (X6) |
| D11: legacy, no session, `tools/call` without `initialize` | `startFakeMcp({ era: "legacy" })` (G4, G5) |
| R4: a tool with `x-mcp-header` | `startFakeMcp({ tools: [...FAKE_MCP_TOOLS, tool] })` or `setTools`, `tool.inputSchema.properties.region["x-mcp-header"] = "Region"`; listed verbatim (L2, `HDR_TOOL`) |
| R3: hints that claim a read | `find_vendor` `{ readOnlyHint: true }`; `log_note` `{ readOnlyHint: false, idempotentHint: true }`; `HDR_TOOL` all three |
| `-32022`, era fallback, SSE, paging, failures | `dual` (H8), `era: "legacy"`, `era: "modern"`, `sse: true`, `pageSize: 1`, `failNext` |

12. **Tools.** `T_FIND` and `T_LOG` of `test-plan.md` § Constants are the exact entries of `FAKE_MCP_TOOLS`. `find_vendor` returns `V_ACME` for `Acme GmbH` and `V_UNK` otherwise, `text` its JSON; `log_note` returns `noted: ` plus `String(arguments.note)`. Arguments are never validated against `inputSchema`.

## Interfaces

Given, equal to `proposal.md` (not scaffolded: proposal § Impact). Taken shapes: `delivered-shapes.md`.

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

## Internal modules

`server.ts` (§ 2 to 8) is internal and imported by no test; task 2.1 creates it.

## Failure cases

- A malformed request never throws out of the server: an unparsable body is 400 `-32700`, a connection that closes before its body ends is dropped (no record), a handler exception (a throwing tool `result` too) is 500 `{"error":"internal"}`.
- A bad option rejects `startFakeMcp` with `RangeError` before any listener (A1 to A7); a missing egress part rejects the part's `start` with `E2eStackError` before any listener (P1).

## Verification

Run 2026-11-13 on Node 24.22.2 in a scratch copy of main@3daa5c35 with a scratch implementation of this design (`tsc --noEmit` clean for the new files). Every row of both test plans ran as a request, the digests recomputed with `node:crypto`; the contract rows ran against the dual, modern-only, legacy-only and keyless fakes, M1 and a closed port; P1 to P3 and P5 ran with the real fake egress, `putCredential` and crash cluster; an SSE answer and the `mcp-session-id` header passed unchanged through the fake egress proxy. **Derived, not run:** eslint and the test gates, the README row, P4's file text, `requests()` after `close()`, every UNVERIFIED point.

## Risks

- A real server's deviations show only on the M8 stack run; accepting a legacy call without `initialize` is where the fake is most permissive. U54 must not require `ttlMs` or `cacheScope` on a discover answer.
