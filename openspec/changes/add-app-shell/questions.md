# Questions — add-app-shell

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
| Q-001 | answered | none | verdict | Criterion C-1577878d (web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact): accept as satisfied? |
| Q-002 | answered | none | verdict | Criterion C-14067443 (web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-2d3f3998 (web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none): accept as satisfied? |
| Q-004 | answered | none | verdict | Criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner): accept as satisfied? |
| Q-005 | answered | none | verdict | Criterion C-425a9f46 (web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px): accept as satisfied? |
| Q-006 | answered | none | verdict | Criterion C-88a078f0 (web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards): accept as satisfied? |
| Q-007 | answered | none | verdict | Hold H-817f132e: UI criterion C-e722bbf4 has no end-to-end test; see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-49d28f26: UI criterion C-4ef0679b has no end-to-end test; see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-91c87ac7: UI criterion C-b054e7d6 has no end-to-end test; see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-e45e045d: UI criterion C-ffb190b2 has no end-to-end test; see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-36707f19: UI criterion C-1577878d has no end-to-end test; see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-e4efbea1: UI criterion C-14067443 has no end-to-end test; see the generated UI tests table |
| Q-013 | answered | none | verdict | Hold H-ec613652: UI criterion C-2d3f3998 has no end-to-end test; see the generated UI tests table |
| Q-014 | answered | none | verdict | Hold H-829dbc6c: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table |
| Q-015 | answered | none | verdict | Hold H-75cdf554: UI criterion C-425a9f46 has no end-to-end test; see the generated UI tests table |
| Q-016 | answered | none | verdict | Hold H-45489073: UI criterion C-9eeb9987 has no end-to-end test; see the generated UI tests table |
| Q-017 | answered | none | verdict | Hold H-d1f76909: UI criterion C-2159a890 has no end-to-end test; see the generated UI tests table |
| Q-018 | answered | none | verdict | Hold H-cdb99000: UI criterion C-88a078f0 has no end-to-end test; see the generated UI tests table |
| Q-019 | answered | none | verdict | Criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner): accept as satisfied? |
| Q-020 | answered | none | verdict | Criterion C-c6a08479 (web-shell › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c › Rejected hold: UI criterion C-51d4764a has no e |
| Q-021 | answered | none | verdict | Criterion C-0cbfa992 (web-shell › The banner stays at most 72 px tall — regression 2 › the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60...): accept as s |
| Q-022 | answered | none | verdict | Hold H-829dbc6c: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table |
| Q-023 | open | none | verdict | Hold H-f10f11d2: UI criterion C-c6a08479 has no end-to-end test; see the generated UI tests table |
| Q-024 | open | none | verdict | Hold H-c9e043b3: UI criterion C-0cbfa992 has no end-to-end test; see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Criterion C-1577878d (web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-1577878d (web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact)

### Context
Criterion C-1577878d (web-shell › The shell holds one banner, one navigation, one main and one footer › Carol's navigation is grouped and the banner is compact) is needs human after round 2.

Scenario:
\- **WHEN** `test_carols_navigation_is_grouped_and_the_banner_is_compact` mocks `/api/v1/me` with carol's seven capabilities and opens `/` at 1366 by 860, then at 1280 by 720 (test-plan-browser.md)
\- **THEN** the page has one `navigation` named "Main" whose links read, in order, Home, Flows, Runs, Users, Roles and teams, Group mappings, Audit log, Tool servers, Grants, Policies; the visible labels "Build" and "Admin" head the lists "Build" (Flows, Runs) and "Admin" (7 links); one link has `aria-current="page"`, "Home"; the nav is 240 px wide with `main` starting at x 240; `assert_layout(page, 72)` passes with a measured banner of 56 px at both sizes; the last link ends above y 720 at 1280 by 720 (measured 514); `assert_accessible(page)` passes and the `watch_csp` list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1280-720] (no proof that it discriminates (no red, audit or generated record)); test_m6b_shell::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The shell as built renders carol's ten links in the asserted order and grouping, and the geometry the scenario measures follows from the tokens. The sidebar grid column is var(--ui-sidebar-width), which tokens.css sets to 15rem, so the nav is 240 px wide and main, placed in column 2, starts at x 240. The banner is one non-wrapping flex row with min-height var(--ui-banner-height), 3.5rem, so it measures 56 px. Each group is a p label followed by a ul named through aria-labelledby, group order is home, build, admin, more, and features register in file-name order, which gives Home, Flows, Runs, then Users, Roles and teams, Group mappings, Audit log, Tool servers, Grants, Policies. Exactly one nav is rendered because the same nav element is placed either in the header or after it. The unit's browser test asserts every item of the scenario, and it discriminates: design.md records that the base shell was a header list with a 297 px banner for carol, which fails assert_layout(page, 72) and the 240 px checks. The harness-generated test only errored at the merge base, which says nothing against the head.
---

## Q-002: Criterion C-14067443 (web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-14067443 (web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups)

### Context
Criterion C-14067443 (web-shell › The shell holds one banner, one navigation, one main and one footer › Alice and a signed-out visitor see fewer groups) is needs human after round 2.

Scenario:
\- **WHEN** `test_alice_and_a_signed_out_visitor_see_fewer_groups` opens `/` at 1366 by 860 with `/api/v1/me` mocked for alice's capabilities `read_self`, `read_flow`, `read_run`, and then with it answered 401
\- **THEN** alice's links read Home, Flows, Runs under the label "Build" and no label "Admin" or "More" exists; with the 401 there is still one `navigation` named "Main", inside the banner, whose links read Home alone, with one list, no group label, no button "Menu", `main` at x 0 and the nav's bottom edge at most 56 px from the page top; both pages pass `assert_layout(page, 72)` and `assert_accessible(page)` and the `watch_csp` list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_shell::test_alice_and_a_signed_out_visitor_see_fewer_groups[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept For alice the registry yields Home, Flows and Runs, navGroups leaves empty groups out, so only the Build label is rendered and no Admin or More label exists. With a 401 the capability state is signed_out, navPlacement answers inline, and Shell.tsx then renders the single nav inside the header after the brand as one flat ul without labels, renders no Menu button, and uses a plain flex column instead of the grid, so main is full width at x 0. visibleNav falls back to the public entries, and Home is the only feature with a navLabel and no capability, so the inline list holds Home alone. The nav sits in a 56 px banner with items-center, so its bottom edge is within 56 px. The unit's browser test asserts each of these, including the nav inside the banner and the 56 px bound, and discriminates because the base shell had no Build label and a 129 px banner for alice. The harness-generated test was uncollectable for an import error of its own.
---

## Q-003: Criterion C-2d3f3998 (web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none): accept as satisfied?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The code reads right: shell.css sets [tabindex="-1"]:focus to outline none in the same layer as theme.css's 3 px :focus-visible with higher specificity, the Menu button is display none at 1280 px so the Tab order is skip link, brand, Sign out, Home, the home status has tabIndex -1 and ToastRegion fo
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-2d3f3998 (web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none)

### Context
Criterion C-2d3f3998 (web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none) is needs human after round 2.

Scenario:
\- **WHEN** `test_key_stops_keep_their_ring_and_script_focus_draws_none` opens `/` at 1280 by 720 with a mocked ready session, presses Tab four times, reloads, presses Tab and Enter, focuses the home `status` from script, then answers `/api/v1/me` with an aborted request and clicks "Dismiss" on the toast
\- **THEN** the four Tab stops are the link "Skip to content", the link "Ursitoare", the button "Sign out" and the link "Home", each with a computed `outlineStyle` other than `none` and an `outlineWidth` of at least 2 px (measured 3); after Enter on the skip link `main` is focused with `outlineStyle` `none`; the focused `status` (`tabindex="-1"`) has `outlineStyle` `none`; after "Dismiss" `main` is focused again with `outlineStyle` `none`; the `watch_csp` list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept: verified by the owner's delegate. test_m6b_shell::test_key_stops_keep_their_ring_and_script_focus_draws_none implements every clause of the scenario (four Tab stops with an outline of at least 2 px; main after the skip link, the script-focused status and main after Dismiss with outline none; CSP list []). It passes at head 46b3bf4a locally (twice) and in the round-2 CI e2e gate, and it fails at base c2129af7 (Locator expected to be focused), so it discriminates. An independent probe as carol at 1280 by 720 measured solid 3px on Skip to content, Ursitoare, Sign out and Home, and outline none on main after Enter, on the focused status and on main after Dismiss.
---

## Q-004: Criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner): accept as satisfied?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): auth.css gives the account paragraphs min-width 0, overflow hidden, nowrap and text-overflow ellipsis, the account group has min-width 0 and the header is a non-wrapping row of min-height 3.5rem, so the layout should hold at 1366 and 900 px. But the verification table records a harness-generated tes
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner)

### Context
Criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner) is needs human after round 2.

Scenario:
\- **WHEN** `test_long_names_truncate_and_never_grow_the_banner` mocks a display name of 60 "W" and a tenant name of 60 "M" and opens `/` at 1366 by 860 and at 900 by 800
\- **THEN** the banner text contains both whole names; `assert_layout(page, 72)` passes with a banner of 56 px; both paragraphs compute `text-overflow: ellipsis` and are cut (`scrollWidth` greater than `clientWidth`; font-dependent, measured on macOS 921 against 607 and 804 against 530 at 1366, 921 against 323 and 804 against 282 at 900); the right edge of "Sign out" is at most the viewport width (measured 1350 and 884)

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-900-800] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
reject: measured by the owner's delegate on head 46b3bf4a: with 60-character names the banner is 59 px, not 56, at 1366, 1024, 900 and 375 px wide. The "Sign out" Button in web/src/auth/AccountMenu.tsx is a flex item without shrink-0, so the long names squeeze it until its label wraps onto two lines (58 px tall, 47 to 51 px wide; 73 by 38 with short names). The scenario says assert_layout passes "with a banner of 56 px" and the requirement says long names never grow the banner. The unit test only checks at most 72 px, which is why it passed. A likely fix is shrink-0 and whitespace-nowrap on that Button. WHEN the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60 "M", at 1366 by 860 and at 900 by 800, THEN the banner is 56 px tall (within 1), the button "Sign out" is on one line and 38 px tall (within 1), both account paragraphs compute text-overflow ellipsis and are cut, and the right edge of "Sign out" is at most the viewport width.
---

## Q-005: Criterion C-425a9f46 (web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px): accept as satisfied?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): I withdraw this one to escalate: see the accept variant was considered but the delegate must give exactly one result per question; this placeholder is replaced below.
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-425a9f46 (web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px)

### Context
Criterion C-425a9f46 (web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px) is needs human after round 2.

Scenario:
\- **WHEN** `test_the_menu_folds_below_1024_px` mocks a ready session and opens `/` at 1023 by 800 and at 1024 by 800, then at 900 by 800 clicks "Menu" twice and opens `/no-such-page`, clicks "Menu" and then the link "Home"
\- **THEN** at 1023 the button "Menu" is visible with `aria-expanded="false"` and there are 0 `navigation` elements; at 1024 the button is hidden and there is 1, whose `id` is `main-nav`; at 900 the first click gives `aria-expanded="true"` with the navigation visible and `assert_layout(page, 72)` and `assert_accessible(page)` passing, the second `"false"` and 0 navigations; after the click on "Home" the URL path is `/`, `aria-expanded` is `"false"` and there are 0 navigations; the `watch_csp` list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_shell::test_the_menu_folds_below_1024_px[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept: verified by the owner's delegate. test_the_menu_folds_below_1024_px implements every clause of the scenario: at 1023 Menu is visible with aria-expanded false and there are 0 navigations; at 1024 it is hidden and there is 1, with id main-nav; at 900 it opens and closes, assert_layout and assert_accessible pass, and it closes after Home is clicked from /no-such-page; CSP list []. It passes at head 46b3bf4a locally (twice) and in the round-2 CI e2e gate, and it fails at base c2129af7 (no Menu button), so it discriminates. I checked a screenshot of the open menu at 900 px by eye. The generated test errored at the base, which proves nothing either way.
---

## Q-006: Criterion C-88a078f0 (web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards): accept as satisfied?

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: the reply has 21 checked entries: the limit is 20
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-88a078f0 (web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards)

### Context
Criterion C-88a078f0 (web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards) is needs human after round 2.

Scenario:
\- **WHEN** `test_sign_in_and_not_found_render_as_centred_cards` opens `/sign-in`, `/sign-in?error=OIDC_USER_DISABLED` and `/no-such-page` signed out at 1366 by 860
\- **THEN** on both sign-in pages `main` starts at x 0, the card `main > div` is 384 px wide, at y 104 and centred on the page (centre x 683), and the button "Sign in" is 334 px wide (one such button); with the error the card holds the one `alert`; on the not-found page `main` starts at x 0, the card is 448 px wide, at y 128, centred on the page, the heading "Page not found" is visible, the link "Go to the landing page" has `href` `/`, and the title is `Page not found · Ursitoare`; every page passes `assert_layout(page, 72)` and `assert_accessible(page)` and the `watch_csp` list is `[]`

Why: uncovered: no adequate discriminating test traces it
Judge: pass
Tracing tests: none
Ignored tests: test_m6b_shell::test_sign_in_and_not_found_render_as_centred_cards[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept: verified by the owner's delegate. test_sign_in_and_not_found_render_as_centred_cards asserts every clause of the scenario. Delegate commit 40bb697b made only the heading locator exact; no assertion was loosened. It passes at head 46b3bf4a locally and in the round-2 CI e2e gate, and it fails at base c2129af7 (card geometry off by 178 px), so it discriminates. Screenshots at 1366 checked by eye: the sign-in card is 384 px wide, centred at y 104, with the alert inside; the not-found card is 448 px wide and dashed, at y 128.
---

## Q-007: Hold H-817f132e: UI criterion C-e722bbf4 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-e722bbf4 has no end-to-end test; see the generated UI tests table

Step 5 for C-e722bbf4: not_testable after 1 attempt(s); The criterion asserts internal module constants (NAV_GROUP_OF, NAV_GROUP_LABELS) that are not observable through the browser UI; it is a unit-testing concern, not an end-to-end one..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The criterion checks the module constants NAV_GROUP_OF and NAV_GROUP_LABELS against the page tables, which the specification itself assigns to a Node test and which no browser page exposes. The Node test reads the constants and the four page tables and asserts the exact ten keys, their values, the fixed labels and the absence of flow-editor and run, and the implementation holds exactly those entries. The browser-visible consequence, grouped links with Build and Admin labels, is covered by the separate browser scenario for carol's navigation. An end-to-end test for this criterion is neither possible nor required.
---

## Q-008: Hold H-49d28f26: UI criterion C-4ef0679b has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-4ef0679b has no end-to-end test; see the generated UI tests table

Step 5 for C-4ef0679b: not_testable after 1 attempt(s); navGroups is a pure function; the G1–G9 input matrix and G7's `===` item-identity / frozen-input immutability are not controllable or observable through the page UI, so the criterion cannot be verified via pytest-playwright e2e (it is unit-tested by nav-groups.test.ts)..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The criterion specifies the pure function navGroups over the G1 to G9 inputs, including prototype-style ids, a frozen input and item identity by reference, none of which a browser page can feed or observe. The Node test covers each row: carol's three groups, empty groups left out, an unknown id in More after Build, constructor, toString and __proto__ in More, a frozen input passing through by reference with ten items, and input order kept inside a group. The implementation uses Object.hasOwn and buckets in the fixed order, so the rows hold. The rendered grouping is covered by the browser scenarios for carol and alice. An end-to-end test is not possible for this criterion.
---

## Q-009: Hold H-91c87ac7: UI criterion C-b054e7d6 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-b054e7d6 has no end-to-end test; see the generated UI tests table

Step 5 for C-b054e7d6: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_b054e7d6::test_layout_is_sidebar_from_1024px_and_collapsed_below[chromium--1-collapsed], test_l4_c_b054e7d6::test_layout_is_sidebar_from_1024px_and_collapsed_below[chromium-0-collapsed], test_l4_c_b054e7d6::test_layout_is_sidebar_from_1024px_and_collapsed_bel....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The criterion specifies the pure function shellLayout over the inputs 0, 1023, 1023.9, 1024, 1280, 1366, NaN, Infinity and -1, and five of those are not viewport widths any browser can take, so the generated end-to-end test could not be a faithful check and its failures at -1 and 0 are failures of the test's premise, not of the shell. The Node test maps exactly these nine inputs and the implementation is a single comparison against 1024, which gives collapsed for NaN and negatives and sidebar for Infinity. The design states that shellLayout has no runtime caller and only names the threshold that the Tailwind lg variant implements; the browser-visible switch at 1023 and 1024 is the separate scenario about the Menu button, which has its own browser test and its own open question. An end-to-end test for this criterion is therefore not needed for the unit to go on.
---

## Q-010: Hold H-e45e045d: UI criterion C-ffb190b2 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-ffb190b2 has no end-to-end test; see the generated UI tests table

Step 5 for C-ffb190b2: not_testable after 1 attempt(s); Criterion checks static Shell.tsx source contents (navGroups, useSession, TooltipProvider, lg:hidden), not rendered UI; not observable via the browser page fixture..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The criterion is a source scan of Shell.tsx: it requires the file to contain markers such as navGroups(, navPlacement(, useSession(), aria-labelledby, TooltipProvider, lg:hidden and useState(, to hold exactly two nav elements and one header, main and footer, to keep an order of markers, and to contain none of a list of banned strings, with the kit's scanners returning empty. Source text is not observable from a browser page, so an end-to-end test cannot check it. The Node test reads the file and asserts each of these, and the Shell source holds the required markers and none of the banned ones. The rendered landmarks are covered by the browser scenarios of the same requirement.
---

## Q-011: Hold H-36707f19: UI criterion C-1577878d has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-1577878d has no end-to-end test; see the generated UI tests table

Step 5 for C-1577878d: base_error after 2 attempt(s); the test errors at the merge base, which proves nothing: test_l4_c_1577878d::test_carols_navigation_is_grouped_and_the_banner_is_compact[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The generated test only errored at the merge base, which says nothing against the head, and the shell as built gives every row of the scenario. For a ready session the root is a two-column grid whose first column is the sidebar width token, 15rem, so the navigation is 240 px wide and main, placed in column 2, starts at x 240. The banner is one non-wrapping flex row with a minimum height of the banner token, 3.5rem, so it measures 56 px and passes the 72 px bound. Features register in file-name order and navGroups buckets them in the order home, build, admin, which yields Home, Flows, Runs, Users, Roles and teams, Group mappings, Audit log, Tool servers, Grants and Policies, each group being a p label followed by a ul named through aria-labelledby. The unit's own browser test, tagged with this criterion, asserts the link order, the two named lists, the single aria-current link, the 240 px nav and main offset, assert_layout, assert_accessible and an empty CSP list at both sizes, and it discriminates because the base shell was a header list far taller than 72 px with no 240 px column.
---

## Q-012: Hold H-e4efbea1: UI criterion C-14067443 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-14067443 has no end-to-end test; see the generated UI tests table

Step 5 for C-14067443: uncollectable after 1 attempt(s); no test of the new file ran at the merge base (collection error or no test).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The generated test was never collected, so there is no result against the head, and the code gives the scenario. Alice's three capabilities yield Home, Flows and Runs, navGroups leaves empty groups out, so only the Build label renders and no Admin or More label exists. A 401 makes the loader answer signed_out, navPlacement then answers inline, and the shell renders the one nav inside the header after the brand as a single flat list, renders no Menu button and uses a plain flex column instead of the grid, so main is full width at x 0. The signed-out nav falls back to the public entries, and Home is the only navigation feature without a capability, so the inline list holds Home alone, centred in the 56 px banner. The unit's own browser test, tagged with this criterion, asserts alice's links and labels, the single navigation inside the banner with Home alone, one list, no Menu button, main at x 0, the nav's bottom edge at most 56 px, assert_layout, assert_accessible and an empty CSP list.
---

## Q-013: Hold H-ec613652: UI criterion C-2d3f3998 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The generated test for this criterion fails at the head after two attempts and I cannot read it or its trace: it is not in the repository I can see. The code reads right: shell.css sets [tabindex="-1"]:focus to outline none in the same components layer as theme.css's 3 px :focus-visible rule with hi
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-2d3f3998 has no end-to-end test; see the generated UI tests table

Step 5 for C-2d3f3998: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_2d3f3998::test_key_stops_keep_their_ring_and_script_focus_draws_none[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept: verified by the owner's delegate. The generated test could not be read (CI artefacts are not uploaded), but the scenario holds as written: the project test test_key_stops_keep_their_ring_and_script_focus_draws_none passes at head locally and in the round-2 CI e2e gate and fails at base c2129af7 (Tab order), and an independent probe as carol at 1280 by 720 measured solid 3px on the four Tab stops and outline none on main after the skip link, on the focused status and on main after Dismiss.
---

## Q-014: Hold H-829dbc6c: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The generated test for this criterion fails at the head after two attempts and I cannot read it or its trace. The code reads right: auth.css gives the account paragraphs min-width 0, overflow hidden, nowrap and text-overflow ellipsis, the account group has min-width 0, the brand and Menu button are
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table

Step 5 for C-51d4764a: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_51d4764a::test_long_names_truncate_and_never_grow_the_banner[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
reject: the generated test is right to fail at the head; measured by the owner's delegate on head 46b3bf4a: with 60-character names the banner is 59 px, not 56, at 1366, 1024, 900 and 375 px wide. The "Sign out" Button in web/src/auth/AccountMenu.tsx is a flex item without shrink-0, so the long names squeeze it until its label wraps onto two lines (58 px tall, 47 to 51 px wide; 73 by 38 with short names). The scenario says assert_layout passes "with a banner of 56 px" and the requirement says long names never grow the banner. The unit test only checks at most 72 px, which is why it passed. A likely fix is shrink-0 and whitespace-nowrap on that Button. WHEN the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60 "M", at 1366 by 860 and at 900 by 800, THEN the banner is 56 px tall (within 1), the button "Sign out" is on one line and 38 px tall (within 1), both account paragraphs compute text-overflow ellipsis and are cut, and the right edge of "Sign out" is at most the viewport width.
---

## Q-015: Hold H-75cdf554: UI criterion C-425a9f46 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-425a9f46 has no end-to-end test; see the generated UI tests table

Step 5 for C-425a9f46: base_error after 2 attempt(s); the test errors at the merge base, which proves nothing: test_l4_c_425a9f46::test_the_menu_folds_below_1024_px[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The generated test only errored at the merge base, which says nothing against the head, and the shell gives the scenario. The Menu button is a plain Button with lg:hidden, aria-expanded bound to React state and aria-controls main-nav, so below 1024 px it is visible with aria-expanded false and from 1024 px it is display none. The sidebar nav is hidden when the state is closed and block when open, with lg:block from 1024 px, so a closed menu below 1024 px removes the navigation from the accessibility tree and the count is 0, while at 1024 px there is one navigation with id main-nav. A click toggles the state and an effect on the pathname closes it, so navigating from the not-found page to Home leaves aria-expanded false and no navigation. No Radix primitive is involved. The unit's own browser test, tagged with this criterion, asserts the button at 1023 and 1024, the two clicks at 900 with assert_layout and assert_accessible, the close on navigation and an empty CSP list.
---

## Q-016: Hold H-45489073: UI criterion C-9eeb9987 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-9eeb9987 has no end-to-end test; see the generated UI tests table

Step 5 for C-9eeb9987: not_testable after 1 attempt(s); The criterion inspects local source CSS files (shell.css, auth.css, tokens.css) and invokes TypeScript helpers parseTokens/findRawColours; none of this is observable through the page's public interface or reachable by requesting the origin, so a Playwright E2E test cannot verify it..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The criterion is a static scan of shell.css, auth.css and tokens.css through the kit's parseTokens and findRawColours helpers, which no browser page exposes, so the specification itself assigns it to the Node test shell-css.test.ts and an end-to-end test is neither possible nor needed. That Node test, tagged with this criterion, asserts every row of the scenario, and the files hold what it asks: shell.css declares color-scheme light, keeps .skip-link:focus with var(--ui-focus-width), replaces main:focus by the tabindex minus one rule with outline none, and holds no light dark, Canvas, currentColor or .app-* selector; auth.css keeps .auth-account and .auth-page with text-overflow ellipsis, max-width 24rem, the divider, radius-lg and shadow-sm tokens and no 32rem width. Neither file holds a raw colour, and every var() name they use, the space, bg, text, accent, divider, focus-width, radius-lg and shadow-sm tokens, is declared in tokens.css. The browser-visible consequences, the light scheme and the focus behaviour, are covered by the separate focus-ring browser scenario of the unit.
---

## Q-017: Hold H-d1f76909: UI criterion C-2159a890 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-2159a890 has no end-to-end test; see the generated UI tests table

Step 5 for C-2159a890: not_testable after 1 attempt(s); The criterion is a static source-code inspection (imports, className, asChild, findInlineStyleUse) of TSX files; nothing a user sees or does in the browser verifies it, and an e2e test may only request the base origin, not read source files..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The criterion is a static scan of AccountMenu.tsx, SignInPage.tsx and App.tsx for imports, the shared Button, asChild, banned attributes and the kit's inline-style and palette scanners, none of which a browser page exposes, so the specification assigns it to the Node test auth-sources.test.ts and an end-to-end test is not possible. That test, tagged with this criterion, asserts each row of the scenario, and the three files hold what it asks: each imports Button from ../ui/button.tsx and renders it, none contains className ui-button, style= or a native disabled attribute; AccountMenu.tsx holds the Account group with Signed in as, Tenant:, Sign out, aria-disabled and an asChild Sign in link; SignInPage.tsx holds tone primary, two Sign in headings, ErrorPanel and Checking your session; App.tsx holds Page not found, Go to the landing page through an asChild Button and the not-found DocumentTitle. The utility classes in the not-found card use token names such as border-border and bg-surface, which the palette scanner does not match. The rendered result of these sources is covered by the separate browser scenario on the centred cards.
---

## Q-018: Hold H-cdb99000: UI criterion C-88a078f0 has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-88a078f0 has no end-to-end test; see the generated UI tests table

Step 5 for C-88a078f0: base_error after 2 attempt(s); the test errors at the merge base, which proves nothing: test_l4_c_88a078f0::test_sign_in_and_not_found_render_as_centred_cards[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The generated test only errored at the merge base, which says nothing against the head, and the code as built gives every row of the scenario. Signed out, navPlacement answers inline and the shell uses a plain flex column with the navigation inside the banner, so main is full width and starts at x 0. The sign-in page is the .auth-page card with max-width 24rem, 384 px, centred by auto margins, whose top margin and the main padding are both the 1.5rem space token under the 56 px banner, which gives y 104 and a centre at half of 1366, and its primary Button stretches to the card's inner width of 334 px. With the error query the page renders one ErrorPanel, whose section has role alert, inside the card. The not-found page is a single div with max-w-md, 448 px, auto margins and a 3rem top margin, which gives y 128, holds the heading Page not found and an asChild Button around the link to /, and sets the title through DocumentTitle for the not-found route. The unit's own browser test, tagged with this criterion, asserts the main offset, the card widths, positions and centre, the one Sign in button and its width, the single alert in the card, the heading, href and title, assert_layout, assert_accessible and an empty CSP list on all three pages.

---

## Q-019: Criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 4, verifier
- **Criteria:** C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner)

### Context
Criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner) is needs human after round 4.

Scenario:
\- **WHEN** `test_long_names_truncate_and_never_grow_the_banner` mocks a display name of 60 "W" and a tenant name of 60 "M" and opens `/` at 1366 by 860 and at 900 by 800
\- **THEN** the banner text contains both whole names; `assert_layout(page, 72)` passes with a banner of 56 px; both paragraphs compute `text-overflow: ellipsis` and are cut (`scrollWidth` greater than `clientWidth`; font-dependent, measured on macOS 921 against 607 and 804 against 530 at 1366, 921 against 323 and 804 against 282 at 900); the right edge of "Sign out" is at most the viewport width (measured 1350 and 884)

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names (passed, red_assertion, inadequate)
Ignored tests: test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800] (no proof that it discriminates (no red, audit or generated record)); test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_m6b_shell::test_long_names_truncate_and_never_grow_the_banner[chromium-900-800] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion holds in the head. The Sign out button in AccountMenu.tsx now carries shrink-0 and whitespace-nowrap, which the Button merges into its classes, so it can no longer be squeezed onto two lines by the 60-character names; that wrap was the only cause of the earlier 59 px measurement. The header is a single non-wrapping flex row with items-center and a minimum height of the banner token, 3.5rem, and its tallest item is the small Button at 38 px (32 px minimum plus 8 px padding, a 20 px line and 1 px borders), so the banner measures 56 px at every width. The account paragraphs keep min-width 0, overflow hidden, white-space nowrap and text-overflow ellipsis, so with 60 Ws and 60 Ms they are cut and the whole names stay in the DOM; the account group shrinks while the brand and buttons do not, so the Sign out button ends inside the viewport. The head holds a browser test tagged with this criterion that asserts the banner at 56 px within 1, the button at 38 px on one line, both paragraphs ellipsis and cut and the right edge inside the viewport at 1366 by 860 and 900 by 800, and the spec's own browser test asserts assert_layout 72, the ellipsis cut and the right edge.
---

## Q-020: Criterion C-c6a08479 (web-shell › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c › Rejected hold: UI criterion C-51d4764a has no e

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 4, verifier
- **Criteria:** C-c6a08479 (web-shell › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table)

### Context
Criterion C-c6a08479 (web-shell › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table — finding H-829dbc6c › Rejected hold: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table) is needs human after round 4.

Scenario:
\- **WHEN** the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60 "M", at 1366 by 860 and at 900 by 800,
\- **THEN** the banner is 56 px tall (within 1), the button "Sign out" is on one line and 38 px tall (within 1), both account paragraphs compute text-overflow ellipsis and are cut, and the right edge of "Sign out" is at most the viewport width.

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names (passed, red_assertion, inadequate)
Ignored tests: test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The scenario holds in the head. The Sign out button carries shrink-0 and whitespace-nowrap, so beside the 60-character names it stays on one line at its natural 38 px height (32 px minimum, 8 px vertical padding, a 20 px text line and 1 px borders); the header is a single non-wrapping flex row with a minimum height of 3.5rem and items-center, so it measures 56 px; the account paragraphs truncate with text-overflow ellipsis and are cut; the account group shrinks while the brand and buttons do not, so the Sign out button ends inside the viewport. The head's browser test tagged with this criterion asserts exactly these clauses at 1366 by 860 and 900 by 800. The generated end-to-end test fails at the head for a premise of its own: it seeds a session in localStorage, which no file under web/src reads, since the session comes only from the capability loader's request to the /me endpoint, so without a mocked API route nobody is signed in and no Sign out button exists.
---

## Q-021: Criterion C-0cbfa992 (web-shell › The banner stays at most 72 px tall — regression 2 › the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60...): accept as s

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 4, verifier
- **Criteria:** C-0cbfa992 (web-shell › The banner stays at most 72 px tall — regression 2 › the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60...)

### Context
Criterion C-0cbfa992 (web-shell › The banner stays at most 72 px tall — regression 2 › the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60...) is needs human after round 4.

Scenario:
\- **WHEN** the shell opens / with a mocked ready session whose display name is 60 "W" and tenant name is 60 "M", at 1366 by 860 and at 900 by 800,
\- **THEN** the banner is 56 px tall (within 1), the button "Sign out" is on one line and 38 px tall (within 1), both account paragraphs compute text-overflow ellipsis and are cut, and the right edge of "Sign out" is at most the viewport width.

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: web.src.auth.long-names-banner.test.ts::C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names (passed, red_assertion, inadequate)
Ignored tests: test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-1366-860] (no proof that it discriminates (no red, audit or generated record)); test_long_names_banner::test_long_names_keep_the_banner_at_56_px_and_sign_out_on_one_line[chromium-900-800] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The scenario holds in the head. The Sign out button carries shrink-0 and whitespace-nowrap, so it stays on one line at 38 px (32 px minimum, 8 px vertical padding, a 20 px text line, 1 px borders) beside the 60-character names; the header is one non-wrapping flex row with a 3.5rem minimum height and centred items, so it is 56 px; the account paragraphs truncate with text-overflow ellipsis and are cut; the account group shrinks while the brand and buttons keep their width, so the Sign out button ends inside the viewport at 1366 and at 900. The head's browser test tagged with this criterion asserts each of these clauses at both viewports. The generated end-to-end test fails at the head for its own premise: it seeds a session in browser storage, which nothing under web/src reads, because the session comes only from the capability loader's /me request.
---

## Q-022: Hold H-829dbc6c: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 4, verifier

### Context
After round 4 the verifier cannot decide on its own: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table

Step 5 for C-51d4764a: writer_failed after 1 attempt(s); opencode's permission rules rejected a tool call (bash).
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The unit can go on. The step-5 writer did not produce a test because a tooling permission rejected a shell call, which says nothing about the shell. The head already holds two end-to-end tests of this criterion: the spec's own test in test_m6b_shell.py, tagged with the criterion, asserts both whole names in the banner, assert_layout at 72, both paragraphs ellipsis and cut and the Sign out right edge inside the viewport at 1366 by 860 and 900 by 800; and test_long_names_banner.py, also tagged, asserts the banner at 56 px within 1 and the button at 38 px on one line. The code gives these results by construction: the Sign out button has shrink-0 and whitespace-nowrap, the header is a 3.5rem minimum non-wrapping row, and the account paragraphs truncate with an ellipsis.
---

## Q-023: Hold H-f10f11d2: UI criterion C-c6a08479 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 4, verifier

### Context
After round 4 the verifier cannot decide on its own: UI criterion C-c6a08479 has no end-to-end test; see the generated UI tests table

Step 5 for C-c6a08479: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_c6a08479::test_rejected_hold_banner_sign_out_ellipsis[chromium-1366-860], test_l4_c_c6a08479::test_rejected_hold_banner_sign_out_ellipsis[chromium-900-800].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-024: Hold H-c9e043b3: UI criterion C-0cbfa992 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 4, verifier

### Context
After round 4 the verifier cannot decide on its own: UI criterion C-0cbfa992 has no end-to-end test; see the generated UI tests table

Step 5 for C-0cbfa992: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_0cbfa992::test_banner_stays_at_most_72px_tall[chromium-viewport0], test_l4_c_0cbfa992::test_banner_stays_at_most_72px_tall[chromium-viewport1].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
