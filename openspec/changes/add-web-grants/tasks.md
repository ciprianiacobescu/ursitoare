Spec: `specs/web-tools/spec.md`; fixtures: `test-plan.md`; decisions: `design.md`. No frozen test is changed; each task is one red-green cycle. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports from the file its Interfaces header names (never an `index.ts`), wraps a call that reaches a stub in `assert.doesNotThrow`, uses `node:assert/strict`, records every argument in its fakes and has no `.`, `[` or `::` in its name. The `.tsx` files render what the `.ts` functions return; no test renders a page.

## 1. Tool servers

- [ ] 1.1 Write `web/src/tools/servers.test.ts` (scenarios "Tool servers are parsed, ignored members stay out and the texts are fixed" and "Nothing pending, team, solo, drifted and an unknown submitter") first, then implement `parseToolServer`, `serverRowText`, the module-internal `shortDigest` (not exported; tested through `stateNote` and `approveDialog`), `toolRows`, `stateNote` and `approvalView` in `web/src/tools/servers.ts`, implementing requirements "A tool server is parsed strictly…" and "Approval compares the approver…"
- [ ] 1.2 Write `web/src/tools/approve.test.ts` (scenario "Requests, dialog and failure texts"; it calls `registerToolMessages()` first) first, then implement `registerToolMessages` and `toolsErrorMessage` in `web/src/tools/messages.ts` (with the module-internal `REASON_MESSAGES` of design § Messages and `refusalReason`) and `SURFACE_APPROVED`, `ownBoxShown`, `approveRequest`, `approveDialog` and `approveFailure` in `servers.ts`, implementing requirement "An approval is requested explicitly…"

## 2. Grants

- [ ] 2.1 Write `web/src/tools/grants.test.ts` (scenarios "Each subject and scope, the list item and the malformed items" and "Role, user and node drafts and the refused fields") first, then implement `parseGrant`, `grantRowText`, `grantActions`, `GRANT_DONE` and `grantBody` in `web/src/tools/grants.ts`, implementing requirements "A grant is parsed…" and "A grant draft becomes the API body…"

## 3. Policies

- [ ] 3.1 Write `web/src/tools/policies.test.ts` (scenario "Policy views and texts") first, then implement `parsePolicyView`, `validationText`, `deployText`, `currentText`, `pendingText`, `checkPolicySource` and `policyErrorText` in `web/src/tools/policies.ts`, implementing requirement "The policy view, validation and deployment…"

## 4. Calls and page states

- [ ] 4.1 Write `web/src/tools/calls.test.ts` (scenario "Calls of the three pages"; fakes record `[method, path, body, opts]`) first, then implement `loadToolServer` and `approveToolSurface` in `servers.ts`, `loadToolRefs`, `postGrant`, `revokeGrantById` and `confirmGrantById` in `grants.ts`, and `loadPolicy`, `validatePolicy` and `deployPolicy` in `policies.ts`, implementing requirement "The calls use the right routes…"
- [ ] 4.2 Write `web/src/tools/states.test.ts` (scenario "Region, action and approve-control states"; each row of test-plan.md § Page states is an `assert.deepEqual`, the `RangeError` rows `assert.throws(…, RangeError)`) first, then implement `regionState` and `actionState` in `web/src/tools/pages.ts` and `approveControl` in `servers.ts`, implementing requirement "Loading, failure, empty, busy and approve states are decided by pure models…"

## 5. Pages and features

- [ ] 5.1 Write `web/src/tools/pages.test.ts` (scenarios "Names, tables, links and sources" and "Features and navigation"; it reads the three feature files, `tools.css` and the three pages with `readFileSync` after `assert.ok(existsSync(url))`, as `runs/pages.test.ts:28-31` does, and asserts `source.includes(token)` for every token of each page's row in test-plan.md § Page sources) first, then implement `serverLink` and `serverIdFromSearch` in `servers.ts`, fill `web/src/tools/pages.ts` (`TOOL_PAGES`, `TOOL_TITLES`, `TOOL_TABLES`, `TOOL_NAMES`), create `tools.css` (kit tokens only), `ServersPage.tsx`, `GrantsPage.tsx`, `PoliciesPage.tsx` (design § Roles and names; titles by an effect as `UsersPage` does; `browserSession.api`; keys from `crypto.randomUUID()`; states from the models of 4.2) and the three feature files (each: `registerToolMessages();`, an `export const feature` with string literals), implementing requirements "The pages carry fixed names…" and "Three feature files register the pages…"
