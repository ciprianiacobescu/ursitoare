Paths without a directory are in `web/src/tools/`. Spec: `specs/web-tools/spec.md`; fixtures: `test-plan.md`; decisions: `design.md`. No frozen test is changed; each task is one red-green cycle. Each Node test begins with `assert.equal(typeof <function>, "function")` for the names it imports, wraps a call that reaches a stub in `assert.doesNotThrow` (`assert.doesNotReject` for a promise), uses `node:assert/strict`, records every argument in its fakes and has no `.`, `[` or `::` in its name.

## 1. Tool servers

- [x] 1.1 Write `servers.test.ts` (scenarios "Tool servers are parsed, ignored members stay out and the texts are fixed" and "Nothing pending, team, solo, drifted and an unknown submitter") first, then implement `parseToolServer`, `serverRowText`, the module-internal `shortDigest` (tested through `stateNote` and `approveDialog`), `toolRows`, `stateNote` and `approvalView` in `servers.ts`
- [x] 1.2 Write `approve.test.ts` (scenario "Requests, dialog and failure texts"; it calls `registerToolMessages()` first) first, then implement `registerToolMessages` and `toolsErrorMessage` in `messages.ts` (with the module-internal `REASON_MESSAGES` and `refusalReason`) and `SURFACE_APPROVED`, `ownBoxShown`, `approveRequest`, `approveDialog` and `approveFailure` in `servers.ts`

## 2. Grants

- [x] 2.1 Write `grants.test.ts` (scenarios "Each subject and scope, the list item and the malformed items" and "Role, user and node drafts and the refused fields") first, then implement `parseGrant`, `grantRowText`, `grantActions`, `GRANT_DONE`, `grantBody` in `grants.ts`

## 3. Policies

- [x] 3.1 Write `policies.test.ts` (scenario "Policy views and texts") first, then implement `parsePolicyView`, `validationText`, `deployText`, `currentText`, `pendingText`, `checkPolicySource` and `policyErrorText` in `policies.ts`

## 4. Calls and page states

- [x] 4.1 Write `calls.test.ts` (scenario "Calls of the three pages"; fakes record `[method, path, body, opts]`) first, then implement `loadToolServer` and `approveToolSurface` in `servers.ts`, `loadToolRefs`, `postGrant`, `revokeGrantById` and `confirmGrantById` (with the module-internal grant-record check) in `grants.ts`, and `loadPolicy`, `validatePolicy` and `deployPolicy` in `policies.ts`
- [ ] 4.2 Write `states.test.ts` (scenario "Region, action and approve-control states"; each row of test-plan.md § Page states is an `assert.deepEqual`, the `RangeError` rows `assert.throws(…, RangeError)`) first, then implement `regionState` and `actionState` in `pages.ts` and `approveControl` in `servers.ts`

## 5. Pages and features

- [ ] 5.1 Write `pages.test.ts` (scenarios "Names, tables, links and sources" and "Features and navigation"; it reads the feature files, `tools.css` and the pages with `readFileSync` after `assert.ok(existsSync(url))`, as `runs/pages.test.ts:28-31` does, asserts `source.includes(token)` for each token of test-plan.md § Page sources, and `findRawColours` and `findInlineStyleUse` give `[]` on `tools.css` and each `.tsx` page) first, and `e2e/test_m6_tool_pages.py` in the same task (a red step cannot run `e2e/`; four tests, replies, steps and tags of test-plan-browser.md, proving scenarios "The server detail loads, fails, is refused and is approved", "A server opened from its link is approved by its submitter", "A grant is created, confirmed and revoked, and the table reloads" and "The policy loads, validates and deploys"; their criteria stay out of `criteria_ids`, the verifier checks them), then implement `serverLink` and `serverIdFromSearch` in `servers.ts`, fill `pages.ts` (`TOOL_PAGES`, `TOOL_TITLES`, `TOOL_TABLES`, `TOOL_NAMES`), create `tools.css` (kit tokens only), `ServersPage.tsx`, `GrantsPage.tsx`, `PoliciesPage.tsx` (design § Roles and names and § Failure cases: every handler returns while its control is disabled; titles by an effect as `UsersPage` does; `browserSession.api`; keys from `crypto.randomUUID()` per design decisions 6 and 7; states from the models of 4.2) and the feature files (each: `registerToolMessages();`, an `export const feature` with string literals)
