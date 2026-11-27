# Questions — add-web-tool-trust

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | answered | none | verdict | Criterion C-f52c8d49 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick): accept as sati |
| Q-002 | answered | none | verdict | Criterion C-3a1c08af (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-08abe836 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix): accept as satisf |
| Q-005 | answered | none | verdict | Criterion C-7374d16f (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out |
| Q-006 | answered | none | verdict | Criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server): accept as satisfied? |
| Q-007 | answered | none | verdict | Criterion C-c7bb4abe (web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value l |
| Q-008 | answered | none | verdict | Finding F-4ee90a68: discoverBody neither validates nor emits keys that appear only in a draft's carried map |
| Q-009 | answered | none | verdict | Finding F-1b3e37fc: Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults |
| Q-010 | answered | none | verdict | Hold H-fd0a4300: UI criterion C-f52c8d49 has no end-to-end test; see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-ec069147: UI criterion C-3a1c08af has no end-to-end test; see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-91b47a21: UI criterion C-08abe836 has no end-to-end test; see the generated UI tests table |
| Q-013 | answered | none | verdict | Hold H-95bd71c9: UI criterion C-3ad08589 has no end-to-end test; see the generated UI tests table |
| Q-014 | answered | none | verdict | Hold H-4d97dc56: UI criterion C-7374d16f has no end-to-end test; see the generated UI tests table |
| Q-015 | answered | none | verdict | Hold H-c8ca5be3: UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table |
| Q-016 | answered | none | verdict | Hold H-c196208f: UI criterion C-c7bb4abe has no end-to-end test; see the generated UI tests table |
| Q-017 | answered | none | verdict | Hold H-abcad329: UI criterion C-c4fa5fc4 has no end-to-end test; see the generated UI tests table |
| Q-018 | answered | none | verdict | Hold H-1f2ad2b0: UI criterion C-f43385f5 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-f52c8d49 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick): accept as sati

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-f52c8d49 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick)

### Context
Criterion C-f52c8d49 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › An OpenAPI server is registered with a trusted result after a tick) is needs human after round 1.

Scenario:
\- **WHEN** the 3 steps of test-plan-browser.md § Register run
\- **THEN** six column headers and the warning once show; "Register server" with `createPayment` trusted and `listVendors` public, both unticked, shows `Accept the warning for: createPayment, listVendors.` and posts nothing; after both ticks the post holds `createPayment: { effect: "pay", untrusted_result: false, data_class: "private" }` and `listVendors: { effect: "read", data_class: "public" }`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m8_tool_trust::test_register_with_a_trusted_result[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied by the code as it stands. The registration Operations table renders the six headers in order, each non-excluded row gets a TrustToggle described by the warning paragraph that TrustNotes renders once, and the excluded exportVendors row gets no controls. ackStatus with an empty baseline lists createPayment and listVendors once they are trusted and public, submit runs the field checks first and then puts the message Accept the warning for: createPayment, listVendors. into the $form error, which the Form kit renders as the role alert, and returns before registerServer is called. With both ticks the overlay built by overlayEntry is createPayment { effect: pay, untrusted_result: false, data_class: private } and listVendors { effect: read, data_class: public }, and navigate(serverLink) ends the URL with ?server=ledger. The browser test asserts exactly these values; it was not run in a gate, but every assertion follows from the code.
---

## Q-002: Criterion C-3a1c08af (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-3a1c08af (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick)

### Context
Criterion C-3a1c08af (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace keeps the stored trust and needs no tick) is needs human after round 1.

Scenario:
\- **WHEN** the steps R2 and R3 of test-plan-browser.md § Replace run on an approved server whose `create_payment` is trusted, `private` and `unsafe_to_retry` `false`
\- **THEN** the hint, the checked box and the value `private` show, with no tick box; the PUT overlay is `createPayment: { effect: "pay", untrusted_result: false, unsafe_to_retry: false, data_class: "private" }` and `listVendors: { effect: "read" }`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m8_tool_trust::test_replace_keeps_the_stored_trust[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. ServersPage passes the pending surface, else the approved one, to ReplaceSection, which reads it with storedTools. After the preview, prefillTrust pairs createPayment with the stored create_payment and gives trusted and private, and carriedFields keeps unsafe_to_retry false because the effect is unchanged and false differs from the OpenAPI default for pay; list_vendors stored false equals the read default so nothing is carried. The baseline is set to the prefilled trust, so ackStatus shows no tick. The document field carries the replaceHint as its hint, which the Field kit wires into aria-describedby. Save builds createPayment { effect: pay, untrusted_result: false, unsafe_to_retry: false, data_class: private } and listVendors { effect: read } and PUTs it once, then reloads the detail. The Tool settings warning renders only for MCP servers, so the warning counts once on this OpenAPI page.
---

## Q-003: Criterion C-08abe836 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-08abe836 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes)

### Context
Criterion C-08abe836 (web-tools › The OpenAPI forms carry the trust controls and a Replace keeps the stored values › A Replace drops a retry flag when the effect changes) is needs human after round 1.

Scenario:
\- **WHEN** the steps R2 and R4 run (`createPayment` to `send`, `listVendors` to `pay`)
\- **THEN** the PUT overlay is `createPayment: { effect: "send", untrusted_result: false, data_class: "private" }` and `listVendors: { effect: "pay" }`, with no `unsafe_to_retry`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m8_tool_trust::test_replace_drops_the_retry_flag_on_an_effect_change[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. Changing an effect in the Replace form calls carriedAfterEffect with the operation's derived name as the lookup, and carriedFields drops unsafe_to_retry whenever the stored effect differs from the new one, so moving createPayment from pay to send and listVendors from read to pay leaves both carried records empty and the handler removes the operation's entry. The trust record is untouched, so no tick appears and the overlay built by overlayEntry is createPayment { effect: send, untrusted_result: false, data_class: private } and listVendors { effect: pay }, with no unsafe_to_retry, exactly as the browser test asserts.
---

## Q-004: Criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix): accept as satisf

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix)

### Context
Criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix) is needs human after round 1.

Scenario:
\- **WHEN** `register.test.ts` runs unedited
\- **THEN** `openApiRegistration` with origin `https://Tools.Fake.Test/` and effects `createPayment` `pay`, `get-vendor.v1` `read` gives origin `https://tools.fake.test` and an overlay of exactly those two `{ effect }` entries; every other pinned row gives its path and body or its `field` and text, the first failing field wins and no draft is changed

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: web.src.tools.register.test.ts::C-3ad08589 codeRegistration builds one tool without a description and one with it (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 codeRegistration refuses the input before the output schema (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 codeReplacement checks the schemas and refuses a server id off the pattern (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 mcpRegistration builds the trimmed MCP body and refuses the id before the url (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 mcpRegistration keeps a local http address as typed (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 no builder changes the draft it is given (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 openApiRegistration builds the overlay of the chosen effects and refuses the first failing field (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 openApiReplacement checks the document and overlay and ignores the origin (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 previewRequest sends the origin it parses and the document, refusing origin first (no proof that it discriminates (no red, audit or generated record)); web.src.tools.register.test.ts::C-3ad08589 the replacement builders build the PUT bodies and refuse a bad server id (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. It names a frozen test of an earlier unit that must stay green unedited, so by construction no red of this unit can trace it; the proof is that its assertions still hold against the edited builders. operationOverlay now reads the optional trust and carried records with Object.hasOwn and falls back to DEFAULT_TRUST and an empty carried record, and overlayEntry then writes only the effect, so the OPENAPI draft with createPayment pay and get-vendor.v1 read still gives exactly those two { effect } entries with the lowercased origin, every refusal row still returns its field and text in the pinned order, and no builder mutates its draft. The lint failure in the latest gate is an unused import in trust-changes.test.ts and does not touch this file or these builders.
---

## Q-005: Criterion C-7374d16f (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-7374d16f (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out)

### Context
Criterion C-7374d16f (web-tools › Effect settings become the overlay body and a discovery answer names every tool left out › Settings become the body and a discovery is worded with every tool left out) is needs human after round 1.

Scenario:
\- **WHEN** `review-discover.test.ts` runs unedited
\- **THEN** `initialDraft` of `find_vendor` (`read`) and `log_note` (`write`) gives effects `{ find_vendor: "read", log_note: "" }`; `discoverBody` gives `{ tools: {} }` and `{ find_vendor: { effect: "read" } }` and throws `RangeError` five times; `parseDiscovery` gives `null` for 11 answers; `discoveryText` ends " Left out: route_ticket (x_mcp_header), has space? (name_invalid)"

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: web.src.tools.review-discover.test.ts::C-7374d16f discoverBody builds the overlay body and omits proto entries (B1) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f discoverBody rejects bad keys, effects, names and too many entries (B2) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f discoveryText cuts a long neutralised name to 79 characters (X3) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f discoveryText neutralises a bidi name (X5) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f discoveryText states the count, version and left-out tools (X1, X2, X4, X6) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f initialDraft keeps a name only when it differs and omits proto tools (I2) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f initialDraft reads the approved tools and keeps only server tools (I1) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f parseDiscovery reads a valid discovery answer (P1) (no proof that it discriminates (no red, audit or generated record)); web.src.tools.review-discover.test.ts::C-7374d16f parseDiscovery rejects malformed answers (P2) (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. It names a frozen test of an earlier unit that must stay green unedited, so no red of this unit can trace it; the proof is that its assertions hold against the edited review.ts. initialDraft still returns effects and an always-present names record, discoverBody still gives { tools: {} } for an empty draft, builds { find_vendor: { effect: read } } while dropping log_note whose entry is empty, removes the __proto__ key, and throws RangeError for a key with a space, an empty key, an unknown effect, a bad name and 101 keys while passing 100; parseDiscovery returns null for the 11 malformed answers and discoveryText neutralises, cuts at 79 characters and words the left-out list exactly as pinned. The latest gate's lint failure is an unused import in trust-changes.test.ts and does not touch review.ts or this test.
---

## Q-006: Criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server)

### Context
Criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server) is needs human after round 1.

Scenario:
\- **WHEN** `e2e/test_m7_tool_review.py::test_changes_and_calls_of_a_drifted_server` runs unedited
\- **THEN** "Changes" lists `changed find_vendor: hints` and `changed log_note: effect, description`; "Discover tools" posts `{"tools": {"find_vendor": {"effect": "read"}}}`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m7_tool_review::test_changes_and_calls_of_a_drifted_server[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied by the code as it stands. The M7 drifted-server browser test is frozen from an earlier unit and runs unedited, so no red of this unit can trace it; its assertions hold against the edited review sections. Discover tools now posts discoverBody of initialDraft of the approved tools with the trust and carried records of discoverSettings of the approved surface. In that test every approved tool is untrusted with no data class, and each stored unsafe_to_retry is true, which equals the MCP default, so nothing is carried and the body is find_vendor with effect read alone, log_note and old_tool dropping out as empty entries. The Changes list keeps its item texts: find_vendor differs only in hints so valueChangeLines gives it no line, and log_note gains the line Effect: write → send under its unchanged item text, which the contain-text assertions tolerate. The Tool settings table is rendered by the kit DataTable inside a wrapper with horizontal overflow, so the two new columns cannot widen the page.
---

## Q-007: Criterion C-c7bb4abe (web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value l

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-c7bb4abe (web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines)

### Context
Criterion C-c7bb4abe (web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value lines) is needs human after round 1.

Scenario:
\- **WHEN** the steps of test-plan-browser.md § Tool settings run on a drifted server whose pending surface trusts `log_note` (`public`, stored `unsafe_to_retry` `false`) and `find_vendor` (`private`)
\- **THEN** the table has six column headers and "Changes" holds `Result: untrusted → trusted`; "Discover tools" posts the approved surface's trust and `log_note`'s `unsafe_to_retry: false`; trusting `ping` and moving `log_note` to `send` and pressing "Discover again with these settings" shows `Accept the warning for: ping.` with no post; after the tick the second post holds three trust entries and no `unsafe_to_retry`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m8_tool_trust_review::test_tool_settings_trust[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. On each loaded detail the draft is initialDraft of the pending tools with the trust and carried records of discoverSettings of the pending surface, and the baseline is that trust, so find_vendor and log_note start checked with private and public, ping unchecked, and no tick shows. The Changes item for log_note gains Result: untrusted → trusted and Data class: not set → public. Discover tools builds its body from the approved surface: find_vendor trusted and private with effect read, and log_note only unsafe_to_retry false because the stored false differs from the MCP default and the effect is unchanged. Trusting ping makes it newly trusted against the baseline, so Discover again with these settings shows Accept the warning for: ping. as the Discovery alert and posts nothing; moving log_note to send recomputes its carried values through carriedAfterEffect, which drops the retry flag because the stored effect differs. After the tick the second body holds the three trust entries and no unsafe_to_retry. The warning paragraph renders once because the Replace section returns null for an MCP server. The browser test was not run in a gate, but every assertion follows from the code.
---

## Q-008: Finding F-4ee90a68: discoverBody neither validates nor emits keys that appear only in a draft's carried map

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-cbd5fcec). It reports behaviour that no scenario pins down.

Title: discoverBody neither validates nor emits keys that appear only in a draft's carried map
Detail: The specification requires discoverBody to throw RangeError for a key of effects, names, trust *or carried* outside ^[A-Za-z0-9_.-]{1,128}$ (and to bound the total at 100 keys). review.ts builds its key set from effects, names and trust only; carried keys are never pattern-checked, never counted against MAX_TOOLS, and — because the loop iterates that key set — a carried entry whose key is in none of the other three maps is silently dropped. No DB row pins a carried-only key, so the gap is undiscovered by the criterion's scenarios.
Suggested fix: WHEN a DiscoverDraft carries an entry whose key appears in neither effects, names nor trust THEN discoverBody validates only the keys of effects, names and trust and drops the carried entry.
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-cbd5fcec as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The finding is correct and the specification is explicit. The requirement for discoverBody says it throws RangeError for a key of effects, names, trust or carried outside the key pattern and for more than 100 keys, but the builder collects its key set from effects, names and trust only, reads carried entries just for those keys, and so neither checks nor counts nor emits a key that appears only in carried. The 100-key test row uses keys in effects only, so no test pins the gap. WHEN a DiscoverDraft holds a carried entry under a key that is in none of effects, names or trust THEN discoverBody treats that key like a key of the other three maps: a key outside ^[A-Za-z0-9_.-]{1,128}$ or one that brings the total over 100 throws RangeError, and otherwise the tool gets the overlay entry built from its carried fields.
---

## Q-009: Finding F-1b3e37fc: Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it (criterion C-c7bb4abe). It reports behaviour that no scenario pins down.

Title: Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults
Detail: The spec's failure cases demand that every lookup by a tool name or operationId use Object.hasOwn or a Map. RegisterPage.tsx, ReplaceSection.tsx and ReviewSections.tsx all fall back with `trust[name] ?? DEFAULT_TRUST`; for a legal key such as "toString" with no own entry the read yields Object.prototype.toString (not nullish), so the checkbox/select get a function instead of DEFAULT_TRUST, and ticking it writes dataClass undefined, which makes overlayEntry throw RangeError on submit with no message shown. The builders (RG1/DB5) are safe; only the React reads are not.
Suggested fix: WHEN an operationId or server tool name such as toString has no own entry in the trust record THEN the page reads trust[name] directly and receives Object.prototype's member instead of DEFAULT_TRUST.
The suggested fix describes what the code does now, and a reject does not use it: to pin that behaviour, end the reason with it.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against criterion C-c7bb4abe as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject The finding is correct. The design requires every lookup by a tool name or operationId to use Object.hasOwn or a Map, and the builders do, but the three pages read the trust record with a plain index and a nullish fallback. For a legal operationId or server tool name that is also an Object.prototype member, such as toString or constructor, with no own entry, the read yields the inherited function instead of DEFAULT_TRUST, so the checkbox and select receive undefined values, and ticking the box stores a trust whose dataClass is undefined. On the OpenAPI forms that entry reaches overlayEntry, which throws RangeError for a data class that is neither null, public nor private, and the registration handler calls the builder outside its try block, so the submit fails with no message. WHEN an operationId or server tool name that is also an Object.prototype member name, such as toString or constructor, has no own entry in a page's trust record THEN the page shows it at DEFAULT_TRUST and, after the admin trusts or classes it and ticks, submits the same overlay entry as for any other name without an error.
---

## Q-010: Hold H-fd0a4300: UI criterion C-f52c8d49 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-f52c8d49 has no end-to-end test; see the generated UI tests table

Step 5 for C-f52c8d49: writer_failed after 1 attempt(s); no answer within 600s.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The hold says the criterion lacks an end-to-end test because the generated-test writer timed out, but the unit's own browser file holds a test tagged with this criterion whose assertions are exactly the scenario: the six Operations column headers including Result trusted and Data class, the form alert Accept the warning for: createPayment, listVendors. with no post, and after both ticks one post whose overlay holds createPayment with effect pay, untrusted_result false and data_class private and listVendors with effect read and data_class public. Those headers and overlay members exist only with this change, so the test discriminates by construction. The code supports each step: the registration table renders the two new headers, the submit runs the field checks and then puts the ack message into the form error that the Form kit renders as the alert, and the builder writes trust members through overlayEntry. The test was not run in a gate here; the acceptance profile after merge runs every configured gate.
---

## Q-011: Hold H-ec069147: UI criterion C-3a1c08af has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-3a1c08af has no end-to-end test; see the generated UI tests table

Step 5 for C-3a1c08af: writer_failed after 1 attempt(s); no answer within 600s.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The hold says the criterion lacks an end-to-end test because the generated-test writer timed out, but the unit's own browser file holds a test tagged with this criterion whose assertions are exactly the scenario: after the preview the document field is described by the replace hint, the trust box of createPayment is checked, its data class reads private, no acceptance tick is shown, the warning appears once, and Save changes issues one PUT whose overlay holds createPayment with effect pay, untrusted_result false, unsafe_to_retry false and data_class private and listVendors with effect read, followed by a second detail read. The code supports each step: the servers page hands the pending surface, else the approved one, to the Replace section, which reads it with storedTools and after each preview prefills trust and carried values with prefillTrust and sets the baseline to that trust, so ackStatus shows no tick; carriedFields keeps the stored false for create_payment because its effect is unchanged and false differs from the OpenAPI default for pay, while list_vendors stored false equals the read default and nothing is carried; overlayEntry writes exactly the pinned members. The test was not run in a gate here; the acceptance profile after merge runs every configured gate.
---

## Q-012: Hold H-91b47a21: UI criterion C-08abe836 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-08abe836 has no end-to-end test; see the generated UI tests table

Step 5 for C-08abe836: writer_failed after 2 attempt(s); no answer within 600s.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The hold says the criterion lacks an end-to-end test because the generated-test writer timed out, but the unit's own browser file holds a test tagged with this criterion whose assertions are exactly the scenario: after the same Replace preview it moves createPayment to send and listVendors to pay, presses Save changes and asserts one PUT whose overlay is createPayment with effect send, untrusted_result false and data_class private and listVendors with effect pay, with no unsafe_to_retry anywhere. The code supports it: each effect change in the Replace form calls carriedAfterEffect with the operation's derived name, which looks the stored tool up by name and drops the retry flag whenever the stored effect differs from the new one, and the handler then removes the operation's carried entry; the trust record is untouched, so the baseline still covers it and no tick appears; overlayEntry writes the remaining members. The test was not run in a gate here; the acceptance profile after merge runs every configured gate.
---

## Q-013: Hold H-95bd71c9: UI criterion C-3ad08589 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-3ad08589 has no end-to-end test; see the generated UI tests table

Step 5 for C-3ad08589: not_testable after 1 attempt(s); The criterion's WHEN is the unit test file register.test.ts running unedited, and its THEN is request bodies, pinned-row messages and internal draft state, none of which a user can observe in the served page..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The criterion's WHEN is the frozen Node test of the registration builders running unedited, and its THEN is the request bodies, the refusal fields and texts and the unchanged drafts, none of which a browser can observe, so no end-to-end test is the right instrument and the step 5 writer was right to call it not testable. The Node test exists and carries this criterion in ten test names: it asserts the lowercased origin and an overlay of exactly createPayment { effect: pay } and get-vendor.v1 { effect: read }, every pinned refusal with its field and text, that the id fails before the origin and the origin before the document, the RangeError of the replacement builders for a bad server id, and that no builder changes its draft. The edited builder reads the optional trust and carried records with Object.hasOwn, falls back to the default trust and an empty carried record, and overlayEntry then writes the effect alone, so those assertions still hold. The unit's own tests of the trust members live in separate test files, and the browser tests of this unit cover the forms that call the builders.
---

## Q-014: Hold H-4d97dc56: UI criterion C-7374d16f has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-7374d16f has no end-to-end test; see the generated UI tests table

Step 5 for C-7374d16f: not_testable after 1 attempt(s); The criterion asserts outcomes of internal TypeScript unit functions in review-discover.test.ts, which cannot be observed through the browser UI the e2e suite drives..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The criterion's WHEN is the frozen Node test of the review builders running unedited, and its THEN is the values of initialDraft, discoverBody, parseDiscovery and discoveryText, which are internal function results a browser cannot observe, so no end-to-end test is the right instrument and the step 5 writer was right to call it not testable. The Node test exists and carries this criterion in nine test names: initialDraft of find_vendor read and log_note write gives effects find_vendor read and log_note empty, discoverBody gives { tools: {} } and find_vendor { effect: read } and throws RangeError for a key with a space, an empty key, an unknown effect, a bad name and 101 keys while passing 100, parseDiscovery gives null for eleven malformed answers, and discoveryText ends with the pinned left-out list. The edited review module still returns effects and names from initialDraft and builds each entry through overlayEntry, dropping an empty entry, so those assertions hold. The browser tests of this unit and of the earlier review unit cover the page that calls these builders.
---

## Q-015: Hold H-c8ca5be3: UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table

Step 5 for C-c8329b48: writer_failed after 1 attempt(s); no answer within 600s.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The hold says the criterion lacks an end-to-end test because the generated-test writer timed out, but the criterion names the frozen browser test of the earlier review unit, which runs unedited and is tagged with it, and its assertions are the scenario: the Changes list holds changed find_vendor: hints and changed log_note: effect, description with the description lines, the Calls table shows the pending surface's effects and hints, and Discover tools posts find_vendor with effect read alone. The edited code keeps those results: Discover tools now adds the trust and carried records of the approved surface, but in that test every approved tool is untrusted with no data class and each stored unsafe_to_retry is true, which equals the MCP default, so nothing is added and log_note and old_tool drop out as empty entries; the Changes items keep their texts and log_note gains only the line Effect: write → send under them, which the contain-text assertions tolerate; the Tool settings table renders inside the kit's table wrapper, which scrolls horizontally, so the two new columns cannot widen the page. The test was not run in a gate here; the acceptance profile after merge runs every configured gate.
---

## Q-016: Hold H-c196208f: UI criterion C-c7bb4abe has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-c7bb4abe has no end-to-end test; see the generated UI tests table

Step 5 for C-c7bb4abe: writer_failed after 1 attempt(s); no answer within 600s.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The hold says the criterion lacks an end-to-end test because the generated-test writer timed out, but the unit's own browser file holds a test tagged with this criterion whose assertions are exactly the scenario of the Tool settings steps: the six column headers including Result trusted and Data class, find_vendor and log_note checked with private and public and ping unchecked, the warning once and no tick box, the Changes item for log_note holding Result: untrusted → trusted and Data class: not set → public, Discover tools posting find_vendor trusted and private with effect read and log_note with only unsafe_to_retry false, then after trusting ping and moving log_note to send the alert Accept the warning for: ping. with no post, and after the tick a second post with the three trust entries and no unsafe_to_retry. The code supports each step: the review sections build the draft and baseline from discoverSettings of the pending surface on each loaded detail, Discover tools builds its body from the approved surface's trust and carried values, carriedFields carries the stored false for log_note only while the effect is unchanged and drops it when the effect moves to send through carriedAfterEffect, ackStatus shows a tick only for a key newly trusted or newly public against the baseline, a missing tick becomes the failed action text rendered with the alert role, overlayEntry writes the pinned members, surfaceDiff lists untrusted_result and data_class so log_note is a changed item, and valueChangeLines appends the two value lines under it. The Replace section returns null for an MCP server, so the warning renders once. The test was not run in a gate here; the acceptance profile after merge runs every configured gate.

---

## Q-017: Hold H-abcad329: UI criterion C-c4fa5fc4 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-c4fa5fc4 has no end-to-end test; see the generated UI tests table

Step 5 for C-c4fa5fc4: writer_failed after 2 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The criterion pins what discoverBody does with a key that appears only in a draft's carried map: a key outside the pattern or one that brings the total over 100 throws RangeError, and otherwise the tool gets the overlay entry built from its carried fields. That is a builder result a browser cannot observe, because the pages fill carried only from discoverSettings of a stored surface whose server tool names storedTools has already checked against the same pattern, and from carriedAfterEffect keyed by a rendered row's name, so no page can produce a carried-only key that is malformed or in excess; an end-to-end test is not the right instrument. The Node test review-carried-keys.test.ts carries the criterion in its name and asserts exactly the scenario: RangeError for a carried-only key with a space, for an empty carried-only key and for 101 carried-only keys, and the body foo with name bar and unsafe_to_retry false for a well-formed carried-only key. The builder now adds the keys of carried to its key set before deleting __proto__, counting against 100 and testing each key against the pattern, then builds the entry from the carried fields through overlayEntry.
---

## Q-018: Hold H-1f2ad2b0: UI criterion C-f43385f5 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 3, verifier

### Context
After round 3 the verifier cannot decide on its own: UI criterion C-f43385f5 has no end-to-end test; see the generated UI tests table

Step 5 for C-f43385f5: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_f43385f5::test_object_prototype_member_operation_trust_default[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on as it stands. The generated browser test fails at the base and at the head for a reason of its own: it opens the registration page and at once expects a row for toString, but the Operations table renders only after an OpenAPI document is pasted and previewed, and the test never pastes one, so it fails against any version of the page and proves nothing about the code. The code satisfies the criterion. Every page reads its trust record through trustFor, which returns DEFAULT_TRUST unless Object.hasOwn finds an own entry, so toString or constructor with no own entry shows unchecked and with no data class; each setter writes a complete ToolTrust with trusted and dataClass, the data-class select maps its empty option to null, and the tick and baseline reads compare against true or read trusted of the inherited function as undefined, so a newly trusted prototype-named key is shown and must be ticked like any other. The OpenAPI builder reads trust and carried with Object.hasOwn, and discoverBody does the same, so the submitted overlay entry is the one overlayEntry builds for any other name and no RangeError arises. The Node test trust-lookup.test.ts carries the criterion and scans the three pages for a plain trust index with a nullish fallback and for the guarded lookup.
