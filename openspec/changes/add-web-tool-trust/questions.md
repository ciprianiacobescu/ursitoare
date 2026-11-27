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
| Q-006 | open | none | verdict | Criterion C-c8329b48 (web-tools › The server page shows discovery, settings, changes and calls › The Changes list and the Calls table of a drifted server): accept as satisfied? |
| Q-007 | open | none | verdict | Criterion C-c7bb4abe (web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value l |
| Q-008 | open | none | verdict | Finding F-4ee90a68: discoverBody neither validates nor emits keys that appear only in a draft's carried map |
| Q-009 | open | none | verdict | Finding F-1b3e37fc: Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults |
| Q-010 | open | none | verdict | Hold H-fd0a4300: UI criterion C-f52c8d49 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-ec069147: UI criterion C-3a1c08af has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-91b47a21: UI criterion C-08abe836 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-95bd71c9: UI criterion C-3ad08589 has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-4d97dc56: UI criterion C-7374d16f has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-c8ca5be3: UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-c196208f: UI criterion C-c7bb4abe has no end-to-end test; see the generated UI tests table |
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

- **Status:** open
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
---

## Q-007: Criterion C-c7bb4abe (web-tools › The server page shows discovery, settings, changes and calls › Tool settings carries the trust controls, Discover keeps the stored trust and Changes shows the value l

- **Status:** open
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
---

## Q-008: Finding F-4ee90a68: discoverBody neither validates nor emits keys that appear only in a draft's carried map

- **Status:** open
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
---

## Q-009: Finding F-1b3e37fc: Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults

- **Status:** open
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
---

## Q-010: Hold H-fd0a4300: UI criterion C-f52c8d49 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-011: Hold H-ec069147: UI criterion C-3a1c08af has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-012: Hold H-91b47a21: UI criterion C-08abe836 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-013: Hold H-95bd71c9: UI criterion C-3ad08589 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-014: Hold H-4d97dc56: UI criterion C-7374d16f has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-015: Hold H-c8ca5be3: UI criterion C-c8329b48 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-016: Hold H-c196208f: UI criterion C-c7bb4abe has no end-to-end test; see the generated UI tests table

- **Status:** open
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
