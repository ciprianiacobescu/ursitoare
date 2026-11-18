# Fixtures (every value was run against a prototype of the design; nothing depends on `seed/`)

Node tests live in `web/src/runs/`, import from the files the Interfaces headers name, and record every call of their fakes.

## T1 `inputFormModel` (file `input-form-model.test.ts`)

D (`demo-pay`'s canonical document as the API answers it, key order included; `nodes` as in T5):

```json
{ "flow": "demo-pay", "start": "lookup", "version": "1.0.0", "ursitoare": "0.1",
  "inputs": { "type": "object", "required": ["vendor_name", "amount"],
              "properties": { "amount": { "type": "number" }, "vendor_name": { "type": "string" } } },
  "nodes": { "pay": { "kind": "block", "next": "done", "uses": "erp.create_payment@1" },
             "done": { "kind": "end", "status": "completed" },
             "route": { "kind": "switch", "on": "${{ nodes.lookup.output.status }}", "cases": { "active": "pay" }, "default": "blocked" },
             "lookup": { "kind": "block", "next": "route", "uses": "erp.lookup_vendor@1" },
             "blocked": { "kind": "end", "status": "failed" } } }
```

| # | input | result |
|---|---|---|
| M1 | D | `form`; fields `[vendor_name, string, required, label "Vendor name", hint null]`, `[amount, number, required, "Amount"]`; `problems` `[]` |
| M2 | `{ "flow": "x" }` | `{ kind: "json", reason: "This flow declares no inputs." }` |
| M3 | `null` | the same |
| M4 | `inputs: { type: "object", properties: {} }` | the same |
| M5 | `inputs.properties.a: { oneOf: [{ type: "string" }, { type: "number" }] }` | `{ kind: "json", reason: "The input schema uses features the form cannot show, so enter the input as JSON." }` |
| M6 | one property named `input`, type string | the "cannot show" reason |
| M7 | 21 string properties `f0`..`f20` | the "cannot show" reason |
| M8 | `required: ["x"]`, `properties: {}` | the "cannot show" reason |
| M9 | 20 string properties `f0`..`f19` | `form`, 20 fields |
| M10 | `required: ["b"]`; `a` integer, `b` boolean, `c` string enum `["x", "y"]`, `d` array of strings (model K) | `form`; `[b, boolean, true]`, `[a, integer, false]`, `[c, enum, false]`, `[d, string-list, false]` |

## T2 text and form (file `input-form-text.test.ts`)

`inputJsonFromForm`:

| # | model, raw | result |
|---|---|---|
| W1 | D, `{ vendor_name: "ACME", amount: "12.5" }` | `{ ok: true, text: "{\n  \"vendor_name\": \"ACME\",\n  \"amount\": 12.5\n}" }` |
| W2 | D, amount `""` | `{ ok: false, errors: { amount: "Required" } }` |
| W3 | D, amount `"abc"` | `{ ok: false, errors: { amount: "Enter a number" } }` |
| W4 | K, `{ a: "5", b: true, c: "x", d: "p\nq" }` | `{ ok: true, text: JSON.stringify({ b: true, a: 5, c: "x", d: ["p", "q"] }, null, 2) }` |

`formFromInputJson` (R1 to R8 on D, R9 to R14 on K):

| # | text | result |
|---|---|---|
| R1 | `{"vendor_name":"ACME","amount":12.5}` | `{ vendor_name: "ACME", amount: "12.5" }` |
| R2 | `{}` | `{ vendor_name: "", amount: "" }` |
| R3 to R8 | `{"vendor_name":"ACME","extra":1}`; `{"vendor_name":"ACME","amount":"12"}`; `{"vendor_name":null}`; `[1]`; `{`; `{"__proto__":1}` | `null` each |
| R9 | `{"a":5,"b":true,"c":"x","d":["p","q"]}` | `{ b: true, a: "5", c: "x", d: "p\nq" }` |
| R10 to R13 | `{"a":12.5}`; `{"c":"z"}`; `{"d":["a b "]}` and `{"d":[""]}`; `{"b":"true"}` | `null` each |
| R14 | `{"a":1e3}` | `{ b: false, a: "1000", c: "", d: "" }` |

## T3 the input sync (file `input-sync.test.ts`; model of D; `\n` is a line feed)

Constant unless a row says otherwise: `hint` `Kept in step with the fields above.`, `jsonError` null. "same" is the text of the row above.

| # | event | text after | source | `fieldErrors` | `blocked` |
|---|---|---|---|---|---|
| S1 | `inputSyncStart(D, "{}")` | `{}` | json | `{}` | false |
| S2 | field `vendor_name` = `ACME` | `{\n  "vendor_name": "ACME"\n}` | form | `{}` | true |
| S3 | field `amount` = `12.` | same | form | `{ amount: "Enter a number" }` | true |
| S4 | attempt | same | form | `{ amount: "Enter a number" }` | true |
| S5 | field `amount` = `12.5` | `{\n  "vendor_name": "ACME",\n  "amount": 12.5\n}` | form | `{}` | false |
| S6 | text `{"vendor_name":"Z"}` | the same bytes | json | `{}` | false |
| S7 | text `{"vendor_name"` | the same bytes | json | `{}` | false |
| S8 | text `{"foo":1}` | the same bytes | json | `{}` | false |
| S9 | text `{"vendor_name":"ACME","amount":12.5}` | the same bytes | json | `{}` | false |

S7 gives `jsonError` `This is not valid JSON.`; S8 gives `hint` `The JSON no longer matches the form; it is used as written.`. The buffer `raw` is `{ vendor_name: "Z", amount: "" }` after S6, unchanged after S7 and S8, and `{ vendor_name: "ACME", amount: "12.5" }` after S9. T3b: start `{}`; `vendor_name` = `ACME` (`{}`, blocked); attempt (`{ amount: "Required" }`, blocked); `amount` = `5` (`{}`, not blocked); `amount` = `""` (`{ amount: "Required" }`, text `{\n  "vendor_name": "ACME"\n}`, blocked); text `{}` (`{}`, not blocked). T3c, arrival: `s = inputSyncStep(null, inputSyncStart(null, "{}"), { type: "text", text })` (typed while loading), then `a = inputSyncStart(M1's model, s.text)`. With `text` `{"vendor_name":"ACME","amount":12.5}`: `a.text === text`, `a.raw` `{ vendor_name: "ACME", amount: "12.5" }`, hint `Kept in step with the fields above.`. With `{"foo":1}`: `a.text === text`, `a.raw` `{ vendor_name: "", amount: "" }`, hint the mismatch one. For `{ kind: "json", reason: "x" }` and `null` the view is `{ fieldErrors: {}, jsonError: null, hint: null, blocked: false }` even for the text `{`, and a `field` event changes nothing.

## T4 the document (file `run-document.test.ts`)

V is the version detail `{ flowId: "demo-pay", number: 1, hash: "sha256:" + "a" × 64, state: "validated", surface: "yaml", author: "u_alice", requestedBy: null, createdAt: "2026-11-06T10:00:00.000000Z", validatedAt: null, validationOk: null, text: "t", canonical: { inputs: 1 }, result: null }`. A recording client pushes `[path, opts]` per `get` and answers V; `loadRunDocument(client, "demo-pay", V.hash)` resolves `{ inputs: 1 }` and records `[["/flows/demo-pay/versions/sha256%3A" + "a" × 64, undefined]]`. A client answering `{ nope: 1 }` rejects with `ApiRequestError` (200, `INVALID_RESPONSE`); the flow id `"Bad_Id"` rejects with `RangeError`, recording nothing. `inputFormModelFor`: `none` and `loading` give `null`; `failed` gives `{ kind: "json", reason: "The inputs of this version could not be read, so enter the input as JSON." }`; `ready` with `{ flow: "x" }` gives the "no inputs" model, with D the model of M1.

## T5 mock rows (file `mock-rows.test.ts`)

`mockableNodes(D)` is `[{ nodeId: "lookup", uses: "erp.lookup_vendor@1" }, { nodeId: "pay", uses: "erp.create_payment@1" }]` (nodes N below: `lookup` is layer 0, `pay` layer 2; `switch` and `end` skipped). Order: O1 `start: "b"`, `b` (`x@1`) then `c` then `end1`, and an unreachable `a`, give `b, c, a`; O2 `start: "s"`, a `switch` to `zed` and `alpha`, give `alpha, zed`; O3 blocks `b`, `a` and an `end`, no `start`, give `a, b`; O4 201 blocks `n000`..`n200` give 201 nodes, `n000` first (sorted); O5 `{ nodes: [] }` and `null` give `[]`. `mockableNodes({ nodes: { a: { kind: "block", uses: "x@1" }, b: { kind: "block" }, c: { kind: "end" }, d: 5 } })` is `[{ a, x@1 }, { b, "" }]`; `null` and `{ nodes: [] }` give `[]`. `answerLabel("pay", 0)` is `Output 1 for pay`, `("pay", 2)` is `Output 3 for pay`.

| # | `mockRowsFromText(text, N)` | result |
|---|---|---|
| A1 | `{}` | `[{ lookup, [] }, { pay, [] }]` |
| A2 | `{"pay":[{"output":{"payment_id":"P-1"}},{"output":"x"}],"lookup":[{"output":{"vendor_id":"V-1","status":"active"}}]}` | rows `lookup`: `[JSON.stringify({ vendor_id: "V-1", status: "active" }, null, 2)]`, then `pay`: `[JSON.stringify({ payment_id: "P-1" }, null, 2), "\"x\""]` |
| A3 to A8 | `{"ghost":[]}`; `{"pay":{}}`; `{"pay":[{"error":{"code":"E","message":"m"}}]}`; `{"pay":[{"output":1,"x":2}]}`; `[]`; `{` | `null` each |

`mockTextFromRows(rowsOf(A2))` parses to the map of A2 and equals `JSON.stringify(map, null, 2)` (`lookup` first, as the nodes are). B1 `[{ pay, [] }, { lookup, ["  ", "{\"a\":1}"] }]` gives `{ ok: true, text: JSON.stringify({ lookup: [{ output: { a: 1 } }] }, null, 2) }`; B2 `[{ pay, ["{}", "{"] }]` gives `{ ok: false, nodeId: "pay", index: 1, message: "This is not valid JSON." }`; B3 `[{ pay, [] }]` and B4 `[]` give `{ ok: true, text: "{}" }`.

## T6 the row sync (file `mock-rows-sync.test.ts`; nodes N, `lookup` then `pay`)

Constant unless a row says otherwise: `jsonError` null, `formError` null, `hint` `Kept in step with the answers above.`.

| # | event | text after | source | `answerErrors` | `blocked` |
|---|---|---|---|---|---|
| R1 | `rowSyncStart(N, "{}")` | `{}` | json | `{}` | false |
| R2 | add `pay` | `{}` (rows `pay: ["", ""]`) | rows | `{}` | false |
| R3 | answer `pay` 0 = `{"payment_id":"P-1"}` | `JSON.stringify({ pay: [{ output: { payment_id: "P-1" } }] }, null, 2)` | rows | `{}` | false |
| R4 | answer `pay` 1 = `{` | same | rows | `{ "Output 2 for pay": "This is not valid JSON." }` | true |
| R5 | attempt | same | rows | same | true, `formError` `Fix the answers that are not valid JSON before you start.` |
| R6 | remove `pay` 1 | same | rows | `{}` | false |
| R7 | text `{"pay":[{"error":{"code":"E","message":"m"}}]}` | the same bytes | json | `{}` | false, `hint` `The JSON no longer matches the answer rows; it is used as written.` |
| R8 | text `{"pay"` | the same bytes | json | `{}` | false, `jsonError` `This is not valid JSON.` |

Arrival: `rowSyncStart(N, text)` after `rowSyncStep([], rowSyncStart([], "{}"), { type: "text", text })` keeps `text`; `{"pay":[{"output":{"payment_id":"P-1"}}]}` gives rows `lookup: []`, `pay: ["{\n  \"payment_id\": \"P-1\"\n}"]` and the "Kept in step" hint; `{"ghost":[]}` gives two empty rows and the answer-rows mismatch hint. After R7 the rows are those of R6. `rowSyncView([], …)` is `{ answerErrors: {}, jsonError: null, hint: null, formError: null, blocked: false }`; a `remove` on a row with no answers keeps `{}`.

## T7 sources (file `input-sources.test.ts`)

Reads `InputForm.tsx`, `MockRows.tsx`, `use-run-document.ts`, `TestRunPanel.tsx`, `DryRunPanel.tsx` as `existsSync(url) ? readFileSync(url, "utf8") : ""` (the two components are missing at red) and checks what the requirement lists: for the first three `findInlineStyleUse` and `findPaletteUtilities` (`web/src/ui/rules.ts`) are `[]` and none of the banned substrings occurs; `TestRunPanel.tsx` has one `<Link` and one `role="status"`, `DryRunPanel.tsx` one `<code` (true on main), and each panel calls `useRunDocument(`, `inputSyncStep(` and `rowSyncStep(` (false at red; same test), and `DryRunPanel.tsx` holds task 3.3's intro line.
