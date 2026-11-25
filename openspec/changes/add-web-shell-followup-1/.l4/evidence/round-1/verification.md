# Verification: openspec:add-web-shell-followup-1: NEEDS_HUMAN (round 1)

traceability: 32/33 criteria covered by a discriminating test

- Base: `14ff110b987b3bff5a6a5bb465da2cf3b8156eeb`
- Head: `2440ee533f34e8533b4a7287de21a1c98d723ec8`
- Implementer profiles: deepseek-free, beam
- Judge: nemotron-judge, 5 call(s), prompt sha256 `a3d343b95112d3feb2631dc0b839034a53e30f10f9c2ff16ed3903d49702f908`
- Judge replies of nemotron-judge (this unit, all rounds): valid 2, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), beam reflection (declared)
- Cost: $0.7343

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.3 | base merged: main@14ff110b98 as 2440ee533f (7 commits) |
| 1 | integrity | ok | 289.7 | 11 sub-checks; scope: 14 changed file(s) |
| 2 | build | ok | 34.9 |  |
| 3 | tests | ok | 487.9 |  |
| 4 | traceability | ok | 0.3 | 32/33 criteria covered |
| 4a | audit sampling | ok | 4.8 | 1 not_testable; support files at the base: 2 |
| 5 | ui test generation | ok | 221.3 | 2 fails_at_head, 21 not_testable; e2e support files shown to the writer: 1 |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: web/src/app/App.tsx |
| 8 | s1 judge | ok | 1.6 | 33/33 criteria judged by jev |
| 9 | judge | ok | 1032.5 | 5 call(s) |
| 10 | aggregation | ok | 0.0 | NEEDS_HUMAN |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261125T2214Z-b404/014-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261125T2214Z-b404/015-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261125T2214Z-b404/016-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261125T2214Z-b404/017-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261125T2214Z-b404/018-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261125T2214Z-b404/019-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261125T2214Z-b404/020-e2e.log |

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 1 task(s): red and green compared |
| test path freeze | ok | 1 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: web/src/app/App.tsx, web/src/app/feature-page-gate.test.ts |
| tdd history | ok | 1 task(s); red tests passing at head: step 3 |
| python encoding | ok | 1 Python file(s) added or changed, each read, none declares another encoding |
| pre-existing tests still pass | ok | 3110 of 3110 base tests pass on the unit's code with its 1 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- e2e/test_m2_admin.py kept at head for the run (task 1.1: unfrozen by Q-001)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-8c08d9f5 | web-shell › A feature's page opens for a user without the feature's capability — feedback FB-001 › A feature's page opens for a user without the feature's capability | covered | web.src.app.feature-page-gate.test.ts::C-8c08d9f5 App gates a capability feature's page on the client except admin-users (passed, red_assertion) | test_m2_admin::test_c_8c08d9f5_alice_sees_only_the_not_allowed_panel_on_grants[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m2_admin::test_c_8c08d9f5_alice_still_sends_the_users_request[chromium] (no proof that it discriminates (no red, audit or generated reco... | 0.89 | `e2e/test_l4_c_8c08d9f5.py`, `test-results/test-l4-c-8c08d9f5-py-test-author-opening-admin-grants-sees-only-not-allowed-panel-chromium/test-failed-1.png`, `test-results/test-l4-c-8c08d9f5-py-test-author-opening-admin-grants-sees-only-not-allowed-panel-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-ba861867 | web-shell › Every response carries the security headers › Success, error and not-found responses | covered | src.api.security-headers.test.ts::C-ba861867 success error and not-found responses carry the exact security headers (passed, pass_to_pass) | - | 0.79 | - |
| C-61225ade | web-shell › Every response carries the security headers › A handler cannot weaken them and a second call changes nothing | covered | src.api.security-headers.test.ts::C-61225ade a handler cannot weaken the CSP and a second registration changes nothing (passed, pass_to_pass) | - | 0.85 | - |
| C-383b59d1 | web-shell › The engine serves the web build › Files, types and cache | covered | src.api.web.test.ts::C-383b59d1 static files carry their type and cache policy and HEAD has an empty body (passed, pass_to_pass) | - | 0.95 | - |
| C-b2a74658 | web-shell › The engine serves the web build › Names, types and cache policy | covered | src.api.web-paths.test.ts::C-b2a74658 cacheControlFor is immutable only for hashed assets (passed, pass_to_pass); src.api.web-paths.test.ts::C-b2a74658 contentTypeFor maps the scenario names every extension and an unknown one (passed, pass_to_pass); src.api.web-paths.test.ts::C-b2a74658 isAssetName ... | - | 0.89 | - |
| C-62803105 | web-shell › The engine serves the web build › Unknown extension | covered | src.api.web.test.ts::C-62803105 an unknown extension is served as octet-stream with nosniff (passed, pass_to_pass) | - | 0.58 | - |
| C-133bb26a | web-shell › Deep links return the app › Client routes | covered | src.api.web.test.ts::C-133bb26a client routes and a directory fall back to index.html (passed, pass_to_pass); test_l4_c_133bb26a::test_client_routes_return_index_html[chromium] (passed, pass_to_pass) | - | 0.91 | - |
| C-ae2edc66 | web-shell › Deep links return the app › Missing asset | covered | src.api.web.test.ts::C-ae2edc66 a missing asset-like path answers the JSON 404 (passed, pass_to_pass); test_l4_c_ae2edc66::test_missing_assets_return_json_404_not_found[chromium] (passed, pass_to_pass) | - | 0.90 | - |
| C-0548f9d4 | web-shell › Static file requests stay inside the web build › Traversal forms over a socket | covered | src.api.web.test.ts::C-0548f9d4 raw socket traversal forms answer 404 and never read the secret (passed, pass_to_pass); test_l4_c_0548f9d4::test_static_file_traversal_forms_over_socket_return_not_found[chromium] (passed, pass_to_pass) | - | 0.94 | - |
| C-1dc68043 | web-shell › Static file requests stay inside the web build › The classifier on raw strings | covered | src.api.web-paths.test.ts::C-1dc68043 classifyWebPath classifies the raw strings (passed, pass_to_pass) | - | 0.93 | - |
| C-946ba56d | web-shell › Unknown API and root paths answer the JSON 404 › Unknown API paths | covered | src.api.web.test.ts::C-946ba56d unknown API and root paths answer the exact JSON 404 (passed, pass_to_pass) | - | 0.92 | `e2e/test_l4_c_946ba56d.py`, `.l4-out/e2e/page.html` |
| C-a91f316f | web-shell › Unknown API and root paths answer the JSON 404 › Non-GET on a client route, and routes added later win | covered | src.api.web.test.ts::C-a91f316f non-GET client routes answer 404 and a later specific route wins (passed, pass_to_pass) | - | 0.94 | - |
| C-31ad3638 | web-shell › A missing build is reported and does not stop the engine › Missing then built | covered | src.api.web.test.ts::C-31ad3638 a missing build answers WEB_NOT_BUILT and is served once index.html appears (passed, pass_to_pass) | - | 0.93 | - |
| C-56d1014e | web-shell › A missing build is reported and does not stop the engine › A directory that is not a web build | covered | src.api.web.test.ts::C-56d1014e a directory that is not a web build serves no file (passed, pass_to_pass) | - | 0.91 | - |
| C-967db51d | web-shell › A missing build is reported and does not stop the engine › Bad registration | covered | src.api.web.test.ts::C-967db51d bad registration is refused and a second valid call is a duplicate (passed, pass_to_pass) | - | 0.93 | - |
| C-8182ad8f | web-shell › The composition root serves the web app › Configured directory | covered | src.main.web.test.ts::C-8182ad8f main serves a configured web build, health and the JSON 404 (passed, pass_to_pass); test_l4_c_8182ad8f::test_composition_root_serves_web_app_health_and_api_404[chromium] (passed, pass_to_pass) | - | 0.94 | - |
| C-1b33755d | web-shell › The composition root serves the web app › Unbuilt directory warns once | covered | src.main.web.test.ts::C-1b33755d main warns once for an unbuilt directory and serves health (passed, pass_to_pass) | - | 0.92 | - |
| C-2c3a693b | web-shell › The composition root serves the web app › A bad directory stops the start | covered | src.main.web.test.ts::C-2c3a693b main fails startup for an invalid web directory and closes the database once (passed, pass_to_pass) | - | 0.94 | - |
| C-2b18a36e | web-shell › The composition root serves the web app › Default directory | covered | src.api.web.test.ts::C-2b18a36e DEFAULT_WEB_DIST is the repository's web/dist (passed, pass_to_pass); test_l4_c_2b18a36e::test_default_web_dist_serves_web_app[chromium] (passed, pass_to_pass) | - | 0.83 | - |
| C-12290cf5 | web-shell › ApiClient › Success and request shape | covered | web.src.api.client.test.ts::C-12290cf5 an ApiClient sends JSON requests to the same origin (passed, pass_to_pass); web.src.api.client.test.ts::C-12290cf5 caller headers win and the abort signal is passed through (passed, pass_to_pass, inadequate); web.src.api.client.test.ts::C-12290cf5 put, patch an... | - | 0.87 | - |
| C-76b2dd3e | web-shell › ApiClient › Envelope, other failures and bad input | covered | web.src.api.client.test.ts::C-76b2dd3e a 2xx with a non-JSON body becomes INVALID_RESPONSE (passed, pass_to_pass); web.src.api.client.test.ts::C-76b2dd3e a non-envelope failure becomes HTTP_ERROR with the status (passed, pass_to_pass); web.src.api.client.test.ts::C-76b2dd3e a rejecting fetch becomes... | - | 0.95 | - |
| C-0a8a6d93 | web-shell › Feature registry › Order and filtering | covered | web.src.app.features.test.ts::C-0a8a6d93 the default registry holds registered features and exposes them by list and nav (passed, pass_to_pass); web.src.app.features.test.ts::C-0a8a6d93 the registry keeps registration order and filters the nav by capability (passed, pass_to_pass) | - | 0.91 | - |
| C-5e6db9ca | web-shell › Feature registry › Refusals | covered | web.src.app.features.test.ts::C-5e6db9ca the registry refuses duplicate reserved and invalid features (passed, pass_to_pass) | - | 0.92 | - |
| C-5752eaaf | web-shell › Feature registry › Reserved roots match whole segments | covered | web.src.app.features.test.ts::C-5752eaaf reserved roots match whole segments only (passed, pass_to_pass) | - | 0.68 | - |
| C-34823202 | web-shell › Feature registry › The web reserved roots equal the engine's | covered | web.src.app.reserved-roots.test.ts::C-34823202 the web reserved roots equal the engine reserved roots (passed, pass_to_pass) | - | 0.92 | - |
| C-87996887 | web-shell › The landing page reports engine health › Health states in the logic | covered | web.src.app.health.test.ts::C-87996887 loadEngineHealth classifies /health and engineHealthText names each state (passed, pass_to_pass); web.src.app.health.test.ts::C-87996887 loadEngineHealth rethrows an AbortError unchanged and hands the signal to client.get (passed, pass_to_pass); test_l4_c_87996... | - | 0.93 | - |
| C-abaa85a3 | web-shell › The landing page reports engine health › The view for each state | covered | web.src.app.health.test.ts::C-abaa85a3 healthView holds the text, button and focus rule for each state (passed, pass_to_pass) | - | 0.82 | - |
| C-1542e67b | web-shell › The landing page reports engine health › Loading, healthy and unavailable in the browser | covered | test_l4_c_1542e67b::test_landing_page_reports_engine_health[chromium] (passed, pass_to_pass); test_m0_skeleton::test_landing_page_health_states[chromium] (passed, pass_to_pass); test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium] (passed, pass_to_pass) | - | 0.91 | - |
| C-60599e6f | web-shell › The shell is accessible and works for deep links › Landmarks, keyboard and CSP | covered | test_l4_c_60599e6f::test_shell_landmarks_keyboard_and_csp[chromium] (passed, pass_to_pass); test_m0_skeleton::test_shell_landmarks_and_skip_link[chromium] (passed, pass_to_pass) | - | 0.85 | - |
| C-acc8eaf4 | web-shell › The shell is accessible and works for deep links › Route table and titles | covered | web.src.app.routes.test.ts::C-acc8eaf4 routeTable appends not-found and pageTitle names the pages (passed, pass_to_pass); test_l4_c_acc8eaf4::test_route_table_and_titles[chromium] (passed, pass_to_pass) | - | 0.95 | - |
| C-0daf92cd | web-shell › The shell is accessible and works for deep links › Deep link | uncovered | - | test_l4_c_0daf92cd::test_deep_link_not_found_shell[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_deep_link_returns_the_app[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.03 | `e2e/test_l4_c_0daf92cd.py`, `test-results/test-l4-c-0daf92cd-py-test-deep-link-flows-shows-not-found-in-shell-chromium/test-failed-1.png`, `test-results/test-l4-c-0daf92cd-py-test-deep-link-flows-shows-not-found-in-shell-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-b5ce03f4 | web-shell › The offline stack serves the built app and the journey passes › The part | covered | test.support.e2e-stack.web-part.test.ts::C-b5ce03f4 the web part is discovered after the database and hands the built web directory to the engine (passed, pass_to_pass) | - | 0.89 | - |
| C-3dda369f | web-shell › The offline stack serves the built app and the journey passes › The M0 journey | covered | test_l4_c_3dda369f::test_m0_journey[chromium] (passed, pass_to_pass); test_m0_skeleton::test_encoded_traversal_is_refused (passed, pass_to_pass); test_m0_skeleton::test_landing_page_reports_engine_health[chromium] (passed, pass_to_pass); test_m0_skeleton::test_security_headers_on_every_response[chro... | - | 0.91 | - |

## Evidence

### Needs attention

Nothing needs attention.

### Files

Scope not judged: the spec names no path or module in backticks: nothing to compare against

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: web/src/app/App.tsx

### Tests

3250 of 3250 passed, 0 failed, 0 errored, 0 skipped.
1 of 1 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-8c08d9f5 | fails_at_head | e2e/test_l4_c_8c08d9f5.py | fail | fail | 2 | the test fails at the head: test_l4_c_8c08d9f5::test_author_opening_admin_grants_sees_only_not_allowed_panel[chromium] | test-results/test-l4-c-8c08d9f5-py-test-author-opening-admin-grants-sees-only-not-allowed-panel-chromium/test-failed-1.png, test-results/test-l4-c-8c08d9f5-py-test-author-opening-admin-grants-sees-only-not-allowed-panel-chromium/trace.zip |
| C-ba861867 | not_testable | - | - | - | 1 | Needs a buildServer instance with a throwing route, ApiError route and invalid-JSON POST; those routes don't exist in the served e2e stack, so this is a server unit test, not a browser check. | - |
| C-61225ade | not_testable | - | - | - | 1 | Criterion concerns a server-side registerSecurityHeaders call and a route setting its own CSP, plus a SECURITY_HEADERS constant; none are observable through the browser UI. | - |
| C-383b59d1 | not_testable | - | - | - | 1 | The criterion fixes the contents of distDir (index-Ab3dEf9Z.js, favicon.svg), which an e2e test against the served stack cannot set. It also needs raw HEAD and header checks that a browser page does not expose. | - |
| C-b2a74658 | not_testable | - | - | - | 1 | Criterion is about pure engine functions (isAssetName, contentTypeFor, cacheControlFor) with specific inputs; not reachable via the browser UI. | - |
| C-62803105 | not_testable | - | - | - | 1 | The scenario needs a data.bin file placed in the engine's distDir. The browser e2e suite serves a fixed web build, so it cannot create that file or point the engine at a different directory. | - |
| C-1dc68043 | not_testable | - | - | - | 1 | classifyWebPath is an internal server-side function with no browser-observable surface; the criterion is about its return values on raw strings, which a unit test covers, not an e2e page test. | - |
| C-946ba56d | not_testable | e2e/test_l4_c_946ba56d.py | - | - | 2 | Depends on an exact 404 body defined elsewhere and not shown; concerns server routing the UI-only diff does not touch. | - |
| C-a91f316f | not_testable | - | - | - | 1 | The criterion needs a route registered in server code after registerWebApp. The e2e stack serves a fixed app and a browser test cannot register that route, so it can't be checked from outside. | - |
| C-31ad3638 | not_testable | - | - | - | 1 | Needs the engine's distDir removed and index.html created at runtime and the isWebBuilt function called; a browser test against the already-built served origin cannot do this. | - |
| C-56d1014e | not_testable | - | - | - | 1 | Needs the server started with a distDir holding only secret.txt; the e2e stack serves a real build and a browser test cannot reconfigure it. | - |
| C-967db51d | not_testable | - | - | - | 1 | Concerns server-side registerWebApp API errors (WebAppError codes); not observable through the browser UI. | - |
| C-1b33755d | not_testable | - | - | - | 1 | Requires running main() with an empty temp webDist and capturing server log lines; the e2e stack serves a built app, so this is not observable through the browser. | - |
| C-2c3a693b | not_testable | - | - | - | 1 | Criterion concerns the server composition root's `main` with injected loadConfig/openDatabase, exit codes and fatal logs; not observable through the browser UI. | - |
| C-12290cf5 | not_testable | - | - | - | 1 | Criterion concerns the ApiClient module with an injected fake fetch; it is not reachable through the built web page's public UI, so a browser e2e test cannot check it. | - |
| C-76b2dd3e | not_testable | - | - | - | 1 | Criterion is about the ApiClient module's unit-level behavior (injected fake fetch, RangeError before fetch, AbortError rethrow); not observable through the browser UI. | - |
| C-0a8a6d93 | not_testable | - | - | - | 1 | Describes the in-memory feature registry's list()/nav() API on a fresh instance; not observable through the browser UI, so it is a unit-level check. | - |
| C-5e6db9ca | not_testable | - | - | - | 1 | Feature registry refusals are an in-memory TypeScript API (FeatureError, list()) with no browser-visible behavior; a Playwright e2e test cannot exercise it. | - |
| C-5752eaaf | not_testable | - | - | - | 1 | Feature registry list() and register() are internal module APIs, not reachable from the browser; no user-visible outcome in the UI. | - |
| C-34823202 | not_testable | - | - | - | 1 | Compares two source-level constants (RESERVED_ROOTS in web/src/app/features.ts and src/api/web-paths.ts); no browser-observable behavior, so it is a unit test, not e2e. | - |
| C-abaa85a3 | not_testable | - | - | - | 1 | The criterion specifies a pure function's (healthView) input/output mapping, which is not observable through the browser UI; the diff shows no page behavior for it. | - |
| C-0daf92cd | fails_at_head | e2e/test_l4_c_0daf92cd.py | fail | fail | 2 | the test fails at the head: test_l4_c_0daf92cd::test_deep_link_flows_shows_not_found_in_shell[chromium] | test-results/test-l4-c-0daf92cd-py-test-deep-link-flows-shows-not-found-in-shell-chromium/test-failed-1.png, test-results/test-l4-c-0daf92cd-py-test-deep-link-flows-shows-not-found-in-shell-chromium/trace.zip |
| C-b5ce03f4 | not_testable | - | - | - | 1 | Checks Node-side stack part wiring (discoverParts, webPart.start with a hand-made context), not anything a user sees or does in the browser. | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-8c08d9f5 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ba861867 | ok | 0.790 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-61225ade | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-383b59d1 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b2a74658 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-62803105 | ok | 0.580 | jev-1.13.0 | jev | - |
| C-133bb26a | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ae2edc66 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0548f9d4 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1dc68043 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-946ba56d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a91f316f | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-31ad3638 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-56d1014e | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-967db51d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8182ad8f | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1b33755d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2c3a693b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2b18a36e | ok | 0.830 | jev-1.13.0 | jev | - |
| C-12290cf5 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-76b2dd3e | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0a8a6d93 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5e6db9ca | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5752eaaf | ok | 0.680 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-34823202 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87996887 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-abaa85a3 | ok | 0.820 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1542e67b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-60599e6f | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-acc8eaf4 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0daf92cd | ok | 0.030 | jev-1.13.0 | jev | - |
| C-b5ce03f4 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3dda369f | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-8c08d9f5 | not_testable | - | - | Behaviour lives in a React/TypeScript web UI (routes, rendered panel, network requests); no Python module or existing pytest header is shown to import. |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-8c08d9f5 | web-shell › A feature's page opens for a user without the feature's capability — feedback FB-001 › A feature's page opens for a user without the feature's capability | pass | pass | the judge passed it and a discriminating test passes |
| C-ba861867 | web-shell › Every response carries the security headers › Success, error and not-found responses | pass | pass | the judge passed it and a discriminating test passes |
| C-61225ade | web-shell › Every response carries the security headers › A handler cannot weaken them and a second call changes nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-383b59d1 | web-shell › The engine serves the web build › Files, types and cache | pass | pass | the judge passed it and a discriminating test passes |
| C-b2a74658 | web-shell › The engine serves the web build › Names, types and cache policy | pass | pass | the judge passed it and a discriminating test passes |
| C-62803105 | web-shell › The engine serves the web build › Unknown extension | pass | pass | the judge passed it and a discriminating test passes |
| C-133bb26a | web-shell › Deep links return the app › Client routes | pass | pass | the judge passed it and a discriminating test passes |
| C-ae2edc66 | web-shell › Deep links return the app › Missing asset | pass | pass | the judge passed it and a discriminating test passes |
| C-0548f9d4 | web-shell › Static file requests stay inside the web build › Traversal forms over a socket | pass | pass | the judge passed it and a discriminating test passes |
| C-1dc68043 | web-shell › Static file requests stay inside the web build › The classifier on raw strings | pass | pass | the judge passed it and a discriminating test passes |
| C-946ba56d | web-shell › Unknown API and root paths answer the JSON 404 › Unknown API paths | pass | pass | the judge passed it and a discriminating test passes |
| C-a91f316f | web-shell › Unknown API and root paths answer the JSON 404 › Non-GET on a client route, and routes added later win | pass | pass | the judge passed it and a discriminating test passes |
| C-31ad3638 | web-shell › A missing build is reported and does not stop the engine › Missing then built | pass | pass | the judge passed it and a discriminating test passes |
| C-56d1014e | web-shell › A missing build is reported and does not stop the engine › A directory that is not a web build | pass | pass | the judge passed it and a discriminating test passes |
| C-967db51d | web-shell › A missing build is reported and does not stop the engine › Bad registration | pass | pass | the judge passed it and a discriminating test passes |
| C-8182ad8f | web-shell › The composition root serves the web app › Configured directory | pass | pass | the judge passed it and a discriminating test passes |
| C-1b33755d | web-shell › The composition root serves the web app › Unbuilt directory warns once | pass | pass | the judge passed it and a discriminating test passes |
| C-2c3a693b | web-shell › The composition root serves the web app › A bad directory stops the start | pass | pass | the judge passed it and a discriminating test passes |
| C-2b18a36e | web-shell › The composition root serves the web app › Default directory | pass | pass | the judge passed it and a discriminating test passes |
| C-12290cf5 | web-shell › ApiClient › Success and request shape | pass | pass | the judge passed it and a discriminating test passes |
| C-76b2dd3e | web-shell › ApiClient › Envelope, other failures and bad input | pass | pass | the judge passed it and a discriminating test passes |
| C-0a8a6d93 | web-shell › Feature registry › Order and filtering | pass | pass | the judge passed it and a discriminating test passes |
| C-5e6db9ca | web-shell › Feature registry › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-5752eaaf | web-shell › Feature registry › Reserved roots match whole segments | pass | pass | the judge passed it and a discriminating test passes |
| C-34823202 | web-shell › Feature registry › The web reserved roots equal the engine's | pass | pass | the judge passed it and a discriminating test passes |
| C-87996887 | web-shell › The landing page reports engine health › Health states in the logic | pass | pass | the judge passed it and a discriminating test passes |
| C-abaa85a3 | web-shell › The landing page reports engine health › The view for each state | pass | pass | the judge passed it and a discriminating test passes |
| C-1542e67b | web-shell › The landing page reports engine health › Loading, healthy and unavailable in the browser | pass | pass | the judge passed it and a discriminating test passes |
| C-60599e6f | web-shell › The shell is accessible and works for deep links › Landmarks, keyboard and CSP | pass | pass | the judge passed it and a discriminating test passes |
| C-acc8eaf4 | web-shell › The shell is accessible and works for deep links › Route table and titles | pass | pass | the judge passed it and a discriminating test passes |
| C-0daf92cd | web-shell › The shell is accessible and works for deep links › Deep link | insufficient_evidence | needs_human | uncovered: no adequate discriminating test traces it |
| C-b5ce03f4 | web-shell › The offline stack serves the built app and the journey passes › The part | pass | pass | the judge passed it and a discriminating test passes |
| C-3dda369f | web-shell › The offline stack serves the built app and the journey passes › The M0 journey | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-8c08d9f5): test_m2_admin::test_c_8c08d9f5_alice_sees_only_the_not_allowed_panel_on_grants[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-8c08d9f5): test_m2_admin::test_c_8c08d9f5_alice_still_sends_the_users_request[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-8c08d9f5): test_m2_admin::test_c_8c08d9f5_carol_still_opens_the_grants_page[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-0daf92cd): test_l4_c_0daf92cd::test_deep_link_not_found_shell[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-0daf92cd): test_m0_skeleton::test_deep_link_returns_the_app[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-8c08d9f5): The end-to-end test test_m2_admin::test_c_8c08d9f5_alice_sees_only_the_not_allowed_panel_on_grants[chromium], test_m2_admin::test_c_8c08d9f5_alice_still_sends_the_users_request[chromium], test_m2_admin::test_c_8c08d9f5_carol_still_opens_the_grants_page[chromium] traces criterion C-8c08d9f5 (web-shell › A feature's page opens for a user without the feature's capability — feedback FB-001 › A feature's page opens for a user without the feature's capability), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ba861867): No end-to-end test traces criterion C-ba861867 (web-shell › Every response carries the security headers › Success, error and not-found responses); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-61225ade): No end-to-end test traces criterion C-61225ade (web-shell › Every response carries the security headers › A handler cannot weaken them and a second call changes nothing); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-383b59d1): No end-to-end test traces criterion C-383b59d1 (web-shell › The engine serves the web build › Files, types and cache); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b2a74658): No end-to-end test traces criterion C-b2a74658 (web-shell › The engine serves the web build › Names, types and cache policy); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-62803105): No end-to-end test traces criterion C-62803105 (web-shell › The engine serves the web build › Unknown extension); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1dc68043): No end-to-end test traces criterion C-1dc68043 (web-shell › Static file requests stay inside the web build › The classifier on raw strings); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-946ba56d): No end-to-end test traces criterion C-946ba56d (web-shell › Unknown API and root paths answer the JSON 404 › Unknown API paths); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a91f316f): No end-to-end test traces criterion C-a91f316f (web-shell › Unknown API and root paths answer the JSON 404 › Non-GET on a client route, and routes added later win); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-31ad3638): No end-to-end test traces criterion C-31ad3638 (web-shell › A missing build is reported and does not stop the engine › Missing then built); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-56d1014e): No end-to-end test traces criterion C-56d1014e (web-shell › A missing build is reported and does not stop the engine › A directory that is not a web build); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-967db51d): No end-to-end test traces criterion C-967db51d (web-shell › A missing build is reported and does not stop the engine › Bad registration); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1b33755d): No end-to-end test traces criterion C-1b33755d (web-shell › The composition root serves the web app › Unbuilt directory warns once); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2c3a693b): No end-to-end test traces criterion C-2c3a693b (web-shell › The composition root serves the web app › A bad directory stops the start); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-12290cf5): No end-to-end test traces criterion C-12290cf5 (web-shell › ApiClient › Success and request shape); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-76b2dd3e): No end-to-end test traces criterion C-76b2dd3e (web-shell › ApiClient › Envelope, other failures and bad input); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0a8a6d93): No end-to-end test traces criterion C-0a8a6d93 (web-shell › Feature registry › Order and filtering); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5e6db9ca): No end-to-end test traces criterion C-5e6db9ca (web-shell › Feature registry › Refusals); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5752eaaf): No end-to-end test traces criterion C-5752eaaf (web-shell › Feature registry › Reserved roots match whole segments); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-34823202): No end-to-end test traces criterion C-34823202 (web-shell › Feature registry › The web reserved roots equal the engine's); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-abaa85a3): No end-to-end test traces criterion C-abaa85a3 (web-shell › The landing page reports engine health › The view for each state); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0daf92cd): The end-to-end test test_l4_c_0daf92cd::test_deep_link_not_found_shell[chromium], test_m0_skeleton::test_deep_link_returns_the_app[chromium] traces criterion C-0daf92cd (web-shell › The shell is accessible and works for deep links › Deep link), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b5ce03f4): No end-to-end test traces criterion C-b5ce03f4 (web-shell › The offline stack serves the built app and the journey passes › The part); step 5 generates one.
- [minor, judge] Non-ready non-null session renders the gated feature page (spec gap) (criterion C-8c08d9f5): When useSession() returns a non-null session whose status is not "ready" (e.g. still loading/refreshing), FeaturePage returns feature.element, rendering the full feature page instead of a loading panel or the not-allowed panel. The criterion's WHEN scenario pins down a signed-in user whose /me capabilities are known (session ready), so this input is unpinned; two reasonable implementations differ (show LoadingState vs show feature.element).
- [minor, judge] the judge called a test inadequate (criterion C-12290cf5): web.src.api.client.test.ts::C-12290cf5 caller headers win and the abort signal is passed through
- [minor, judge] the judge called a test inadequate (criterion C-12290cf5): web.src.api.client.test.ts::C-12290cf5 put, patch and delete send their methods and JSON bodies

## Feedback

- FB-001: judged addressed, pending a PASS round: web/src/app/App.tsx FeaturePage returns ErrorPanel when a ready session lacks the feature capability and feature.element when it has it; SERVER_GATED_FEATURES names the admin-users exception; e2e/test_m2_admin.py alice/carol grants tests pass (not-allowed panel, no forms/tables/lists/API requests...

## Needs a human

- UI criterion C-8c08d9f5 has no end-to-end test; see the generated UI tests table
- UI criterion C-ba861867 has no end-to-end test; see the generated UI tests table
- UI criterion C-61225ade has no end-to-end test; see the generated UI tests table
- UI criterion C-383b59d1 has no end-to-end test; see the generated UI tests table
- UI criterion C-b2a74658 has no end-to-end test; see the generated UI tests table
- UI criterion C-62803105 has no end-to-end test; see the generated UI tests table
- UI criterion C-1dc68043 has no end-to-end test; see the generated UI tests table
- UI criterion C-946ba56d has no end-to-end test; see the generated UI tests table
- UI criterion C-a91f316f has no end-to-end test; see the generated UI tests table
- UI criterion C-31ad3638 has no end-to-end test; see the generated UI tests table
- UI criterion C-56d1014e has no end-to-end test; see the generated UI tests table
- UI criterion C-967db51d has no end-to-end test; see the generated UI tests table
- UI criterion C-1b33755d has no end-to-end test; see the generated UI tests table
- UI criterion C-2c3a693b has no end-to-end test; see the generated UI tests table
- UI criterion C-12290cf5 has no end-to-end test; see the generated UI tests table
- UI criterion C-76b2dd3e has no end-to-end test; see the generated UI tests table
- UI criterion C-0a8a6d93 has no end-to-end test; see the generated UI tests table
- UI criterion C-5e6db9ca has no end-to-end test; see the generated UI tests table
- UI criterion C-5752eaaf has no end-to-end test; see the generated UI tests table
- UI criterion C-34823202 has no end-to-end test; see the generated UI tests table
- UI criterion C-abaa85a3 has no end-to-end test; see the generated UI tests table
- UI criterion C-0daf92cd has no end-to-end test; see the generated UI tests table
- UI criterion C-b5ce03f4 has no end-to-end test; see the generated UI tests table

## New tests (red then green, `task.red_ok` in the ledger)

- `web.src.app.feature-page-gate.test.ts::C-8c08d9f5 App gates a capability feature's page on the client except admin-users` (task 1.1): passed

## Guard events

- guard.violation: web/src/app/page-gate.ts
- guard.violation: web/src/app/App.tsx
