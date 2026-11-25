## Why

After U56 an admin can register an MCP, an OpenAPI or a code-block server and store its credential, but cannot discover MCP tools from the web, see what a surface lets a flow do or what changed when it drifted. R3 and R4 put the server's claims and the tools left out into that view. The journeys that prove M7 are `add-web-tool-journeys`' (ruling S1).

Observable result: on the page of the MCP server `crm`, carol presses "Discover tools" and reads "Discovered 2 tools over MCP 2026-07-28."; "Tool settings" shows `find_vendor` with the claim `read-only` and the effect `write` (the claim set nothing); she sets `read`, discovers again and approves. After a hint change "Changes" reads `changed find_vendor: hints`; the first approval and each added tool show the description and the input descriptions in full, and a changed description shows both texts.

Batch `m7-tools` (U47b, U35c, U27b, U54b, U53, U54, U55, U56, U56b, U56c in plan order; closing unit `add-web-tool-journeys`, journey `e2e/test_m7_tools.py`) delivers M7: an admin adds an HTTP/OpenAPI, MCP or code-block tool, approves its surface and stores its credential; a flow calls it (F9). This unit's part: MCP discovery from the web, the surface review with the drift diff and the calls view. After this unit merges, L4 runs acceptance profile `all` (every configured gate) on the target; the batch itself has profile `none`, and the closing unit's journey proves the outcome.

## What Changes

- `web-tools`: ADDED requirements only (no MODIFIED requirement, no frozen test change). New: `web/src/tools/review.ts` and its tests, and `e2e/test_m7_tool_review.py` (mocked answers). New also `web/src/tools/ReviewSections.tsx`. Edited in task 3.1: `web/src/tools/ServersPage.tsx`. No API, migration, dependency, part, CSS, `servers.ts` or `messages.ts` change (design 1).

## Impact

- **Scaffold:** stubs of the interfaces below are on the base branch. Not scaffolded: the values of `REVIEW_NAMES`, `ReviewSections.tsx`, the edit of `ServersPage.tsx`, the tests.
- **Depends on:** `add-web-shell`, `add-web-ui-kit`, `add-web-data-kit`, `add-web-sign-in`, `add-web-flow-editor`, `add-runs-api`, `add-web-run-timeline`, `add-fake-egress-proxy`, `add-fake-tools`, `add-gateway-client`, `add-dry-runs`, `add-web-grants`, `add-web-dry-runs` (merged), and in plan `add-tool-adapters`, `add-cli-sandbox`, `add-validator-version`, `add-fake-mcp`, `add-http-openapi-tools`, `add-mcp-client`, `add-code-block-tools`, `add-web-tools`. Shapes of the delivered names above: `delivered-shapes.md` in this folder (from the merged code, main@386e6b6d).
- **M6b prerequisites** (merged): U15c `add-ui-foundation`, U15d `restyle-web-kit`, U07b `add-app-shell`, U21b `restyle-admin-pages`, U37b `add-run-inputs-form`; shapes in `delivered-shapes.md`.
- **Deviations from the card:** no `messages.ts` edit (design 1); the additions are marked `(addition)` below (R3); a description change carries its old and new text and "Discover tools" pre-fills the approved effects (D17a); "Tool settings" has the columns "Server hints" and "Tool name" and the option "Skip" (C9), "Calls" the columns "Effect", "Retry", "Result", "Server hints"; the card's text "No approved surface to compare." is dropped (C7: the first approval lists every tool as added).

**Interfaces given** (the block of `design.md` § Interfaces); `(addition)` marks what the card's seam does not list.

```ts
// web/src/tools/review.ts
export interface ReviewTool { name: string; effect: string; untrusted_result: boolean; unsafe_to_retry: boolean; call: string; hints: string; serverName: string | null }   // call per kind: design 3; (additions) hints, serverName
export function parseReviewTools(surface: unknown): ReviewTool[] | null;   // a detail's approvedSurface or pendingSurface
export interface SurfaceChange { name: string; kind: "added" | "removed" | "changed"; fields: string[]; description?: { old: string | null; new: string | null }; input?: { property: string; text: string }[] }   // the card's eight fields and (additions) "hints", "untrusted_fields"; description: for an added tool and a changed one whose fields include "description"; input: the new side's described input properties, for an added tool and a changed one whose fields include "input"
export function surfaceDiff(approved: unknown, pending: unknown): SurfaceChange[];   // by tool name, sorted by name
export function changeText(c: SurfaceChange): string;   // "added x" | "removed x" | "changed x: effect, call"
export function changesView(approved: unknown, pending: unknown): { text: string | null; items: { text: string; lines: string[] }[] };   // (addition); an absent approved surface counts as no tools; lines: descriptions and described input properties, neutralised, cut at 2,000 characters (D17a, C6, C7)
export interface DiscoverDraft { effects: Readonly<Record<string, "" | "read" | "write" | "send" | "pay" | "skip">>; names?: Readonly<Record<string, string>> }   // key: server tool name; "" = proposal; names, "skip": additions (C9)
export function initialDraft(tools: readonly ReviewTool[]): DiscoverDraft;   // (addition)
export function discoverBody(d: DiscoverDraft): { tools: Record<string, { effect?: string; name?: string; skip?: true }> };
export function parseDiscovery(raw: unknown): { protocolVersion: string; era: string; count: number; excluded: { name: string; reason: string }[] } | null;
export function discoverTools(api: Api<"post">, serverId: string, body: unknown, key: string, signal?: AbortSignal): Promise<NonNullable<ReturnType<typeof parseDiscovery>>>;
export function discoveryText(d: NonNullable<ReturnType<typeof parseDiscovery>>): string;   // `Discovered ${count} tools over MCP ${protocolVersion}.` plus ` Left out: ${name} (${reason}), …` when any
export function discoveryErrorText(error: unknown): string;   // (addition)
export function collidingNames(error: unknown): string[];   // (addition) the server tool names of a name_collision refusal
export interface ServerReview { server: ToolServerView; approved: unknown; pending: unknown }   // (addition)
export function loadServerReview(api: Api<"get">, serverId: string, signal?: AbortSignal): Promise<ServerReview>;   // (addition)
export function callRows(tools: readonly ReviewTool[]): { name: string; call: string; effect: string; retry: string; result: string; hints: string }[];   // (addition)
export function readNote(tools: readonly ReviewTool[]): string | null;   // (addition) the fixed sentence when a tool is `read` (D17a)
export const REVIEW_NAMES: Readonly<Record<string, string>>;
```

**Interfaces taken:**

- From `add-tool-adapters`: `McpCallSpec`, `HttpCallSpec`, `CodeCallSpec` (a surface tool's `call`, read as plain data, with U47b's optional `hints`, R3a).
- From `add-fake-mcp`: `FakeMcp`, `FAKE_MCP_TOOLS`, `mcpApi`.
- From `add-web-tools`: `mcpRegistration`, `openApiRegistration`, `codeRegistration`, `previewRequest`, `previewOperations`, `registerServer`, `credentialBody`, `storeCredential`.
- The routes and answers of U53, U54 (discover) and U55: `delivered-shapes.md`.
- From merged code (shapes in `delivered-shapes.md`): `parseToolServer`, `ToolServerView`, `toolsErrorMessage`, `registerToolMessages`, `postGrant`, `deployPolicy`, `decisionRows`, `startDryRun`, `followRun`, `startE2eStack`, `egressApi`, `toolsApi`; in Python `login`, `users`, `fresh_state`, `assert_accessible`.

## Out of scope

Overlay edits beyond effects, scheduled rediscovery (M12), `x-mcp-header` mirroring (M13), stateful MCP sessions (M8), replacing an OpenAPI document or code source from the web, and any API or engine change.
