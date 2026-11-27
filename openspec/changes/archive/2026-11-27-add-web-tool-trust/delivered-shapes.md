Names taken from merged main@31968a29 (read against the file named, `export` omitted), each cited `file:line`.

```ts
// web/src/tools/register.ts
:18-24  interface OpenApiDraft { id: string; origin: string; local: boolean; documentText: string; effects: Readonly<Record<string, "" | "read" | "write" | "send" | "pay">> }
:109-117 function operationOverlay(effects)   // module-internal: { effect } for each effect that is not ""; null when none
:171    function openApiRegistration(d: OpenApiDraft): RegistrationRequest   // /tool-registrations/openapi, body { id, origin, local, document, overlay: { operations } }
:210    function openApiReplacement(serverId: string, d: OpenApiDraft): RegistrationRequest   // /tool-servers/<id>/openapi, body { document, overlay }
:238    interface OperationRowView { operationId: string | null; name: string | null; method: string; path: string; excluded: string | null }
:360    function prefillEffects(tools: readonly { name: string; effect: string }[], operations: readonly OperationRowView[]): Record<string, "" | "read" | "write" | "send" | "pay">   // by operation.name; skips excluded rows and null ids
// web/src/tools/review.ts
:318    function surfaceDiff(approved: unknown, pending: unknown): SurfaceChange[]   // compares with the digest's defaults: untrusted_result true, unsafe_to_retry false, data_class null
:381    function changesView(approved: unknown, pending: unknown): { text: string | null; items: { text: string; lines: string[] }[] }   // item text "changed <name>: <fields>", "added x", "removed x"
:439-442 interface DiscoverDraft { effects: Readonly<Record<string, "" | "read" | "write" | "send" | "pay" | "skip">>; names?: Readonly<Record<string, string>> }
:452    function initialDraft(tools: readonly ReviewTool[]): DiscoverDraft   // "" for write; a name when it differs; skips __proto__
:465    function discoverBody(d: DiscoverDraft): { tools: Record<string, { effect?: string; name?: string; skip?: true }> }   // RangeError on a bad key, effect or name, or over 100 keys
// web/src/tools/ReplaceSection.tsx
:85 ReplaceSection({ serverId, server, onSaved })   // :152 runPreview calls prefillEffects(server.tools, ...); no raw surface reaches it
```

The engine defaults a carried value meets are cited in `design.md` decisions 3 and the Context (`src/tools/openapi/read.ts:387-392`, `src/tools/mcp/surface.ts:481-484`, `src/runs/intents/gate.ts:68-72`, `src/tools/surface.ts:76-99`); the overlay accepts `untrusted_result`, `unsafe_to_retry` and `data_class` per operation (`read.ts:259-265`, `:307-315`) and per MCP tool (`surface.ts:65-72`, `:278-325`).
