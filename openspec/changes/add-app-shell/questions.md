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
| Q-003 | open | none | verdict | Criterion C-2d3f3998 (web-shell › The shell holds one banner, one navigation, one main and one footer › Key stops keep their ring and script focus draws none): accept as satisfied? |
| Q-004 | open | none | verdict | Criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner): accept as satisfied? |
| Q-005 | open | none | verdict | Criterion C-425a9f46 (web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px): accept as satisfied? |
| Q-006 | open | none | verdict | Criterion C-88a078f0 (web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards): accept as satisfied? |
| Q-007 | open | none | verdict | Hold H-817f132e: UI criterion C-e722bbf4 has no end-to-end test; see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-49d28f26: UI criterion C-4ef0679b has no end-to-end test; see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-91c87ac7: UI criterion C-b054e7d6 has no end-to-end test; see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-e45e045d: UI criterion C-ffb190b2 has no end-to-end test; see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-36707f19: UI criterion C-1577878d has no end-to-end test; see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-e4efbea1: UI criterion C-14067443 has no end-to-end test; see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-ec613652: UI criterion C-2d3f3998 has no end-to-end test; see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-829dbc6c: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-75cdf554: UI criterion C-425a9f46 has no end-to-end test; see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-45489073: UI criterion C-9eeb9987 has no end-to-end test; see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-d1f76909: UI criterion C-2159a890 has no end-to-end test; see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-cdb99000: UI criterion C-88a078f0 has no end-to-end test; see the generated UI tests table |
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

- **Status:** open
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
---

## Q-004: Criterion C-51d4764a (web-shell › The banner stays at most 72 px tall › Names of 60 characters truncate and never grow the banner): accept as satisfied?

- **Status:** open
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
---

## Q-005: Criterion C-425a9f46 (web-shell › Below 1024 px a Menu button folds the navigation › The menu folds below 1024 px): accept as satisfied?

- **Status:** open
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
---

## Q-006: Criterion C-88a078f0 (web-shell › The sign-in and not-found pages are cards in the shell › Sign-in and not-found render as centred cards): accept as satisfied?

- **Status:** open
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
---

## Q-007: Hold H-817f132e: UI criterion C-e722bbf4 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-008: Hold H-49d28f26: UI criterion C-4ef0679b has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-009: Hold H-91c87ac7: UI criterion C-b054e7d6 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-010: Hold H-e45e045d: UI criterion C-ffb190b2 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-011: Hold H-36707f19: UI criterion C-1577878d has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-012: Hold H-e4efbea1: UI criterion C-14067443 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-013: Hold H-ec613652: UI criterion C-2d3f3998 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-014: Hold H-829dbc6c: UI criterion C-51d4764a has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-015: Hold H-75cdf554: UI criterion C-425a9f46 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-016: Hold H-45489073: UI criterion C-9eeb9987 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-017: Hold H-d1f76909: UI criterion C-2159a890 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
---

## Q-018: Hold H-cdb99000: UI criterion C-88a078f0 has no end-to-end test; see the generated UI tests table

- **Status:** open
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
