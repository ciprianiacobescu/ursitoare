# Test plan: fixtures and expected values

**Ran** 2026-11-06 (Node 24.22.2): prototypes over a scratch copy of main@cf34c628 printed every value not marked **derived**, and the page models printed § Page states; the grant-pattern vectors (the tool boundary ones on 2026-11-07) and the 10-request result of `loadToolRefs` ran against the patterns and a model of the loop. **Derived**, not run: values from the sibling folders (`pendingSubmittedBy`, `DRIFT_RAW`, `LISTITEM`, `ACCEPTED`) and what this round added or changed, among them `SURF2`, `DRIFT_VIEW`, `FLAT`, the last two malformed values, the drifted `stateNote` tail, `reload`, the 13 reason texts and `BLK`. Browser tests: test-plan-browser.md (not run).

## Tool servers

`DP` is `"sha256:" + "0123456789ab" + "c" × 52` (`shortDigest` `0123456789ab`), `DA` is `"sha256:" + "fedcba987654" + "d" × 52`, `IO` is `{ type: "object" }`. `SURF` is `{ tools: [{ name: "lookup_vendor", effect: "read", input: IO, output: IO, untrusted_result: false, http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" } }, { name: "create_payment", effect: "pay", input: IO, output: IO, unsafe_to_retry: true, http: { method: "POST", path: "/blocks/erp.create_payment@1" } }] }` (U47's `ToolSurface`; the second tool leaves `untrusted_result` out, so it reads true). `TOOLS` is `[{ name: "lookup_vendor", effect: "read", ref: null }, { name: "create_payment", effect: "pay", ref: null }]`. `RAW`, the answer of `GET /tool-servers/acme` (**derived**: U47's `REC_PENDING` plus the surface members): `{ id: "acme", adapter: "fixture", origin: "https://tools.fake.test", local: false, state: "pending", registeredBy: "u_carol", registeredAt: "2026-11-06T10:00:00.000000Z", approvedDigest: null, pendingDigest: DP, pendingSubmittedBy: "u_carol", tools: TOOLS, approvedSurface: null, pendingSurface: SURF }`.

`VTOOLS` is `TOOLS` with the members of `SURF` read as design § Parsing says: `lookup_vendor` false, false, `{ method: "POST", path: "/blocks/erp.lookup_vendor@1" }`; `create_payment` true, true, `POST /blocks/erp.create_payment@1`. `VIEW` is `RAW` without `local`, `registeredAt` and the surface members, with `tools` `VTOOLS`. `RAW` with `pendingSubmittedBy` `"u_dave"` gives `VIEW` with `"u_dave"`, without the member `VIEW` with `null`. `APPROVED`, the detail of an approved server, is `RAW` with `state` `approved`, `approvedDigest` `DA`, `approvedSurface` `SURF`, and `pendingDigest`, `pendingSurface` and `pendingSubmittedBy` `null` (U47: nothing is unapproved) and the refs `acme.lookup_vendor@1`, `acme.create_payment@1` in `tools`; its view is `VTOOLS` with those refs.

`SURF2` is `SURF` with `lookup_vendor` changed to effect `write`, path `/blocks/erp.lookup_vendor@2`, and `create_payment` replaced by `refund` (`pay`, no `untrusted_result`, path `/blocks/erp.refund@1`). `DRIFT_RAW` is `RAW` with `state` `drifted`, `approvedDigest` `DA`, `pendingSubmittedBy` `"u_dave"`, `tools` the approved surface's (U47's `REC_DRIFTED`: the two tools with refs `acme.lookup_vendor@1`, `acme.create_payment@1`), `approvedSurface` `SURF` and `pendingSurface` `SURF2`. Its view `DRIFT_VIEW` holds only the two tools of `SURF2`, `lookup_vendor` with the record's ref.

`LISTITEM` is `RAW` without the two surface members (what `GET /tool-servers` answers); `RAW` with both `null` reads the same. Their view `FLAT` is `VIEW` with the record's tools: `ref` null, `untrusted_result` true, `unsafe_to_retry` false, `http` null. `ACCEPTED` is `APPROVED` without the surface members (the `server` of an approve answer); its view is `FLAT` with `state` `approved`, `approvedDigest` `DA`, `pendingDigest` and `pendingSubmittedBy` `null` and the two refs.

Malformed, each `null` (23): `null`, `"x"`, `[]`, `5`; `RAW` with `id` `Acme` or `__proto__`, `adapter` `soap`, `state` `gone`, `origin` `""`, `registeredBy` `5`, `pendingDigest` `sha256:abc`, `approvedDigest` missing, `tools` `"x"`, a tool named `Bad`, effect `delete`, `ref` `acme`, 101 tools, `pendingSubmittedBy` `5` or `""`, a `pendingSurface` tool with `untrusted_result` `"no"` or with `http` `{ method: "POST" }`, `pendingSurface` `5` or `{ tools: "x" }`.

Texts: `toolRows(VIEW)` `[{ name: "lookup_vendor", effect: "read", block: "—", result: "trusted", call: "POST /blocks/erp.lookup_vendor@1" }, { name: "create_payment", effect: "pay", block: "—", result: "untrusted", call: "POST /blocks/erp.create_payment@1" }]`; `APPROVED`'s view the same with the refs as `block`; `FLAT` `block` "—", `result` "untrusted", `call` "—" for both; `DRIFT_VIEW` `[{ name: "lookup_vendor", effect: "write", block: "acme.lookup_vendor@1", result: "trusted", call: "POST /blocks/erp.lookup_vendor@2" }, { name: "refund", effect: "pay", block: "—", result: "untrusted", call: "POST /blocks/erp.refund@1" }]`. `stateNote(VIEW)` "This server has not been approved. Its tools cannot be used yet. Pending surface 0123456789ab."; `VIEW` drifted with `approvedDigest` `DA` "The surface changed after it was approved. Its tools stop working until the new surface is approved. Approved surface fedcba987654, pending surface 0123456789ab. The table lists the pending surface."; `APPROVED` `null`.

## approvalView rows

`me` is `u_carol`. `MINE`: `VIEW` with `registeredBy` `u_erin`, `pendingSubmittedBy` `u_carol`. `OTHER`: `VIEW` with `pendingSubmittedBy` `u_dave`. `NONE`: `APPROVED`. `DRIFT`: `OTHER` drifted. `UNKNOWN`: `VIEW` with `pendingSubmittedBy` `null` (an answer without the member).

| server, profile | `{ canApprove, selfApproval, message }` |
|---|---|
| `NONE` team, solo | `false`, `false`, "Nothing to approve." |
| `MINE` team | `false`, `false`, "Another admin must approve this surface." |
| `MINE` solo | `true`, `true`, "You submitted this surface. Approving it is recorded as a self-approval." |
| `OTHER` team, solo; `DRIFT` team; `UNKNOWN` team, solo | `true`, `false`, `null` |

## Approval requests

`BODY(s)` is `{ digest: DP, selfApproval: s }`; `TICK` is the Tick message of design § Messages. `approveRequest(server, me, { ticked, ownSurface })`, solo: `MINE`, false, false: `{ ok: false, message: TICK }`; `MINE`, true, false: `{ ok: true, body: BODY(true) }`; `UNKNOWN`, false, false: `BODY(false)`; `UNKNOWN`, false, true: `TICK`; `UNKNOWN`, true, true: `BODY(true)`; `MINE` team and `NONE`, true, false: the `approvalView` messages. `ownBoxShown` is `true` for `({ selfApproval: false }, true)` and `({ selfApproval: true }, false)`, else `false`. `approveDialog(VIEW)` is `{ title: "Approve surface 0123456789ab?", description: "Once approved, the tools of acme can be used in flows that grants allow.", action: "Approve surface" }`, `approveDialog(NONE)` `null`. `SURFACE_APPROVED` is "Surface approved.".

`approveFailure` after `registerToolMessages()`; `ApiRequestError(status, code, "m", { details })`:

| error | `{ message, ownSurface, reload }` |
|---|---|
| 422 `OPERATION_REFUSED`, reason `self_approval_required`; `approver_is_submitter`; `digest_mismatch`; `nothing_pending` | the text of design § Messages for the reason; `ownSurface` `true` for the first only; `reload` `true` for the last two only |
| 422, reason `__proto__` or `weird`; 422 with no `details` | "The engine refused this operation.", `false`, `false` |
| 403 `FORBIDDEN`, `{ decisionId: "dec_1" }` | the `FORBIDDEN` text + " Decision id: dec_1", `false`, `false` |
| 404 `NOT_FOUND`; `new Error("x")` | the `NOT_FOUND` text; the fallback text, both `false`, `false` |

`toolsErrorMessage` of a 422 `OPERATION_REFUSED` gives each of the 13 reasons of design § Messages its text there (the test holds the 13 pairs).

## Grants

`REC(over)` is U49's record (**derived**): `{ id: "grant_1", subject: { kind: "role", role: "author" }, tool: "acme.create_payment@1", scope: { kind: "node", flowId: "pay-run", nodeId: "pay" }, args: [], fingerprints: ["nf1_" + "a" × 64], state: "active", createdBy: "u_carol", createdAt: "2026-11-06T10:00:00.000000Z", revokedBy: null, revokedAt: null, ...over }`; an item is `{ grant: REC(), status }`; the flat `{ ...REC(), status }` is refused (`null`).

| input | view / row text / actions |
|---|---|
| `REC()`, `needs_reconfirm` | `{ id: "grant_1", subject: "role author", tool: "acme.create_payment@1", scope: "pay-run / pay", status: "needs_reconfirm" }`; `role author · acme.create_payment@1 · pay-run / pay · needs_reconfirm`; `{ revoke: true, confirm: true }` |
| `REC({ id: "grant_2", subject: { kind: "user", userId: "u_bob" }, tool: "acme.lookup_vendor@1", scope: { kind: "any_step" } })`, `active` | subject `user u_bob`, scope `any step`; `user u_bob · acme.lookup_vendor@1 · any step · active`; `{ revoke: true, confirm: false }` |
| `REC({ id: "grant_3", state: "revoked" })`, `revoked` | `role author · acme.create_payment@1 · pay-run / pay · revoked`; `{ revoke: false, confirm: false }` |
| `REC({ id: "grant_4", subject: { kind: "role", role: "a" + "9" × 31 } })`, `active` | subject `role ` + the 32 characters; `{ revoke: true, confirm: false }` |
| `REC({ id: "grant_5", subject: { kind: "user", userId: "Ab_-" × 16 }, scope: { kind: "node", flowId: "pay-run-2", nodeId: "pay_2" } })`, `active` | subject `user ` + the 64 characters, scope `pay-run-2 / pay_2`; `{ revoke: true, confirm: false }` |

Malformed, each `null` (17): `null`, `5`, `[]`, `{}`, `REC()` with no `status`, status `gone`, `id` `g1`, `tool` `Acme`, subject kind `team`, subject `{ kind: "role" }`, scope `{ kind: "node", flowId: "pay-run" }`, scope kind `flow`, `userId` `a` U+0000 `b`, and one bad value each: role `Author`, `userId` `a/b`, `flowId` `Pay`, `nodeId` `a-b`.

## grantBody

Base `{ subjectKind: "role", subject: "author", tool: "acme.lookup_vendor@1", scopeKind: "any_step", flowId: "", nodeId: "" }`, whose body `ROLE_ANY` is `{ subject: { kind: "role", role: "author" }, tool: "acme.lookup_vendor@1", scope: { kind: "any_step" }, args: [] }`.

| change | result |
|---|---|
| none; flow `Bad Flow`, step `9` (ignored for any step) | `{ ok: true, body: ROLE_ANY }` |
| user, subject ` u_bob ` | subject `{ kind: "user", userId: "u_bob" }` |
| node, tool `acme.create_payment@1`, flow `pay-run`, step `pay` | scope `{ kind: "node", flowId: "pay-run", nodeId: "pay" }` |
| role `"  "`; user `""` | field `subject`, "Enter a role."; "Enter a user id." |
| role `Author`, `__proto__`; user `a/b` | field `subject`, "A role is lowercase letters, digits and underscores, starting with a letter." (both); "A user id has 1 to 64 letters, digits, underscores and hyphens." |
| tool `""`; each of `lookup`, `acme.lookup_vendor@1000000000`, `acme.lookup_vendor@01` | field `tool`, "Choose a tool."; "Choose a tool from the list." |
| tool `acme.lookup_vendor@999999999` | `{ ok: true, body }` with that tool |
| node, flow `""`; `Pay`, 65 × `a` | field `flowId`, "Enter the flow."; "A flow name is lowercase words joined by hyphens, up to 64 characters." (both) |
| node, flow `pay-run`, step `""`; `a-b` | field `nodeId`, "Enter the step."; "A step id is lowercase letters, digits and underscores, starting with a letter." |

## Policies

`V` is `"599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8"` (U49b's `VBASE`, **derived**), `SRC` is `forbid (principal, action, resource) when { false };`, `REC` is `{ tenantId: "tenant_a", version: V, source: SRC, grantIds: ["grant_1"], deployedBy: "u_carol", deployedAt: "2026-11-06T10:00:00.000000Z" }`.

- `parsePolicyView({ current: REC, pendingGrants: 2 })` is `{ version: V, source: SRC, pendingGrants: 2 }`; `({ current: null, pendingGrants: 0 })` is `{ version: null, source: "", pendingGrants: 0 }`; a 65,536-character source parses. Malformed, each `null` (11): `null`, `[]`, `{}`, `pendingGrants` `-1`, `1.5` or `"2"`, `current` `5`, version `abc`, `current` without `source`, a 65,537-character source, and `{ current: null }` alone.
- Texts: `validationText` of `{ ok: true, problems: [{ stage: "x", ids: [], message: "" }] }` is "Valid."; of `{ ok: false, problems: [] }` "Not valid."; of the problems `reserved` `["grant_x"]`, `policy` `["platform-read-self", "t-1"]`, `parse` `[]` with "unexpected end of input" (empty messages else) "Not valid: reserved grant_x; policy platform-read-self, t-1; parse: unexpected end of input"; `deployText("abc")` "Deployed version abc.", `deployText(V)` "Deployed version 599ac6e14025."; `currentText` of the view of `REC` "Current version 599ac6e14025", with `version` null "No policy deployed."; `pendingText(0)` "All grant changes are deployed.", `(1)` "1 grant change is not deployed.", `(2)` "2 grant changes are not deployed.", `(12)` "12 grant changes are not deployed.".
- `policyErrorText`: 422 reason `policy_invalid` with problems `[{ stage: "policy", ids: ["t-1"], message: "" }, { stage: "reserved", ids: ["grant_x", "grant_y"], message: "" }, { stage: "parse", ids: ["tenant/source"], message: "unexpected end of input" }]` "Not valid: policy t-1; reserved grant_x, grant_y; parse tenant/source: unexpected end of input"; with `problems` `"x"`, `[{ stage: 5, ids: [], message: "" }]` or `[{ stage: "policy", ids: ["t-1"] }]` (no `message`) "The policy is not valid."; 503 `AUTHZ_UNAVAILABLE` "Authorization is unavailable right now. Try again in a moment."; 403 `FORBIDDEN`, `{ decisionId: "dec_9" }` the `FORBIDDEN` text + " Decision id: dec_9".

## Calls

A fake `get`, `post` or `delete` records `[method, path, body, opts]`, `opts` being `undefined` unless shown; the eight records are `["get", "/tool-servers/acme"]`, `["post", "/tool-servers/acme/surface/approve", { digest: DP, selfApproval: false }]`, `["post", "/grants", <the u_bob any-step body>, { headers: { "Idempotency-Key": "k-1" } }]`, `["post", "/grants/grant_1/confirm", {}]`, `["delete", "/grants/grant_1"]`, `["get", "/policies"]`, `["post", "/policies/validate", { source: SRC }]` and `["post", "/policies/deploy", { source: SRC }, { headers: { "Idempotency-Key": "k-1" } }]`. Answers:

- `loadToolServer(get, "acme")` answers `RAW` and returns `VIEW` (with a signal the opts are `{ signal }`); `approveToolSurface(post, "acme", { digest: DP, selfApproval: false })` answers `{ server: ACCEPTED, blocks: ["acme.lookup_vendor@1"] }` and returns the view of `ACCEPTED`. Answers `{ id: 5 }` (load) and `{ blocks: [] }` (approve) reject `ApiRequestError` 200 `INVALID_RESPONSE`; id `a/b` rejects with `RangeError` before a call.
- `postGrant(post, { subjectKind: "user", subject: "u_bob", tool: "acme.lookup_vendor@1", scopeKind: "any_step", flowId: "", nodeId: "" }, "k-1")` answers `REC()` (U49's 201, the flat record) and returns `grant_1` (body: `ROLE_ANY` with subject `{ kind: "user", userId: "u_bob" }`); `confirmGrantById(post, "grant_1")` (200) and `revokeGrantById(delete, "grant_1")` (200, `state` `revoked`) answer a record and resolve with nothing. In all three the answers `{ id: 5 }` and `{ id: "g1" }` reject `INVALID_RESPONSE` (the module-internal check is a record whose `id` matches `^grant_[A-Za-z0-9-]{1,64}$`). Rejections with `RangeError` before a call: subject `""`, key `""`, id `g/1`.
- `loadToolRefs(get)`; `BLK(ref, bound)` is a full item of `GET /blocks` (`block-routes.ts:45-56`: `ref`, `def` with `effect` `read`, `bound`, `contentHash`, `importedAt`): `{ limit: 100 }` answers `BLK("acme.lookup_vendor@1", true)`, `BLK("erp.lookup_vendor@1", false)`, `next_cursor` `c1`; `{ limit: 100, cursor: "c1" }` answers `BLK("acme.create_payment@1", true)`, `next_cursor` `null`; an always-`more` fake answers request n with the one bound item `acme.t<n>@1` and `next_cursor` `c<n>` (cursor `c<n-1>`, none for n = 1): `loadToolRefs` makes 10 requests, the tenth with cursor `c9`, and resolves `acme.t1@1` to `acme.t10@1`; an item `{ ref: 5, bound: true }` or `{ ref: "acme.t@1", bound: "yes" }` rejects `INVALID_RESPONSE`.
- `loadPolicy(get)` answers `{ current: REC, pendingGrants: 2 }`; `validatePolicy(post, SRC)` answers `{ ok: false, policySetVersion: null, problems: [P] }`, `P` being `{ stage: "parse", ids: [], message: "unexpected end of input" }`, and returns `{ ok: false, problems: [P] }`; `deployPolicy(post, SRC, "k-1")` answers `REC` and returns `V`. Key `""` rejects `RangeError`; the answers `{}` (load), `{ ok: "yes", problems: [] }`, `{ ok: true }` and `{ ok: false, problems: [{ stage: "parse", ids: [] }] }` (validate) and `{ version: "x" }` (deploy) reject `INVALID_RESPONSE`.

## Pages

`TOOL_PAGES` rows are the literals of the spec's "Features and navigation" scenario with `file` `64-admin-tool-servers.tsx`, `65-admin-grants.tsx`, `66-admin-policies.tsx`; `TOOL_TITLES` are "Tool servers · Ursitoare", "Grants · Ursitoare", "Policies · Ursitoare". `serverLink` of `acme`, `a/b`; `serverIdFromSearch` of `?server=acme`, `server=beta_2`, `?server=acme&server=beta`, then (`null`) `?server=Acme`, `?server=`, ``, `?other=acme`, `?server=a%2Fb`. `TOOL_TABLES` and `TOOL_NAMES` equal design § Roles and names; the three tables build with `dataTableModel`.

Navigation: a registry of `TOOL_PAGES`, `visibleNav({ status: "ready", me }, registry.nav)` with carol (`read_self`, `read_registry`, `register_tool_server`, `approve_tool_surface`, `deploy_policy`, `manage_tenant`, `manage_users_roles`, `read_audit`; **derived**) then alice (`read_self`, `read_registry`, `read_flow`, `read_run`), `deploy_policy` alone, and the state `null`.

## Page states

`NONE` is `APPROVED`'s view, `me` is `u_carol`, `error` is `ApiRequestError(404, "NOT_FOUND", "m")`, `EMPTY` is `v => v.tools.length === 0`.

- `regionState` of `{ phase: "loading" }` is `{ view: "loading", actionsDisabled: true }`; of `{ phase: "error", error }` `{ view: "error", actionsDisabled: true }`; of `{ phase: "ready", value: VIEW }` with `EMPTY` `ready`; with `{ ...VIEW, tools: [] }` `empty`; with `{ version: null, source: "", pendingGrants: 0 }` and `v => v.version === null` `empty`; the last three have `actionsDisabled: false`.
- `RangeError`: `regionState({ phase: "gone" })`, `actionState({ phase: "gone" })`, `actionState({ phase: "done", text: "" })`.
- `actionState` of `{ phase: "idle" }` is `{ disabled: false, status: null }`; `{ phase: "busy" }` `{ disabled: true, status: null }`; `{ phase: "done", text: "Grant created." }` `{ disabled: false, status: { role: "status", text: "Grant created." } }`; `{ phase: "failed", text: "That role does not exist." }` the same with `role: "alert"` and that text.
- `approveControl(null, me, false)` and `(VIEW, null, false)` are `{ disabled: true, selfApproval: false, message: null }`; `OTHER` team `{ disabled: false, selfApproval: false, message: null }`, busy the same with `disabled: true`; `UNKNOWN` team as `OTHER` team; `MINE` team, `MINE` solo and `NONE` solo the `approvalView` triple of § approvalView rows with `disabled: !canApprove` (`true`, `false`, `true`).

## Page sources

Every page file contains the tokens `regionState(`, `actionState(`, `LoadingState`, `aria-disabled` and `browserSession.api`; the browser tests prove the wiring.
