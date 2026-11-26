## ADDED Requirements

### Requirement: A stored surface is read for trust and the fields a replacement carries
`storedTools(surface)` SHALL return, for a raw `approvedSurface` or `pendingSurface`, a map by tool name of `StoredTool` (absent: `untrusted_result` `true`, `unsafe_to_retry` and `data_class` `null`; `serverName` the `name` of an `mcp` call, else `null`), and `null` for anything that is not a surface (design 2). `trustOf` SHALL give `{ trusted: !untrusted_result, dataClass }`, and `DEFAULT_TRUST` for `undefined`. `carriedFields(adapter, stored, next)` SHALL give `name` (the stored name, only when `next.derivedName` is not `null` and differs) and `unsafe_to_retry` (the stored value, only when the stored effect equals `next.effect`, the value is not `null` and it differs from the adapter's default for that effect: OpenAPI `effect !== "read"`, MCP `true`), so when the effect changes none is sent, the engine applies its default for the new effect and a `false` is never carried onto an operation whose effect changed to `write`, `send` or `pay`; it SHALL never carry a `description`. `carriedAfterEffect` SHALL apply the rule after the admin changes an effect (an MCP Proposed effect is `write`; a skipped OpenAPI operation carries nothing).

#### Scenario: A stored surface gives each tool's trust with the engine's defaults and a malformed one is refused
- **WHEN** `trust.test.ts` runs rows ST1 to ST5, TO1, TO2 (§ Stored surface rows)
- **THEN** ST1 gives four entries in order, ST3 an empty map, each of the 14 surfaces of ST4 `null`; TO1 is `DEFAULT_TRUST` itself, frozen

#### Scenario: A retry flag is carried only when the effect is unchanged
- **WHEN** `trust.test.ts` runs rows CF1 to CF14, CA1 to CA10 (test-plan.md § Carried rows)
- **THEN** CF1 (pay to pay, stored `false`) gives `{ unsafe_to_retry: false }`; CF2 (read stored `false` to `pay`) and CF3 (pay to `send`) give `{}`; CA1, CA3, CA4 give `{ unsafe_to_retry: false }`, CA2 and CA5 to CA10 `{}`

### Requirement: An overlay entry holds only the values that differ from the engine's defaults
`overlayEntry(adapter, effect, trust, carried)` SHALL return the members `effect` (unless `null`), `name`, `untrusted_result: false` (only when `trust.trusted`), `unsafe_to_retry` and `data_class` (only when set), in that order, and nothing for a default (trust off is absent from every body); it SHALL throw `RangeError` for an `openapi` entry without an effect, an effect outside `read`, `write`, `send`, `pay`, a `dataClass` outside `public` and `private` and a `name` outside `^[a-z][a-z0-9_]{0,63}$`. `prefillTrust(stored, operations)` SHALL pair each non-excluded operation that has an `operationId` and a `name` with the stored tool of that name, and `discoverSettings(stored)` each stored tool whose server name is not `__proto__`; each SHALL return `trust` and `carried` records of own keys (operationId, or server tool name), an entry only for a trusted or classed tool or one that carries something, so an untouched Replace sends the stored non-default values. A stored tool whose name the document does not derive is not paired (design 5).

#### Scenario: Overlay entries are built from trust and carried fields, and Replace and Discover prefill them
- **WHEN** `trust-overlay.test.ts` runs rows OE1 to OE7, PF1 to PF6 and DS1 to DS3 (test-plan.md § Overlay rows)
- **THEN** OE1 is `{ effect: "pay" }`, OE2 `{}`, OE4 has five members in order, OE7 throws `RangeError` four times; PF1 gives trust for three operations and carried flags for two, PF2 four entries equal to the stored values, PF3 and PF4 no `unsafe_to_retry`; DS1 gives one trust and one carried entry

### Requirement: Trusting a result needs the fixed warning and a tick for each tool
`TRUST_WARNING` and the eight values of `TRUST_NAMES` SHALL be the texts of § Names of test-plan.md. `ackStatus(trust, baseline, ticks)` SHALL list in `shown` the keys trusted now or with data class `public` that were not so in `baseline` (trust and class compared apart), in `missing` those not ticked (through `trustAckMissing`: trusted or `public`, not ticked), and give `message` `Accept the warning for: <keys joined by ", ">.` or `null`; un-trusting, a private class and a setting already in `baseline` need no tick. `fillName(template, key)` SHALL replace each `{key}` by `key` literally.

#### Scenario: The tick list, the refusal text and the fixed names are as the plan says
- **WHEN** `trust-ack.test.ts` runs rows AK1 to AK9 and NM1 (test-plan.md)
- **THEN** AK3 gives `missing` `["a", "c", "d"]` (`c` only public) and `Accept the warning for: a, c, d.`; AK6 `shown` `[]`; AK7 `["a"]`; AK8 keeps `$&`; NM1 holds the eight values and the 384-character warning

### Requirement: Changes shows the old and new value of each changed field
`valueChangeLines(approved, pending)` SHALL return, per tool present in both surfaces, the lines `Effect: <old> → <new>`, `Result: untrusted → trusted`, `Retry: unsafe → safe` and `Data class: <old> → <new>` (`not set` for none; a value neutralised and cut at 2,000 as descriptions are) in that order and only for a field that differs under the digest's defaults (`untrusted_result` `true`, `unsafe_to_retry` `false`, `data_class` null), and an empty map for an unreadable surface. `withValueLines(view, values)` SHALL append a tool's lines to its `changed <name>: ...` item after its own lines and change nothing else.

#### Scenario: Changed values read as fixed lines under their tool
- **WHEN** `trust-changes.test.ts` runs rows VL1 to VL7 (test-plan.md § Value-line rows)
- **THEN** VL1 gives `find_vendor` `Effect: write → read` and `Result: untrusted → trusted`, `log_note` `Retry: safe → unsafe`; VL2 and VL3 give empty maps; VL5 a 2,044-character line; VL6 appends lines to the two `changed` items only; VL7: a line exists exactly when the diff names the field

### Requirement: The OpenAPI forms carry the trust controls and a Replace keeps the stored values
The "Operations" table of the registration and Replace forms SHALL gain the columns "Result trusted" (a checkbox `Result of <operationId> is trusted`) and "Data class" (a `<select>` `Data class of <operationId>`: "Not set", "public", "private") per operation with an effect select, then under the table the `TRUST_WARNING` paragraph (the `aria-describedby` of every trust checkbox) and a checkbox `I accept the warning for <operationId>` for each key of `ackStatus.shown`. A submit with a missing tick SHALL, after the field refusals, show `ackStatus.message` as the form alert and send nothing. Replace SHALL prefill from `prefillTrust(storedTools(pending ?? approved), operations)`, recompute the carried values with `carriedAfterEffect` when an effect changes and show `replaceHint`.

#### Scenario: The OpenAPI form sources hold the trust controls and keep the page rules
- **WHEN** `trust-pages.test.ts` reads `trust.ts`, `TrustControls.tsx`, `RegisterPage.tsx`, `ReplaceSection.tsx` and `ServersPage.tsx` (test-plan.md § Source rows)
- **THEN** each token is present, `trust.ts` imports no value from `review.ts` or `register.ts`, `ServersPage.tsx` holds `surface={` once and no `useId`, and the five scanners give `[]`

#### Scenario: An OpenAPI server is registered with a trusted result after a tick
- **WHEN** the 3 steps of test-plan-browser.md § Register run
- **THEN** six column headers and the warning once show; "Register server" with `createPayment` trusted and `listVendors` public, both unticked, shows `Accept the warning for: createPayment, listVendors.` and posts nothing; after both ticks the post holds `createPayment: { effect: "pay", untrusted_result: false, data_class: "private" }` and `listVendors: { effect: "read", data_class: "public" }`

#### Scenario: A Replace keeps the stored trust and needs no tick
- **WHEN** the steps R2 and R3 of test-plan-browser.md § Replace run on an approved server whose `create_payment` is trusted, `private` and `unsafe_to_retry` `false`
- **THEN** the hint, the checked box and the value `private` show, with no tick box; the PUT overlay is `createPayment: { effect: "pay", untrusted_result: false, unsafe_to_retry: false, data_class: "private" }` and `listVendors: { effect: "read" }`

#### Scenario: A Replace drops a retry flag when the effect changes
- **WHEN** the steps R2 and R4 run (`createPayment` to `send`, `listVendors` to `pay`)
- **THEN** the PUT overlay is `createPayment: { effect: "send", untrusted_result: false, data_class: "private" }` and `listVendors: { effect: "pay" }`, with no `unsafe_to_retry`

## MODIFIED Requirements

### Requirement: A registration draft becomes the API request or names the field to fix
`mcpRegistration`, `previewRequest`, `openApiRegistration`, `codeRegistration` and the replacement builders `openApiReplacement` and `codeReplacement` (paths `/tool-servers/<id>/openapi` and `/tool-servers/<id>/code`, bodies `{ document, overlay }` and `{ tools }`, a `RangeError` for an id outside the server pattern) SHALL check a draft in this order, first failure winning, and return it as `{ ok: false, field, message }`: `id` "Enter a server id: lowercase letters, digits and underscores, starting with a letter, up to 32 characters."; `url` "Enter a full URL, such as https://mcp.example.com/mcp." or `origin` "Enter a full origin, such as https://tools.example.com." (or, off https, `Use https, or tick "Local network server" for an http address.`); `document` "Paste the OpenAPI document as a JSON object." and, with no effect chosen, `document` "Choose an effect for at least one operation."; `input` "Enter the input schema as a JSON object." and `output` "Enter the output schema as a JSON object." for a code block, else `{ ok: true, path, body }`, never changing the draft. The overlay SHALL hold, for each effect that is not `""`, `overlayEntry("openapi", effect, trust, carried)` of the operation's entries in the optional `OpenApiDraft.trust` and `carried` (keyed by operationId, read with `Object.hasOwn`, absent meaning `DEFAULT_TRUST` and `{}`), so default trust and nothing carried give `{ effect }` and pinned bodies are unchanged; a `dataClass` outside `public` and `private` SHALL throw `RangeError`.

#### Scenario: The three drafts become the registration requests or name the field to fix
- **WHEN** `register.test.ts` runs unedited
- **THEN** `openApiRegistration` with origin `https://Tools.Fake.Test/` and effects `createPayment` `pay`, `get-vendor.v1` `read` gives origin `https://tools.fake.test` and an overlay of exactly those two `{ effect }` entries; every other pinned row gives its path and body or its `field` and text, the first failing field wins and no draft is changed

#### Scenario: A draft with trust and carried fields builds the overlay with only the members that differ
- **WHEN** `register-trust.test.ts` runs rows RG0 to RG2 (test-plan.md § Draft rows)
- **THEN** RG0 equals the frozen overlay; RG1 gives `createPayment` four members, `getVendor` `{ effect: "read", name: "get_it", data_class: "public" }`, `toString` `{ effect: "read" }` and no `listVendors`; RG2 throws `RangeError`

### Requirement: Effect settings become the overlay body and a discovery answer names every tool left out
`DiscoverDraft` SHALL hold `effects` (`""`, `read`, `write`, `send`, `pay` or `skip` per server tool name), optional `names` and optional `trust` and `carried` (keyed by server tool name). `initialDraft(tools)` SHALL give each tool with a `serverName` (not `__proto__`) the effect `""` for `write` and its effect otherwise, and a name when its tool name differs from the server's (a tool not in `tools` has no entry, so the body leaves it to the proposal). `discoverBody(draft)` SHALL return `{ tools }` holding per tool `{ skip: true }` for `skip`, else `overlayEntry("mcp", effect or null, trust, carried plus the name)` when it has a member and no entry otherwise, none for `__proto__` (it defaults); every lookup by a server tool name SHALL use `Object.hasOwn`; it SHALL throw `RangeError` for a key (of `effects`, `names`, `trust` or `carried`) outside `^[A-Za-z0-9_.-]{1,128}$`, an effect outside the list, a name outside `^[a-z][a-z0-9_]{0,63}$`, a data class outside `public` and `private` and more than 100 keys. `parseDiscovery(raw)` SHALL return `{ protocolVersion, era, count, excluded }` for a `{ server, era, protocolVersion, excluded }` answer, `count` being the length of `server.tools` (at most 100), `era` `modern` or `legacy`, `protocolVersion` one of `2026-07-28`, `2025-11-25`, `2025-06-18`, `2025-03-26`, and `excluded` at most 1,000 entries of a string `name` and a `reason` `^[a-z][a-z0-9_]{0,63}$`; anything else is `null`. `discoveryText(d)` SHALL be `Discovered ${count} tools over MCP ${protocolVersion}.` and, when any tool was left out, ` Left out: ` plus `<name> (<reason>)` joined by `, `, a name neutralised as the descriptions are (C6) and cut to 79 characters and `…` when over 80; an entry with reason `description` reads `<name> (description dropped, tool kept)`.

#### Scenario: Settings become the body and a discovery is worded with every tool left out
- **WHEN** `review-discover.test.ts` runs unedited
- **THEN** `initialDraft` of `find_vendor` (`read`) and `log_note` (`write`) gives effects `{ find_vendor: "read", log_note: "" }`; `discoverBody` gives `{ tools: {} }` and `{ find_vendor: { effect: "read" } }` and throws `RangeError` five times; `parseDiscovery` gives `null` for 11 answers; `discoveryText` ends " Left out: route_ticket (x_mcp_header), has space? (name_invalid)"

#### Scenario: A settings draft with trust and carried fields builds the overlay body
- **WHEN** `review-trust.test.ts` runs rows DB0 to DB6 (test-plan.md § Draft rows)
- **THEN** DB1 gives `find_vendor` `{ effect: "read", untrusted_result: false, data_class: "private" }` and `"Log.Note"` `{ name: "note", unsafe_to_retry: false }`; DB2 drops `unsafe_to_retry` when `Log.Note` goes to `send`; DB3 to DB5 give the skip, name, key-only, `__proto__` and `toString` bodies; DB6 throws `RangeError` three times and passes 100 keys

### Requirement: The server page shows discovery, settings, changes and calls
For an MCP server the page SHALL show a region named by `h2` "Discovery" with the button "Discover tools" (`aria-disabled` and inert while the detail loads, has failed or a discovery runs), which posts `discoverBody` of `initialDraft(tools)` with the `trust` and `carried` of `discoverSettings` of the approved surface and a fresh `Idempotency-Key`, `tools` being those of the approved surface (`[]` when it has none or is unreadable), so a rediscovery keeps the effects and the stored trust and `{ tools: {} }` is posted before any approval; with a readable pending surface, or after a `name_collision` refusal (the rows are then the colliding names at default trust, nothing carried), it SHALL show the table "Tool settings" with per row a textbox "Tool name of <server tool name>" (empty unless `initialDraft` gives a name), a combobox "Effect of <server tool name>" (options "Proposed", "read", "write", "send", "pay", "Skip", starting at `initialDraft`), a checkbox `Result of <server tool name> is trusted` and a combobox `Data class of <server tool name>` (both start at the pending surface's values), then the `TRUST_WARNING` paragraph, a checkbox `I accept the warning for <name>` for each key of `ackStatus.shown` and the button "Discover again with these settings", which posts `discoverBody` of the draft (an effect change recomputes that tool's carried values with `carriedAfterEffect`) or, with a tick missing, shows `ackStatus.message` as the Discovery alert and posts nothing; each loaded detail resets the draft. A success SHALL show `discoveryText` as a status and read the detail again; a refusal SHALL show `discoveryErrorText` as an alert and not read it. Every server SHALL show `h2` "Changes" with the list "Changes" (each item its text, then its lines, a changed tool's last lines being its `valueChangeLines`) or the `changesView` text, and the table "Calls" of the pending surface, else the approved one, then the `readNote` sentence when it is not `null`.

#### Scenario: An MCP server is discovered, given a setting and discovered again
- **WHEN** `e2e/test_m7_tool_review.py::test_discovery_settings_and_calls` runs unedited (its four discoveries)
- **THEN** the third post is `{"tools": {"Find.Vendor": {"name": "find_vendor_2"}}}` and the fourth `{"tools": {"find_vendor": {"effect": "read"}, "log_note": {"skip": true}}}`; no body holds a trust member

#### Scenario: The Changes list and the Calls table of a drifted server
- **WHEN** `e2e/test_m7_tool_review.py::test_changes_and_calls_of_a_drifted_server` runs unedited
- **THEN** "Changes" lists `changed find_vendor: hints` and `changed log_note: effect, description`; "Discover tools" posts `{"tools": {"find_vendor": {"effect": "read"}}}`

#### Scenario: Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines
- **WHEN** the steps of test-plan-browser.md § Tool settings run on a drifted server whose pending surface trusts `log_note` (`public`, stored `unsafe_to_retry` `false`) and `find_vendor` (`private`)
- **THEN** the table has six column headers and "Changes" holds `Result: untrusted → trusted`; "Discover tools" posts the approved surface's trust and `log_note`'s `unsafe_to_retry: false`; trusting `ping` and moving `log_note` to `send` and pressing "Discover again with these settings" shows `Accept the warning for: ping.` with no post; after the tick the second post holds three trust entries and no `unsafe_to_retry`

#### Scenario: The Tool settings sources hold the trust controls and keep the page rules
- **WHEN** `trust-review-pages.test.ts` reads `ReviewSections.tsx` and `messages.ts` (test-plan.md § Source rows)
- **THEN** each token is present, `ReviewSections.tsx` has at most two `tools-feedback` and no `data-tone="primary"`, and the five scanners give `[]`
