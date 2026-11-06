# Test plan: fixtures and expected values

**Ran** on 2026-11-06 in a scratch copy of main@cf34c628 (Node 24.22.2): prototypes of the `web/src/tools` modules under `node --test` printed every value below not marked **derived**, and `tsc -p web/tsconfig.json --noEmit` reports nothing in `web/src/tools/`. **Derived**: read from the sibling folders. A recording fake keeps `[method, path, body, opts]` of every call.

## Tool servers

`DP` is `"sha256:" + "0123456789ab" + "c" × 52` (`shortDigest` `0123456789ab`), `DA` is `"sha256:" + "fedcba987654" + "d" × 52`. `RAW`, the answer of `GET /tool-servers/acme` (**derived**: U47's `REC_PENDING` plus the surface members): `{ id: "acme", adapter: "fixture", origin: "https://tools.fake.test", local: false, state: "pending", registeredBy: "u_carol", registeredAt: "2026-11-06T10:00:00.000000Z", approvedDigest: null, pendingDigest: DP, tools: TOOLS, approvedSurface: null, pendingSurface: SURF }`, with `TOOLS` `[{ name: "lookup_vendor", effect: "read", ref: null }, { name: "create_payment", effect: "pay", ref: null }]` and `SURF` `{ tools: [{ name: "lookup_vendor", effect: "read", input: { type: "object" }, output: { type: "object" }, untrusted_result: false, http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" } }, { name: "create_payment", effect: "pay", input: { type: "object" }, output: { type: "object" }, unsafe_to_retry: true, http: { method: "POST", path: "/blocks/erp.create_payment@1" } }] }` (U47's `ToolSurface` members; the second tool leaves `untrusted_result` out, so it reads true).

`VTOOLS` is `[{ name: "lookup_vendor", effect: "read", ref: null, untrusted_result: false, unsafe_to_retry: false, http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" } }, { name: "create_payment", effect: "pay", ref: null, untrusted_result: true, unsafe_to_retry: true, http: { method: "POST", path: "/blocks/erp.create_payment@1" } }]`. `VIEW` is `{ id: "acme", adapter: "fixture", origin: "https://tools.fake.test", state: "pending", registeredBy: "u_carol", pendingDigest: DP, approvedDigest: null, tools: VTOOLS, pendingSubmittedBy: null }`. `APPROVED` is `RAW` with `state` `approved`, `approvedDigest` `DA`, `approvedSurface` `SURF`, `pendingDigest` and `pendingSurface` `null`, refs `acme.lookup_vendor@1` and `acme.create_payment@1`, `pendingSubmittedBy` `"u_dave"`; its view holds `VTOOLS` with those refs (the members come from `approvedSurface`). `NOSURF` is `RAW` with `pendingSurface` `null`: its tools read `untrusted_result` true, `unsafe_to_retry` false and `http` null.

Malformed, each `null` (21): `null`, `"x"`, `[]`, `5`; `RAW` with `id` `Acme` or `__proto__`, `adapter` `soap`, `state` `gone`, `origin` `""`, `registeredBy` `5`, `pendingDigest` `sha256:abc`, `approvedDigest` missing, `tools` `"x"`, a tool named `Bad`, effect `delete`, `ref` `acme`, 101 tools, `pendingSubmittedBy` `5` or `""`, a `pendingSurface` tool with `untrusted_result` `"no"`, a `pendingSurface` tool with `http` `{ method: "POST" }`.

Texts: `toolRows(VIEW)` `[{ name: "lookup_vendor", effect: "read", block: "—", result: "trusted", call: "POST /blocks/erp.lookup_vendor@1" }, { name: "create_payment", effect: "pay", block: "—", result: "untrusted", call: "POST /blocks/erp.create_payment@1" }]`, and the rows of `NOSURF`'s view have `result` "untrusted" and `call` "—" for both tools; `stateNote(VIEW)` "This server has not been approved. Its tools cannot be used yet. Pending surface 0123456789ab."; `VIEW` drifted with `approvedDigest` `DA` "The surface changed after it was approved. Its tools stop working until the new surface is approved. Approved surface fedcba987654, pending surface 0123456789ab."; `APPROVED` `null`.

## approvalView rows

`me` is `u_carol`. `MINE`: `VIEW` with `registeredBy` `u_erin`, `pendingSubmittedBy` `u_carol`. `OTHER`: `VIEW` with `pendingSubmittedBy` `u_dave` (the registrar `u_carol` is not the submitter). `NONE`: `APPROVED`. `DRIFT`: `OTHER` drifted. `UNKNOWN`: `VIEW`.

| server, profile | `{ canApprove, selfApproval, message }` |
|---|---|
| `NONE` team, solo | `false`, `false`, "Nothing to approve." |
| `MINE` team | `false`, `false`, "Another admin must approve this surface." |
| `MINE` solo | `true`, `true`, "You submitted this surface. Approving it is recorded as a self-approval." |
| `OTHER` team, solo; `DRIFT` team; `UNKNOWN` team, solo | `true`, `false`, `null` |

## Approval requests

`BODY(s)` is `{ digest: DP, selfApproval: s }`; `TICK` is 'Tick "I approve my own surface" to approve a surface you submitted.'. `approveRequest(server, me, { ticked, ownSurface })`, solo: `MINE`, false, false: `{ ok: false, message: TICK }`; `MINE`, true, false: `{ ok: true, body: BODY(true) }`; `UNKNOWN`, false, false: `BODY(false)`; `UNKNOWN`, false, true: `TICK`; `UNKNOWN`, true, true: `BODY(true)`; `MINE` team and `NONE`, true, false: the `approvalView` messages. `ownBoxShown` is `true` for `({ selfApproval: false }, true)` and `({ selfApproval: true }, false)`, `false` for `({ selfApproval: false }, false)`. `approveDialog(VIEW)` is `{ title: "Approve surface 0123456789ab?", description: "Once approved, the tools of acme can be used in flows that grants allow.", action: "Approve surface" }`, `approveDialog(NONE)` `null`.

`approveFailure` after `registerToolMessages()`; `ApiRequestError(status, code, "m", { details })`:

| error | `{ message, ownSurface }` |
|---|---|
| 422 `OPERATION_REFUSED`, reason `self_approval_required` | 'You submitted this surface. Tick "I approve my own surface" to approve it.', `true` |
| 422, `approver_is_submitter` | "Another admin must approve this surface.", `false` |
| 422, `digest_mismatch` | "The surface changed while you were reading it. Reload the page and review it again.", `false` |
| 422, `nothing_pending` | "Nothing to approve.", `false` |
| 422, `__proto__` or `weird` | "The engine refused this operation.", `false` |
| 403 `FORBIDDEN`, `{ decisionId: "dec_1" }` | the `FORBIDDEN` text + " Decision id: dec_1", `false` |
| 404 `NOT_FOUND`; `new Error("x")` | the `NOT_FOUND` text; the fallback text, both `false` |

## Grants

`REC(over)` is U49's record (**derived**): `{ id: "grant_1", subject: { kind: "role", role: "author" }, tool: "acme.create_payment@1", scope: { kind: "node", flowId: "pay-run", nodeId: "pay" }, args: [], fingerprints: ["nf1_" + "a" × 64], state: "active", createdBy: "u_carol", createdAt: "2026-11-06T10:00:00.000000Z", revokedBy: null, revokedAt: null, ...over }`; an item is `{ grant: REC(), status }`; the flat `{ ...REC(), status }` is refused (`null`).

| input | view / row text / actions |
|---|---|
| `REC()`, `needs_reconfirm` | `{ id: "grant_1", subject: "role author", tool: "acme.create_payment@1", scope: "pay-run / pay", status: "needs_reconfirm" }`; `role author · acme.create_payment@1 · pay-run / pay · needs_reconfirm`; `{ revoke: true, confirm: true }` |
| `REC({ id: "grant_2", subject: { kind: "user", userId: "u_bob" }, tool: "acme.lookup_vendor@1", scope: { kind: "any_step" } })`, `active` | subject `user u_bob`, scope `any step`; `user u_bob · acme.lookup_vendor@1 · any step · active`; `{ revoke: true, confirm: false }` |
| `REC({ id: "grant_3", state: "revoked" })`, `revoked` | `role author · acme.create_payment@1 · pay-run / pay · revoked`; `{ revoke: false, confirm: false }` |

Malformed, each `null` (13): `null`, `5`, `[]`, `{}`, `REC()` with no `status`, status `gone`, `id` `g1`, `tool` `Acme`, subject kind `team`, subject `{ kind: "role" }`, scope `{ kind: "node", flowId: "pay-run" }`, scope kind `flow`, `userId` `a` U+0000 `b`.

## grantBody

Base `{ subjectKind: "role", subject: "author", tool: "acme.lookup_vendor@1", scopeKind: "any_step", flowId: "", nodeId: "" }`, whose body `ROLE_ANY` is `{ subject: { kind: "role", role: "author" }, tool: "acme.lookup_vendor@1", scope: { kind: "any_step" }, args: [] }`.

| change | result |
|---|---|
| none; flow `Bad Flow`, step `9` (ignored for any step) | `{ ok: true, body: ROLE_ANY }` |
| user, subject ` u_bob ` | subject `{ kind: "user", userId: "u_bob" }` |
| node, tool `acme.create_payment@1`, flow `pay-run`, step `pay` | scope `{ kind: "node", flowId: "pay-run", nodeId: "pay" }` |
| role `"  "`; user `""` | field `subject`, "Enter a role."; "Enter a user id." |
| role `Author`, `__proto__`; user `a/b` | field `subject`, "A role is lowercase letters, digits and underscores, starting with a letter." (both); "A user id has 1 to 64 letters, digits, underscores and hyphens." |
| tool `""`; `lookup` | field `tool`, "Choose a tool."; "Choose a tool from the list." |
| node, flow `""`; `Pay`, 65 × `a` | field `flowId`, "Enter the flow."; "A flow name is lowercase words joined by hyphens, up to 64 characters." (both) |
| node, flow `pay-run`, step `""`; `a-b` | field `nodeId`, "Enter the step."; "A step id is lowercase letters, digits and underscores, starting with a letter." |

## Policies

`V` is `"599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8"` (U49b's `VBASE`, **derived**), `SRC` is `forbid (principal, action, resource) when { false };`, `REC` is `{ tenantId: "tenant_a", version: V, source: SRC, grantIds: ["grant_1"], deployedBy: "u_carol", deployedAt: "2026-11-06T10:00:00.000000Z" }`.

- `parsePolicyView({ current: REC, pendingGrants: 2 })` is `{ version: V, source: SRC, pendingGrants: 2 }`; `({ current: null, pendingGrants: 0 })` is `{ version: null, source: "", pendingGrants: 0 }`; a 65,536-character source parses. Malformed, each `null` (11): `null`, `[]`, `{}`, `pendingGrants` `-1`, `1.5` or `"2"`, `current` `5`, version `abc`, `current` without `source`, a 65,537-character source, and `{ current: null }` alone.
- Texts: `validationText` of `{ ok: true, problems: [{ stage: "x", ids: [], message: "" }] }` is "Valid."; of `{ ok: false, problems: [] }` "Not valid."; of the problems `{ stage: "reserved", ids: ["grant_x"], message: "" }`, `{ stage: "policy", ids: ["platform-read-self", "t-1"], message: "" }`, `{ stage: "parse", ids: [], message: "unexpected end of input" }` the spec's text (U49b's `message`s: Cedar's text for `parse` and `validate`, `""` for the other stages); `deployText("abc")` "Deployed version abc."; `pendingText(12)` "12 grant changes are not deployed.".
- `policyErrorText`: 422 reason `policy_invalid` with problems `[{ stage: "policy", ids: ["t-1"], message: "" }, { stage: "reserved", ids: ["grant_x", "grant_y"], message: "" }, { stage: "parse", ids: ["tenant/source"], message: "unexpected end of input" }]` "Not valid: policy t-1; reserved grant_x, grant_y; parse tenant/source: unexpected end of input"; with `problems` `"x"`, `[{ stage: 5, ids: [], message: "" }]` or `[{ stage: "policy", ids: ["t-1"] }]` (no `message`) "The policy is not valid."; 503 `AUTHZ_UNAVAILABLE` "Authorization is unavailable right now. Try again in a moment."; 403 `FORBIDDEN`, `{ decisionId: "dec_9" }` the `FORBIDDEN` text + " Decision id: dec_9".

## Calls

A fake `get`, `post` or `delete` records `[method, path, body, opts]` and answers as follows; the expected records are the spec's.

- `loadToolServer(get, "acme")` answers `RAW` and returns `VIEW` (with a signal the opts are `{ signal }`); `approveToolSurface(post, "acme", { digest: DP, selfApproval: false })` answers `{ server: RAW, blocks: ["acme.lookup_vendor@1"] }` and returns `VIEW`. Answers `{ id: 5 }` (load) and `{ blocks: [] }` (approve) reject `ApiRequestError` 200 `INVALID_RESPONSE`; id `a/b` rejects `RangeError` before a call.
- `postGrant(post, { subjectKind: "user", subject: "u_bob", tool: "acme.lookup_vendor@1", scopeKind: "any_step", flowId: "", nodeId: "" }, "k-1")` answers `REC()` and returns `grant_1` (body `{ subject: { kind: "user", userId: "u_bob" }, tool: "acme.lookup_vendor@1", scope: { kind: "any_step" }, args: [] }`); `confirmGrantById(post, "grant_1")` and `revokeGrantById(delete, "grant_1")` answer a record. `RangeError` before a call: subject `""`, key `""`, id `g/1`; the answer `{ id: 5 }` rejects `INVALID_RESPONSE`.
- `loadToolRefs(get)`: `{ limit: 100 }` answers items `acme.lookup_vendor@1` (`bound` true), `erp.lookup_vendor@1` (false), `next_cursor` `c1`; `{ limit: 100, cursor: "c1" }` answers `acme.create_payment@1` (true), `next_cursor` `null`; an always-`more` cursor makes 10 calls; an item `{ ref: 5 }` rejects `INVALID_RESPONSE`.
- `loadPolicy(get)` answers `{ current: REC, pendingGrants: 2 }`; `validatePolicy(post, SRC)` answers `{ ok: false, policySetVersion: null, problems: [{ stage: "parse", ids: [], message: "unexpected end of input" }] }`; `deployPolicy(post, SRC, "k-1")` answers `REC`. Key `""` rejects `RangeError`; the answers `{}` (load), `{ ok: "yes", problems: [] }`, `{ ok: true }` and `{ ok: false, problems: [{ stage: "parse", ids: [] }] }` (validate) and `{ version: "x" }` (deploy) reject `INVALID_RESPONSE`.

## Pages

`TOOL_PAGES` rows `[id, file, path, navLabel, capability]`: `admin-tool-servers`, `64-admin-tool-servers.tsx`, `/admin/tool-servers`, "Tool servers", `register_tool_server`; `admin-grants`, `65-admin-grants.tsx`, `/admin/grants`, "Grants", `deploy_policy`; `admin-policies`, `66-admin-policies.tsx`, `/admin/policies`, "Policies", `deploy_policy`. `TOOL_TITLES` "Tool servers · Ursitoare", "Grants · Ursitoare", "Policies · Ursitoare". `serverLink("acme")` is `/admin/tool-servers?server=acme`, `serverLink("a/b")` throws `RangeError`; `serverIdFromSearch`: `?server=acme` `acme`, `server=beta_2` `beta_2`, `?server=acme&server=beta` `acme`; `?server=Acme`, `?server=`, ``, `?other=acme`, `?server=a%2Fb` `null`. `TOOL_TABLES` and `TOOL_NAMES` equal design § Roles and names; the three tables build with `dataTableModel`, cell tags `th, td`; `th, td, td, td, td`; `th, td`.

Navigation: a registry of `TOOL_PAGES`, `visibleNav({ status: "ready", me }, registry.nav)` with carol (`read_self`, `register_tool_server`, `approve_tool_surface`, `deploy_policy`, `manage_tenant`, `manage_users_roles`, `read_audit`; **derived** from U47's carol list plus U49's fragment) `["Tool servers", "Grants", "Policies"]`; alice (`read_self`, `read_flow`, `read_run`) `[]`; `deploy_policy` alone `["Grants", "Policies"]`; the state `null` `[]`.
