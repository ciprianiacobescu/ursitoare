## ADDED Requirements

### Requirement: A registration draft becomes the API request or names the field to fix
`mcpRegistration`, `previewRequest`, `openApiRegistration`, `codeRegistration` and the replacement builders `openApiReplacement` and `codeReplacement` (paths `/tool-servers/<id>/openapi` and `/tool-servers/<id>/code`, bodies `{ document, overlay }` and `{ tools }`, a `RangeError` for an id outside the server pattern) SHALL check a draft in the order and with the texts of design.md § Messages (Drafts) and return the first failure as `{ ok: false, field, message }`, else `{ ok: true, path, body }` with the paths and bodies of test-plan.md § Drafts (the overlay: the effects that are not `""`), never changing the draft.

#### Scenario: The three drafts become the registration requests or name the field to fix
- **WHEN** the rows M1 to M3, P1 to P3, O1, O2, C1 to C3, R1 and R2 of test-plan.md § Drafts run
- **THEN** M1 gives its body from a padded draft, P1 the origin `https://tools.fake.test` from `https://Tools.Fake.Test/`, O1 an overlay of two entries from three effects, C1 one tool without `description` and C3 with it; R1 and R2 the bodies of the PUT routes; every other row gives its `field` and text; the first failing field wins (P3, O2); no draft is changed

### Requirement: A preview is read strictly, the calls use their routes and a refusal lands on the form
`parsePreview` SHALL return `{ basePath, operations }` of `{ operationId, name, method, path, excluded }` for a preview answer and `null` for anything else. `previewOperations` and `registerServer` SHALL post the request's body to its path (`registerServer` with the header `Idempotency-Key`) and read the new id from `server.id` for the MCP path, else from `id`; `replaceServer` SHALL `PUT` the body of a replacement request and read `id`; `prefillEffects` SHALL give each non-excluded operation whose `name` is a given tool's name that tool's effect, keyed by `operationId`; `codeDraftOf` SHALL read the one code tool of a surface into a draft whose schemas are `JSON.stringify(x, null, 2)` and give `null` for any other surface, and `loadCodeDraft` SHALL read `GET /tool-servers/<id>` and use its pending surface, else its approved one; a path of another call and a blank key SHALL reject with `RangeError` before a call, an unreadable answer with `ApiRequestError` 200 `INVALID_RESPONSE`. `registrationFormErrors` SHALL return the form errors of design.md § Messages (Answers), reading an engine reason as its `REGISTER_REASONS` sentence and a 413 as its text.

#### Scenario: Previews, calls and refusals
- **WHEN** `parsePreview` gets `PV` and the 8 malformed values, and rows K1 to K6 and E1 to E4 of test-plan.md § Preview, calls and answers run
- **THEN** `PV` gives three rows with their `name`, without `version`, and stays unchanged, each malformed value `null`; K1 to K6 give the plan's records, ids (K2 `{ id: "crm" }` from the MCP answer's `server`), effects, drafts, `RangeError`s and `INVALID_RESPONSE` rejections; E1 to E4 give the plan's form errors (E2 `source` and `name` from `body/tools/<i>/<k>`, E4 the sentence of each of the 14 reasons, an unknown one unchanged, the 413 text)

### Requirement: A credential is read without its secret, and its body, texts and refusals are fixed
`parseCredential` SHALL return the five members of `CredentialView` for a credential record and `null` for anything else, reading no other member. `credentialBody` SHALL check the header (API key only), then the value, as design.md § Messages (Credentials) says, omit `headerName` for a bearer token and throw `RangeError` for an id outside the server pattern; no message SHALL hold the value. `credentialText` and `credentialErrors` SHALL give the texts of that section.

#### Scenario: A credential view never carries a secret and its body, texts and refusals are fixed
- **WHEN** `parseCredential` gets `CREC()`, the hostile record with `value` and `secret` and the 8 malformed values, and rows B1, B2, T1 and T2 of test-plan.md § Credentials run
- **THEN** the views are `CV()`, `CV()` (its `JSON.stringify` has no `s3cr3t`) and `null`; B1 and B2 give the plan's bodies, refusals (`VAL_T` never holding `s3`) and `RangeError`; T1 and T2 give the plan's texts, among them "Code blocks need no credential." for a code-block server whatever is stored

### Requirement: The credential calls page the list and send the secret only in the body
`loadServerCredential` SHALL read `GET /credentials` (`limit` 200, the cursor, at most 50 pages) and resolve the first credential of the server or `null`; `storeCredential` SHALL post the body to `/credentials` with `Idempotency-Key`, `rotateServerCredential` `{ value, authScheme }` and, for an API key, `headerName` to `/credentials/<id>/rotate` with no header, checking its draft as `credentialBody` does. A bad id, a blank key, a body that is not an object and a bad value SHALL reject with `RangeError` before a call, its message without the value; an unreadable page or answer, and a 50th page that still has a cursor, with `ApiRequestError` 200 `INVALID_RESPONSE`.

#### Scenario: The credential calls page the list and send the secret only in the body
- **WHEN** rows L1, L2, S1 and S2 of test-plan.md § Credentials run against a recording fake (S2 rotates with the scheme)
- **THEN** L1 resolves `CV()` over two requests; L2, S1 and S2 give the plan's results, records and rejections (`INVALID_RESPONSE` also after exactly 50 requests); no record or message holds a secret except the bodies of S1 and S2

### Requirement: A step id of the grant form is at most 128 characters
`parseGrant` SHALL refuse a node scope whose `nodeId` is over 128 characters, and `grantBody` a step over 128 characters after trimming, with the field `nodeId` and the step-id text it already has; 128 characters SHALL pass both.

#### Scenario: A step id of 128 characters is accepted and one of 129 is refused
- **WHEN** `parseGrant` and `grantBody` run on the rows of test-plan.md § Step ids
- **THEN** `ID128` gives its scope and body (also with spaces around it); `ID129` and `ID1024` give `null` and `{ ok: false, field: "nodeId", … }`

### Requirement: A server whose tools carry a call is parsed and listed
`parseToolServer` SHALL read a surface tool with a `call` and no `http` (U47b's MCP, code-block and HTTP/OpenAPI tools) as `http` null with its other members, ignoring the `call`; a present `http` that is not `{ method, path }` of strings SHALL still make the answer malformed. `cursorPageFetcher` with it SHALL list servers of every adapter.

#### Scenario: Servers of every adapter parse and list
- **WHEN** `parseToolServer` runs on `S_MCP`, `S_CODE` and the malformed `S_MCP` of test-plan.md § Servers, and `cursorPageFetcher` reads the page `[S_FIX, S_MCP, S_CODE]`
- **THEN** the tools of `S_MCP` and `S_CODE` have `http: null`, their own flags and a "—" Call, the malformed one is `null`, and the page holds `acme`, `crm`, `snips` with `next_cursor` null

### Requirement: The registration page carries fixed names, one feature file and kit components only
`REGISTER_PAGE`, `REGISTER_NAMES` and `CREDENTIAL_NAMES` SHALL hold the values of design.md § Messages (Names). The feature file `web/src/features/67-admin-tool-register.tsx` SHALL export `feature` with the literals of `REGISTER_PAGE` and no `navLabel`, call `registerToolMessages()` and add no navigation item. `RegisterPage.tsx` SHALL render `PageHeader` ("Register a tool server") over its form in a `Card` at `PAGE_WIDTHS.form`; the link of that name SHALL sit in `ServersPage.tsx`'s `PageHeader` `actions`; "Credential" and "Change registration" SHALL be kit `Section`s after "Surface" and the grant-form note a plain `<p>` in "New grant" (no `alert`). The new pages SHALL import no CSS, hold no palette utility, colour or inline style (`findCssImports`, `findPaletteUtilities` and `findInlineStyleUse` `[]`), the pages no `console.`, `localStorage`, `sessionStorage` or `dangerouslySetInnerHTML`, and the secret field `type="password"`; `GrantsPage.tsx` SHALL call `toolListNote(`.

#### Scenario: The registration page carries fixed names and its own feature file
- **WHEN** `tools/register-pages.test.ts` reads the constants, the feature file, a registry holding `TOOL_PAGES` and `REGISTER_PAGE`, and the sources of § Names
- **THEN** the constants are those of design § Messages (29 and 11 values), `featureLiterals` of the feature file is `null`, `visibleNav` for carol lists "Tool servers", "Grants", "Policies", every required token is present and no banned one

### Requirement: The registration and credential pages show the states of the API's answers
The registration page SHALL check the draft before any request, show a refusal on the field it names and any other failure as the form's alert, keep one `Idempotency-Key` per draft until a field changes and navigate to `serverLink(id)` after a registration. The Credential section SHALL show `credentialText`, keep its button `aria-disabled` while the list is pending or failed, offer no credential entry and make no credential request for a code-block server, empty the secret field after any answer, never show the secret and read the list again after a store or rotation that succeeds (not after a refusal). Rotation SHALL show the scheme controls, pre-filled from the stored credential, and send them. For an OpenAPI or code-block server the detail SHALL offer "Replace document" or "Edit code": the form pre-filled (the effects by tool name, the code from the surface), saved by the `PUT` route, then the detail read again. Steps: test-plan-browser.md.

#### Scenario: An MCP server is registered and a code-block server shows no credential form
- **WHEN** the steps of test-plan-browser.md § Register 1 run (an `http:` URL refused locally, the engine's 400 and 409 on the MCP form, a 201 for a changed URL, the detail of a code-block server)
- **THEN** the local refusal posts nothing; the 400 and 409 are field errors under one `Idempotency-Key` and the changed URL has another; the success lands on `?server=crm` ("No credential stored."); a code-block server's detail reads "Code blocks need no credential." with no form and no credential request

#### Scenario: An OpenAPI document is previewed, given effects and registered
- **WHEN** the steps of § Register 2 run (a 500 and then a preview of five operations, no effect, two effects and a 400 on the origin, then a 201)
- **THEN** the table "Operations" holds three rows with a combobox and two with "Excluded: …"; no effect posts nothing; the 400 shows under "Origin" with the overlay of two entries; the retry's 201 lands on `?server=ledger`

#### Scenario: A credential is stored and rotated and its secret never shows
- **WHEN** the steps of § Credential run on `crm` (the list 500, then two pages; a store refused 409 and accepted 201 echoing a `value`; a rotation 200)
- **THEN** nothing posts while the list failed; the 409 is an alert; the stored credential reads "Credential stored (key version 1)." with "Rotate credential" and the scheme controls pre-filled, then "(key version 2)" after a rotation that sends the scheme; after every answer the field is empty, page text and console never hold a secret, the store requests carry different keys and the rotation none

#### Scenario: A document and a code block are replaced from the server detail
- **WHEN** the steps of § Replace run (an approved OpenAPI server: "Replace document", a pasted document and a preview, "Save changes"; an approved code-block server: "Edit code", a changed source, "Save changes")
- **THEN** `createPayment` is `pay` after the preview; the PUT bodies are the plan's; each save reads "Document replaced." or "Code saved." and the detail then reads "drifted"

## MODIFIED Requirements

### Requirement: The calls use the right routes and headers and refuse unreadable answers
The nine calls (`loadToolServer` to `deployPolicy`) SHALL call the client with the paths, bodies and options their frozen tests assert (paths without `/api/v1`); only `postGrant` and `deployPolicy` send an `Idempotency-Key` header, and the confirm sends `{}`, which means the newest version. An id outside its pattern, a blank key and an invalid draft SHALL reject with `RangeError` before a call (the functions are `async`: none throws synchronously); an answer a parser refuses SHALL reject with `ApiRequestError` status 200, code `INVALID_RESPONSE` (`approveToolSurface` reads the `server` of U47's answer, a record without surfaces; the three grant calls a record with a valid `id`). `loadToolRefs` SHALL resolve `{ refs, complete }`: the `ref` of each bound item of `GET /blocks` in the order read, following `next_cursor` for at most 100 pages of 100, with `complete` false exactly when the 100th page still has a non-null `next_cursor`; it SHALL never reject for that reason. `toolListNote(list)` SHALL give "Only the first 10,000 tools are listed." for an incomplete list and `null` for a complete one, and the grant form SHALL show it when it is not `null`.

#### Scenario: Calls of the three pages
- **WHEN** the nine calls run against a recording fake as the frozen `calls.test.ts` runs them, and `loadToolRefs` runs on rows T1 and T2 of test-plan.md § Tool list
- **THEN** the records, results and rejections are those the frozen tests assert; T1 resolves `{ refs: ["acme.lookup_vendor@1", "acme.create_payment@1"], complete: true }` over two requests, and for a cursor that is never null T2 makes 100 requests and resolves `acme.t1@1` to `acme.t100@1` with `complete: false`

#### Scenario: The tool list is read for up to 100 pages and says when it is cut off
- **WHEN** `loadToolRefs` and `toolListNote` run on rows T3 and T4 of test-plan.md § Tool list
- **THEN** T3 (the 100th page ends the list) is `complete: true` after 100 requests; T4 gives `{ refs: [], complete: true }`, the note and `null` of `toolListNote`, `INVALID_RESPONSE` for an unreadable item and the rethrown 500
