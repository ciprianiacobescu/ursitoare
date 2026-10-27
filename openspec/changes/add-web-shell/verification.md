# Verification: openspec:add-web-shell: PASS (round 2)

traceability: 32/32 criteria covered by a discriminating test

- Base: `b31f357a4e94c6928cf3c89f7b90ce53d3fa370c`
- Head: `bdc06b71808b50f970bdc38ece7e29e6e39228ea`
- Implementer profiles: deepseek, glm, claude-sonnet
- Judge: gemini-judge, 2 call(s), judged in 2 parts, prompt sha256 `4a04f842b07d2306ad9835672839d23a28c5e6a1cd05c32ad121b158350deaa2`
  - part 1: 22 file(s), 101659 characters, profile gemini-judge, reply repaired
  - part 2: 6 file(s), 38095 characters, profile gemini-judge, reply valid
- Judge replies of gemini-judge (this unit, all rounds): valid 1, repaired 1, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): gemini-judge google (declared), deepseek deepseek (declared), glm zhipu (declared), claude-sonnet anthropic (tool)
- Cost: $2.9417

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 1) |
| 1 | integrity | reused | 0.0 | reused (round 1) |
| 2 | build | reused | 0.0 | reused (round 1) |
| 3 | tests | reused | 0.0 | reused (round 1) |
| 4 | traceability | reused | 0.0 | reused (round 1) |
| 4a | audit sampling | reused | 0.0 | reused (round 1) |
| 5 | ui test generation | reused | 0.0 | reused (round 1) |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261027T0440Z-a72a/023-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261027T0440Z-a72a/024-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261027T0440Z-a72a/025-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261027T0440Z-a72a/026-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261027T0440Z-a72a/027-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261027T0440Z-a72a/028-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261027T0440Z-a72a/029-e2e.log |

## Files by part

- part 1: web/src/features/10-home.tsx (2140 characters)
- part 1: test/support/e2e-stack/parts/20-web.ts (261 characters)
- part 1: web/src/app/App.tsx (1742 characters)
- part 1: web/src/api/client.test.ts (10084 characters)
- part 1: web/src/api/client.ts (6728 characters)
- part 1: web/src/app/features.test.ts (7014 characters)
- part 1: web/src/app/features.ts (6609 characters)
- part 1: web/src/app/health.test.ts (5433 characters)
- part 1: web/src/app/health.ts (2137 characters)
- part 1: web/src/features/index.ts (494 characters)
- part 1: e2e/test_m0_skeleton.py (8305 characters)
- part 1: src/main.ts (1650 characters)
- part 1: src/main.web.test.ts (10720 characters)
- part 1: web/src/main.tsx (655 characters)
- part 1: web/src/app/reserved-roots.test.ts (676 characters)
- part 1: web/src/app/routes.test.ts (1762 characters)
- part 1: web/src/app/routes.ts (1051 characters)
- part 1: src/api/security-headers.test.ts (4964 characters)
- part 1: src/api/security-headers.ts (1503 characters)
- part 1: web/src/app/Shell.tsx (1004 characters)
- part 1: web/src/app/shell.css (1328 characters)
- part 1: openspec/changes/add-web-shell/tasks.md (25399 characters)
- part 2: src/api/web.test.ts (17531 characters)
- part 2: src/api/web.ts (6861 characters)
- part 2: test/support/e2e-stack/web-part.test.ts (2688 characters)
- part 2: test/support/e2e-stack/web-part.ts (868 characters)
- part 2: src/api/web-paths.test.ts (5652 characters)
- part 2: src/api/web-paths.ts (4495 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | ok | 1 test file(s) compared with the base |
| red-green freeze | ok | 10 task(s): red and green compared |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/api/security-headers.test.ts, src/api/security-headers.ts, src/api/web-paths.test.ts, src/api/web-paths.ts, src/api/web.test.ts (+20 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 354 of 354 base tests pass on the unit's code with its 11 test and support files at the base (base: not needed) |

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p | Evidence links |
|---|---|---|---|---|---|---|
| C-ba861867 | web-shell › Every response carries the security headers › Success, error and not-found responses | covered | src.api.security-headers.test.ts::C-ba861867 success error and not-found responses carry the exact security headers (passed, red_assertion) | - | 0.87 | - |
| C-61225ade | web-shell › Every response carries the security headers › A handler cannot weaken them and a second call changes nothing | covered | src.api.security-headers.test.ts::C-61225ade a handler cannot weaken the CSP and a second registration changes nothing (passed, red_assertion) | - | 0.89 | - |
| C-383b59d1 | web-shell › The engine serves the web build › Files, types and cache | covered | src.api.web.test.ts::C-383b59d1 static files carry their type and cache policy and HEAD has an empty body (passed, red_assertion) | - | 0.96 | `e2e/test_l4_c_383b59d1.py`, `test-results/test-l4-c-383b59d1-py-test-web-build-files-types-and-cache-chromium/test-failed-1.png`, `test-results/test-l4-c-383b59d1-py-test-web-build-files-types-and-cache-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-b2a74658 | web-shell › The engine serves the web build › Names, types and cache policy | covered | src.api.web-paths.test.ts::C-b2a74658 cacheControlFor is immutable only for hashed assets (passed, red_assertion); src.api.web-paths.test.ts::C-b2a74658 contentTypeFor maps the scenario names every extension and an unknown one (passed, red_assertion); src.api.web-paths.test.ts::C-b2a74658 isAssetNam... | - | 0.95 | - |
| C-62803105 | web-shell › The engine serves the web build › Unknown extension | covered | src.api.web.test.ts::C-62803105 an unknown extension is served as octet-stream with nosniff (passed, red_assertion) | - | 0.67 | - |
| C-133bb26a | web-shell › Deep links return the app › Client routes | covered | src.api.web.test.ts::C-133bb26a client routes and a directory fall back to index.html (passed, red_assertion); test_l4_c_133bb26a::test_client_routes_return_index_html[chromium] (passed, generated, base fail, head pass) | - | 0.94 | `e2e/test_l4_c_133bb26a.py`, `.l4-out/e2e/page.html` |
| C-ae2edc66 | web-shell › Deep links return the app › Missing asset | covered | src.api.web.test.ts::C-ae2edc66 a missing asset-like path answers the JSON 404 (passed, red_assertion); test_l4_c_ae2edc66::test_missing_assets_return_json_404_not_found[chromium] (passed, generated, base fail, head pass) | - | 0.91 | `e2e/test_l4_c_ae2edc66.py`, `.l4-out/e2e/page.html` |
| C-0548f9d4 | web-shell › Static file requests stay inside the web build › Traversal forms over a socket | covered | src.api.web.test.ts::C-0548f9d4 raw socket traversal forms answer 404 and never read the secret (passed, red_assertion); test_l4_c_0548f9d4::test_static_file_traversal_forms_over_socket_return_not_found[chromium] (passed, generated, base fail, head pass) | - | 0.95 | `e2e/test_l4_c_0548f9d4.py`, `.l4-out/e2e/page.html` |
| C-1dc68043 | web-shell › Static file requests stay inside the web build › The classifier on raw strings | covered | src.api.web-paths.test.ts::C-1dc68043 classifyWebPath classifies the raw strings (passed, red_assertion) | - | 0.94 | - |
| C-946ba56d | web-shell › Unknown API and root paths answer the JSON 404 › Unknown API paths | covered | src.api.web.test.ts::C-946ba56d unknown API and root paths answer the exact JSON 404 (passed, red_assertion) | - | 0.92 | `e2e/test_l4_c_946ba56d.py`, `test-results/test-l4-c-946ba56d-py-test-unknown-api-paths-answer-json-404-when-dist-dir-is-valid-chromium/test-failed-1.png`, `test-results/test-l4-c-946ba56d-py-test-unknown-api-paths-answer-json-404-when-dist-dir-is-valid-chromium/trace.zip`, `.l4-out/e2e/page.html` |
| C-a91f316f | web-shell › Unknown API and root paths answer the JSON 404 › Non-GET on a client route, and routes added later win | covered | src.api.web.test.ts::C-a91f316f non-GET client routes answer 404 and a later specific route wins (passed, red_assertion) | - | 0.95 | - |
| C-31ad3638 | web-shell › A missing build is reported and does not stop the engine › Missing then built | covered | src.api.web.test.ts::C-31ad3638 a missing build answers WEB_NOT_BUILT and is served once index.html appears (passed, red_assertion) | - | 0.94 | - |
| C-56d1014e | web-shell › A missing build is reported and does not stop the engine › A directory that is not a web build | covered | src.api.web.test.ts::C-56d1014e a directory that is not a web build serves no file (passed, red_assertion) | - | 0.87 | - |
| C-967db51d | web-shell › A missing build is reported and does not stop the engine › Bad registration | covered | src.api.web.test.ts::C-967db51d bad registration is refused and a second valid call is a duplicate (passed, red_assertion) | - | 0.94 | - |
| C-8182ad8f | web-shell › The composition root serves the web app › Configured directory | covered | src.main.web.test.ts::C-8182ad8f main serves a configured web build, health and the JSON 404 (passed, red_assertion); test_l4_c_8182ad8f::test_composition_root_serves_web_app_health_and_api_404[chromium] (passed, generated, base fail, head pass) | - | 0.95 | `e2e/test_l4_c_8182ad8f.py`, `.l4-out/e2e/page.html` |
| C-1b33755d | web-shell › The composition root serves the web app › Unbuilt directory warns once | covered | src.main.web.test.ts::C-1b33755d main warns once for an unbuilt directory and serves health (passed, red_assertion) | - | 0.92 | - |
| C-2c3a693b | web-shell › The composition root serves the web app › A bad directory stops the start | covered | src.main.web.test.ts::C-2c3a693b main fails startup for an invalid web directory and closes the database once (passed, red_assertion) | - | 0.94 | - |
| C-2b18a36e | web-shell › The composition root serves the web app › Default directory | covered | src.api.web.test.ts::C-2b18a36e DEFAULT_WEB_DIST is the repository's web/dist (passed, red_assertion); test_l4_c_2b18a36e::test_default_web_dist_serves_web_app[chromium] (passed, generated, base fail, head pass) | - | 0.94 | `e2e/test_l4_c_2b18a36e.py`, `.l4-out/e2e/page.html` |
| C-12290cf5 | web-shell › ApiClient › Success and request shape | covered | web.src.api.client.test.ts::C-12290cf5 an ApiClient sends JSON requests to the same origin (passed, red_assertion); web.src.api.client.test.ts::C-12290cf5 caller headers win and the abort signal is passed through (passed, red_assertion); web.src.api.client.test.ts::C-12290cf5 put, patch and delete s... | - | 0.90 | - |
| C-76b2dd3e | web-shell › ApiClient › Envelope, other failures and bad input | covered | web.src.api.client.test.ts::C-76b2dd3e a 2xx with a non-JSON body becomes INVALID_RESPONSE (passed, red_assertion); web.src.api.client.test.ts::C-76b2dd3e a non-envelope failure becomes HTTP_ERROR with the status (passed, red_assertion); web.src.api.client.test.ts::C-76b2dd3e a rejecting fetch becom... | - | 0.94 | - |
| C-0a8a6d93 | web-shell › Feature registry › Order and filtering | covered | web.src.app.features.test.ts::C-0a8a6d93 the default registry holds registered features and exposes them by list and nav (passed, red_assertion); web.src.app.features.test.ts::C-0a8a6d93 the registry keeps registration order and filters the nav by capability (passed, red_assertion) | - | 0.90 | - |
| C-5e6db9ca | web-shell › Feature registry › Refusals | covered | web.src.app.features.test.ts::C-5e6db9ca the registry refuses duplicate reserved and invalid features (passed, red_assertion) | - | 0.92 | - |
| C-5752eaaf | web-shell › Feature registry › Reserved roots match whole segments | covered | web.src.app.features.test.ts::C-5752eaaf reserved roots match whole segments only (passed, red_assertion) | - | 0.76 | - |
| C-34823202 | web-shell › Feature registry › The web reserved roots equal the engine's | covered | web.src.app.reserved-roots.test.ts::C-34823202 the web reserved roots equal the engine reserved roots (passed, red_assertion) | - | 0.93 | - |
| C-87996887 | web-shell › The landing page reports engine health › Health states in the logic | covered | web.src.app.health.test.ts::C-87996887 loadEngineHealth classifies /health and engineHealthText names each state (passed, red_assertion); web.src.app.health.test.ts::C-87996887 loadEngineHealth rethrows an AbortError unchanged and hands the signal to client.get (passed, red_assertion); test_l4_c_879... | - | 0.92 | `e2e/test_l4_c_87996887.py`, `.l4-out/e2e/page.html` |
| C-abaa85a3 | web-shell › The landing page reports engine health › The view for each state | covered | web.src.app.health.test.ts::C-abaa85a3 healthView holds the text, button and focus rule for each state (passed, red_assertion) | - | 0.94 | - |
| C-1542e67b | web-shell › The landing page reports engine health › Loading, healthy and unavailable in the browser | covered | test_l4_c_1542e67b::test_landing_page_reports_engine_health[chromium] (passed, generated, base fail, head pass) | test_m0_skeleton::test_landing_page_health_states[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.91 | `e2e/test_l4_c_1542e67b.py`, `.l4-out/e2e/page.html` |
| C-60599e6f | web-shell › The shell is accessible and works for deep links › Landmarks, keyboard and CSP | covered | test_l4_c_60599e6f::test_shell_landmarks_keyboard_and_csp[chromium] (passed, generated, base fail, head pass) | test_m0_skeleton::test_shell_landmarks_and_skip_link[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.93 | `e2e/test_l4_c_60599e6f.py`, `.l4-out/e2e/page.html` |
| C-acc8eaf4 | web-shell › The shell is accessible and works for deep links › Route table and titles | covered | web.src.app.routes.test.ts::C-acc8eaf4 routeTable appends not-found and pageTitle names the pages (passed, red_assertion); test_l4_c_acc8eaf4::test_route_table_and_titles[chromium] (passed, generated, base fail, head pass) | - | 0.94 | `e2e/test_l4_c_acc8eaf4.py`, `.l4-out/e2e/page.html` |
| C-0daf92cd | web-shell › The shell is accessible and works for deep links › Deep link | covered | test_l4_c_0daf92cd::test_deep_link_not_found_shell[chromium] (passed, generated, base fail, head pass) | test_m0_skeleton::test_deep_link_returns_the_app[chromium] (no proof that it discriminates (no red, audit or generated record)) | 0.81 | `e2e/test_l4_c_0daf92cd.py`, `.l4-out/e2e/page.html` |
| C-b5ce03f4 | web-shell › The offline stack serves the built app and the journey passes › The part | covered | test.support.e2e-stack.web-part.test.ts::C-b5ce03f4 the web part is discovered after the database and hands the built web directory to the engine (passed, red_assertion) | - | 0.91 | - |
| C-3dda369f | web-shell › The offline stack serves the built app and the journey passes › The M0 journey | covered | test_l4_c_3dda369f::test_m0_journey[chromium] (passed, generated, base fail, head pass) | test_m0_skeleton::test_encoded_traversal_is_refused (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_landing_page_reports_engine_health[chromium] (no proof that it discriminates (no red, audit or generated record)); test_m0_skeleton::test_security_headers_... | 0.89 | `e2e/test_l4_c_3dda369f.py`, `.l4-out/e2e/page.html` |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `e2e/test_m0_skeleton.py` |  | relevant | new test file |
| `openspec/changes/add-web-shell/.l4/ledger/r-20261027T0248Z-c394.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-shell/.l4/ledger/r-20261027T0438Z-bee7.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-shell/.l4/ledger/r-20261027T0440Z-a72a.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-web-shell/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/api/security-headers.test.ts` |  | relevant | new test file |
| `src/api/security-headers.ts` | api | relevant | named in the spec |
| `src/api/web-paths.test.ts` |  | relevant | new test file |
| `src/api/web-paths.ts` | api | relevant | named in the spec |
| `src/api/web.test.ts` |  | relevant | new test file |
| `src/api/web.ts` | api | relevant | named in the spec |
| `src/main.ts` | main | relevant | named in the spec |
| `src/main.web.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/parts/20-web.ts` | test | relevant | named in the spec |
| `test/support/e2e-stack/web-part.test.ts` |  | relevant | new test file |
| `test/support/e2e-stack/web-part.ts` | test | relevant | named in the spec |
| `web/src/api/client.test.ts` |  | relevant | new test file |
| `web/src/api/client.ts` | web | relevant | named in the spec |
| `web/src/app/App.tsx` | web | relevant | named in the spec |
| `web/src/app/Shell.tsx` | web | relevant | named in the spec |
| `web/src/app/features.test.ts` |  | relevant | new test file |
| `web/src/app/features.ts` | web | relevant | named in the spec |
| `web/src/app/health.test.ts` |  | relevant | new test file |
| `web/src/app/health.ts` | web | relevant | named in the spec |
| `web/src/app/reserved-roots.test.ts` |  | relevant | new test file |
| `web/src/app/routes.test.ts` |  | relevant | new test file |
| `web/src/app/routes.ts` | web | relevant | named in the spec |
| `web/src/app/shell.css` | web | relevant | named in the spec |
| `web/src/features/10-home.tsx` | web | relevant | named in the spec |
| `web/src/features/index.ts` | web | relevant | named in the spec |
| `web/src/main.tsx` | web | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/api/security-headers.ts, src/api/web-paths.ts, src/api/web.ts, src/main.ts, test/support/e2e-stack/parts/20-web.ts and 10 more

### Tests

408 of 408 passed, 0 failed, 0 errored, 0 skipped.
47 of 47 new tests passed.

## Generated UI tests

| Criterion | Status | Test | Base | Head | Attempts | Reason | Artefacts |
|---|---|---|---|---|---|---|---|
| C-ba861867 | not_testable | - | - | - | 1 | This criterion requires unit-testing `registerSecurityHeaders` and `buildServer` by injecting custom routes that throw specific errors and asserting unstated HTTP header values, which cannot be done through a Playwright E2E test against a running server. | - |
| C-61225ade | not_testable | - | - | - | 1 | Requires in-process server access to register a custom route weakening CSP, call registerSecurityHeaders twice on the server instance, and inspect the exported SECURITY_HEADERS constant, which cannot be done via an end-to-end Playwright test against L4_E2E_BASE_URL. | - |
| C-383b59d1 | fails_at_head | e2e/test_l4_c_383b59d1.py | fail | fail | 2 | the test fails at the head: test_l4_c_383b59d1::test_web_build_files_types_and_cache[chromium] | test-results/test-l4-c-383b59d1-py-test-web-build-files-types-and-cache-chromium/test-failed-1.png, test-results/test-l4-c-383b59d1-py-test-web-build-files-types-and-cache-chromium/trace.zip |
| C-b2a74658 | not_testable | - | - | - | 1 | Criterion specifies unit-level return values of internal helper functions (isAssetName, contentTypeFor, cacheControlFor) on synthetic filenames that are not exposed or present on the running web server in a browser E2E test. | - |
| C-62803105 | not_testable | - | - | - | 1 | The E2E test only connects to L4_E2E_BASE_URL serving the built web bundle, which does not contain data.bin and does not allow injecting arbitrary files into distDir. | - |
| C-133bb26a | accepted | e2e/test_l4_c_133bb26a.py | fail | pass | 1 | - | - |
| C-ae2edc66 | accepted | e2e/test_l4_c_ae2edc66.py | fail | pass | 2 | - | - |
| C-0548f9d4 | accepted | e2e/test_l4_c_0548f9d4.py | fail | pass | 2 | - | - |
| C-1dc68043 | not_testable | - | - | - | 1 | Criterion specifies the unit-level return values of the internal classifyWebPath function on raw strings, which is not observable through the browser e2e interface. | - |
| C-946ba56d | fails_at_head | e2e/test_l4_c_946ba56d.py | fail | fail | 2 | the test fails at the head: test_l4_c_946ba56d::test_unknown_api_paths_answer_json_404_when_dist_dir_is_valid[chromium] | test-results/test-l4-c-946ba56d-py-test-unknown-api-paths-answer-json-404-when-dist-dir-is-valid-chromium/test-failed-1.png, test-results/test-l4-c-946ba56d-py-test-unknown-api-paths-answer-json-404-when-dist-dir-is-valid-chromium/trace.zip |
| C-a91f316f | not_testable | - | - | - | 1 | Requires registering a test route after calling registerWebApp in-process and raw HTTP method checks rather than user-visible browser interactions against L4_E2E_BASE_URL. | - |
| C-31ad3638 | not_testable | - | - | - | 1 | Requires mutating the server distDir filesystem state (missing, empty, then creating index.html) and calling the internal isWebBuilt helper, which cannot be done from a browser e2e test against L4_E2E_BASE_URL. | - |
| C-56d1014e | not_testable | - | - | - | 1 | Requires starting the server with a custom distDir containing only secret.txt, which cannot be configured from a client test against the pre-built L4_E2E_BASE_URL server. | - |
| C-967db51d | not_testable | - | - | - | 1 | registerWebApp is a server-side registration function that throws WebAppError exceptions during server instance setup and cannot be invoked or observed from a browser E2E test against L4_E2E_BASE_URL. | - |
| C-8182ad8f | accepted | e2e/test_l4_c_8182ad8f.py | fail | pass | 1 | - | - |
| C-1b33755d | not_testable | - | - | - | 1 | Requires invoking the server main function with an empty temp webDist directory and inspecting captured server logs, which is not accessible from a Playwright e2e test against L4_E2E_BASE_URL. | - |
| C-2c3a693b | not_testable | - | - | - | 1 | Requires invoking the Node composition root main() directly with injected loadConfig and openDatabase fakes to verify startup failure, exit code, fatal log output, and database closure when no port is opened, which cannot be observed through a Playwright browser test against L4_E2E_BASE_URL. | - |
| C-2b18a36e | accepted | e2e/test_l4_c_2b18a36e.py | fail | pass | 1 | - | - |
| C-12290cf5 | not_testable | - | - | - | 1 | C-12290cf5 specifies unit-level behavior of the internal TypeScript ApiClient with an injected fake fetch, which is not exposed through the rendered web UI or browser globals in an end-to-end test. | - |
| C-76b2dd3e | not_testable | - | - | - | 1 | C-76b2dd3e specifies unit-level behavior of the internal TypeScript ApiClient module with injected fake fetch functions and invalid call arguments, which is not exposed through any user-facing UI in the web shell. | - |
| C-0a8a6d93 | not_testable | - | - | - | 1 | Criterion specifies the internal TypeScript FeatureRegistry API (register, list, nav), which is not exposed as user-observable behavior in the served web application. | - |
| C-5e6db9ca | not_testable | - | - | - | 1 | FeatureRegistry refusal errors (FeatureError codes and list()) are internal TypeScript module APIs not exposed through user-visible browser interactions or HTTP endpoints at L4_E2E_BASE_URL. | - |
| C-5752eaaf | not_testable | - | - | - | 1 | Criterion specifies internal TypeScript FeatureRegistry API behavior (register and list() on a new registry instance) that is not exposed through the user-facing web UI in an end-to-end browser test. | - |
| C-34823202 | not_testable | - | - | - | 1 | Criterion compares internal TypeScript module constants (RESERVED_ROOTS in web/src/app/features.ts and src/api/web-paths.ts), which are not exposed or observable through the browser UI at L4_E2E_BASE_URL in an end-to-end test. | - |
| C-87996887 | accepted | e2e/test_l4_c_87996887.py | fail | pass | 1 | - | - |
| C-abaa85a3 | writer_failed | - | - | - | 1 | no answer within 600s | - |
| C-1542e67b | accepted | e2e/test_l4_c_1542e67b.py | fail | pass | 1 | - | - |
| C-60599e6f | accepted | e2e/test_l4_c_60599e6f.py | fail | pass | 1 | - | - |
| C-acc8eaf4 | accepted | e2e/test_l4_c_acc8eaf4.py | fail | pass | 1 | - | - |
| C-0daf92cd | accepted | e2e/test_l4_c_0daf92cd.py | fail | pass | 1 | - | - |
| C-b5ce03f4 | not_testable | - | - | - | 1 | Criterion C-b5ce03f4 targets internal Node.js harness APIs (discoverParts, webPart.start, WEB_DIST_PATH) with a hand-made context rather than behavior observable through the browser at L4_E2E_BASE_URL. | - |
| C-3dda369f | accepted | e2e/test_l4_c_3dda369f.py | fail | pass | 1 | - | - |

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-ba861867 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-61225ade | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-383b59d1 | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b2a74658 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-62803105 | ok | 0.670 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-133bb26a | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ae2edc66 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0548f9d4 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1dc68043 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-946ba56d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a91f316f | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-31ad3638 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-56d1014e | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-967db51d | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-8182ad8f | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1b33755d | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2c3a693b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2b18a36e | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-12290cf5 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-76b2dd3e | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0a8a6d93 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5e6db9ca | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-5752eaaf | ok | 0.760 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-34823202 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-87996887 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-abaa85a3 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1542e67b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-60599e6f | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-acc8eaf4 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0daf92cd | ok | 0.810 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b5ce03f4 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3dda369f | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Audit

| Criterion | Status | Test | Support | Reason |
|---|---|---|---|---|
| C-ba861867 | skipped | - | - | cap |
| C-133bb26a | skipped | - | - | cap |
| C-87996887 | skipped | - | - | cap |
| C-a91f316f | skipped | - | - | cap |
| C-abaa85a3 | skipped | - | - | cap |
| C-8182ad8f | skipped | - | - | cap |
| C-56d1014e | skipped | - | - | cap |
| C-b5ce03f4 | not_testable | - | - | The criterion specifies TypeScript symbols (discoverParts, webPart, WEB_DIST_PATH) whose source files are not provided in the prompt and cannot be imported as a Python module in pytest. |
| C-1dc68043 | not_testable | - | - | classifyWebPath is a TypeScript function in src/api/web-paths.ts rather than an importable Python module for pytest, and its interface definition is not included in the shown sources. |

## Answers to verdict questions

- Q-001 accept H-9e76d931 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-ba861867 is the scenario "Success, error and not-found responses" of the requirement "Every response carries the security headers". The specification writes that scenario against a buildServer instance on which the test itself registers a route that throws, a rout...
- Q-002 accept H-b4253062 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-61225ade is the scenario "A handler cannot weaken them and a second call changes nothing" of the requirement "Every response carries the security headers". The specification writes it against a buildServer instance on which the test registers a route that sets con...
- Q-003 accept H-19960e47 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-383b59d1 is the scenario "Files, types and cache" of the requirement "The engine serves the web build". The specification writes it against a test-made distDir that holds index.html, assets/index-Ab3dEf9Z.js and favicon.svg, and asks for the exact content types an...
- Q-004 accept H-c85bdd94 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-b2a74658 is the scenario "Names, types and cache policy" of the requirement "The engine serves the web build". The specification writes it as direct calls of the pure helpers isAssetName, contentTypeFor and cacheControlFor on synthetic names such as a.cd, LOGO.PNG...
- Q-005 accept H-c2167f30 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-62803105 is the scenario "Unknown extension" of the requirement "The engine serves the web build". The specification writes it against a test-made distDir that holds data.bin and asks that a GET of that file answers the type application/octet-stream with x-content...
- Q-006 accept H-e0cb8f86 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-1dc68043 is the scenario "The classifier on raw strings" of the requirement "Static file requests stay inside the web build". The specification writes it as direct calls of the pure function classifyWebPath on thirteen raw strings such as /a/../b, /%zz, /x%2fy and...
- Q-007 accept H-4f97b0f0 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-946ba56d is the scenario "Unknown API paths" of the requirement "Unknown API and root paths answer the JSON 404", which asks that GET /api/v1/does-not-exist, GET /API/v1/x, GET /api, GET /health/extra and POST /api/v1/x all answer 404 with a JSON content type and ...
- Q-008 accept H-657e3f25 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-a91f316f is the scenario "Non-GET on a client route, and routes added later win" of the requirement "Unknown API and root paths answer the JSON 404". The specification writes it against a buildServer instance on which the test itself sends POST /flows, PUT /flows ...
- Q-009 accept H-86a068a1 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-31ad3638 is the scenario "Missing then built" of the requirement "A missing build is reported and does not stop the engine". The specification writes it against an engine whose distDir does not exist, then is created empty, then receives index.html, and it also re...
- Q-010 accept H-cae5cbd4 by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-56d1014e is the scenario "A directory that is not a web build" of the requirement "A missing build is reported and does not stop the engine". The specification writes it against an engine whose distDir holds only secret.txt and asks that GET /secret.txt and GET /f...
- Q-011 accept H-198b895a by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-967db51d is the scenario "Bad registration" of the requirement "A missing build is reported and does not stop the engine". The specification writes it as direct calls of the in-process function registerWebApp with distDir "" and "a\u0000b", and then a valid direct...
- Q-012 accept H-9bf1501b by the delegate (claude-fable-5-1 via claude-code): The hold may be waived. Criterion C-1b33755d is the scenario "Unbuilt directory warns once" of the requirement "The composition root serves the web app". The specification writes it against main run in process with an injected loadConfig whose webDist is an empty temp directory and a captured log de...
- Q-013 accept H-c1376ce6 by agent (CLAUDECODE): The hold may be waived. Criterion C-2c3a693b is the scenario "A bad directory stops the start" of the requirement "The composition root serves the web app". It starts main() with an invalid URSITOARE_WEB_DIST and checks the exit code, the single fatal line and that the database closes once; a stack ...
- Q-014 accept H-c24d6b2b by agent (CLAUDECODE): The hold may be waived. Criterion C-12290cf5 is the scenario "Success and request shape" of the requirement "ApiClient". It specifies the requests createApiClient sends through an injected fake fetch (method, URL, headers, JSON body, signal); a browser test sees only what the landing page does, not ...
- Q-015 accept H-a427f9a7 by agent (CLAUDECODE): The hold may be waived. Criterion C-76b2dd3e is the scenario "Envelope, other failures and bad input" of the requirement "ApiClient". It specifies how createApiClient maps an error envelope, a non-envelope failure, a non-JSON 2xx, a rejecting fetch, an AbortError and invalid arguments, through an in...
- Q-016 accept H-dcbf4ab9 by agent (CLAUDECODE): The hold may be waived. Criterion C-0a8a6d93 is the scenario "Order and filtering" of the requirement "Feature registry". It registers four test features on a new registry and reads list() and nav() with and without a capability set; the built app has one feature and no capability input, so no brows...
- Q-017 accept H-a5fb16c6 by agent (CLAUDECODE): The hold may be waived. Criterion C-5e6db9ca is the scenario "Refusals" of the requirement "Feature registry". It feeds fifteen invalid, duplicate and reserved registrations and expects FeatureError codes; registrations happen at build time in code, not through the browser. It is proven by the Node ...
- Q-018 accept H-e9471b87 by agent (CLAUDECODE): The hold may be waived. Criterion C-5752eaaf is the scenario "Reserved roots match whole segments" of the requirement "Feature registry". It registers /apis, /healthz, /auth and /auth/other on a new registry; the built app registers none of them. I read the test: it registers the four and asserts li...
- Q-019 accept H-cf11d880 by agent (CLAUDECODE): The hold may be waived. Criterion C-34823202 is the scenario "The web reserved roots equal the engine's" of the requirement "Feature registry". It compares two source constants (web/src/app/features.ts and src/api/web-paths.ts), which no browser can observe. I read the test: it asserts the web list ...
- Q-020 accept H-e4c11a36 by agent (CLAUDECODE): The hold may be waived. Criterion C-abaa85a3 is the scenario "The view for each state" of the requirement "The landing page reports engine health". The writer timed out, and the scenario is the pure function healthView on six inputs. I read web/src/app/health.ts and the test: healthView gives button...
- Q-021 accept H-ea19cf93 by agent (CLAUDECODE): The hold may be waived. Criterion C-b5ce03f4 is the scenario "The part" of the requirement "The offline stack serves the built app and the journey passes". It calls discoverParts and the web part's start with a hand-made context and checks the order and WEB_DIST_PATH; those are internal APIs of the ...

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
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
| C-0daf92cd | web-shell › The shell is accessible and works for deep links › Deep link | pass | pass | the judge passed it and a discriminating test passes |
| C-b5ce03f4 | web-shell › The offline stack serves the built app and the journey passes › The part | pass | pass | the judge passed it and a discriminating test passes |
| C-3dda369f | web-shell › The offline stack serves the built app and the journey passes › The M0 journey | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, deterministic] a test is ignored as evidence (criterion C-1542e67b): test_m0_skeleton::test_landing_page_health_states[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-1542e67b): test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-60599e6f): test_m0_skeleton::test_shell_landmarks_and_skip_link[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-0daf92cd): test_m0_skeleton::test_deep_link_returns_the_app[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3dda369f): test_m0_skeleton::test_encoded_traversal_is_refused: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3dda369f): test_m0_skeleton::test_landing_page_reports_engine_health[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3dda369f): test_m0_skeleton::test_security_headers_on_every_response[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] a test is ignored as evidence (criterion C-3dda369f): test_m0_skeleton::test_unknown_api_path_is_json_404[chromium]: no proof that it discriminates (no red, audit or generated record)
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ba861867): No end-to-end test traces criterion C-ba861867 (web-shell › Every response carries the security headers › Success, error and not-found responses); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-61225ade): No end-to-end test traces criterion C-61225ade (web-shell › Every response carries the security headers › A handler cannot weaken them and a second call changes nothing); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-383b59d1): No end-to-end test traces criterion C-383b59d1 (web-shell › The engine serves the web build › Files, types and cache); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b2a74658): No end-to-end test traces criterion C-b2a74658 (web-shell › The engine serves the web build › Names, types and cache policy); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-62803105): No end-to-end test traces criterion C-62803105 (web-shell › The engine serves the web build › Unknown extension); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-133bb26a): No end-to-end test traces criterion C-133bb26a (web-shell › Deep links return the app › Client routes); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-ae2edc66): No end-to-end test traces criterion C-ae2edc66 (web-shell › Deep links return the app › Missing asset); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0548f9d4): No end-to-end test traces criterion C-0548f9d4 (web-shell › Static file requests stay inside the web build › Traversal forms over a socket); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1dc68043): No end-to-end test traces criterion C-1dc68043 (web-shell › Static file requests stay inside the web build › The classifier on raw strings); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-946ba56d): No end-to-end test traces criterion C-946ba56d (web-shell › Unknown API and root paths answer the JSON 404 › Unknown API paths); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-a91f316f): No end-to-end test traces criterion C-a91f316f (web-shell › Unknown API and root paths answer the JSON 404 › Non-GET on a client route, and routes added later win); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-31ad3638): No end-to-end test traces criterion C-31ad3638 (web-shell › A missing build is reported and does not stop the engine › Missing then built); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-56d1014e): No end-to-end test traces criterion C-56d1014e (web-shell › A missing build is reported and does not stop the engine › A directory that is not a web build); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-967db51d): No end-to-end test traces criterion C-967db51d (web-shell › A missing build is reported and does not stop the engine › Bad registration); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-8182ad8f): No end-to-end test traces criterion C-8182ad8f (web-shell › The composition root serves the web app › Configured directory); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1b33755d): No end-to-end test traces criterion C-1b33755d (web-shell › The composition root serves the web app › Unbuilt directory warns once); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2c3a693b): No end-to-end test traces criterion C-2c3a693b (web-shell › The composition root serves the web app › A bad directory stops the start); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-2b18a36e): No end-to-end test traces criterion C-2b18a36e (web-shell › The composition root serves the web app › Default directory); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-12290cf5): No end-to-end test traces criterion C-12290cf5 (web-shell › ApiClient › Success and request shape); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-76b2dd3e): No end-to-end test traces criterion C-76b2dd3e (web-shell › ApiClient › Envelope, other failures and bad input); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0a8a6d93): No end-to-end test traces criterion C-0a8a6d93 (web-shell › Feature registry › Order and filtering); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5e6db9ca): No end-to-end test traces criterion C-5e6db9ca (web-shell › Feature registry › Refusals); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-5752eaaf): No end-to-end test traces criterion C-5752eaaf (web-shell › Feature registry › Reserved roots match whole segments); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-34823202): No end-to-end test traces criterion C-34823202 (web-shell › Feature registry › The web reserved roots equal the engine's); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-87996887): No end-to-end test traces criterion C-87996887 (web-shell › The landing page reports engine health › Health states in the logic); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-abaa85a3): No end-to-end test traces criterion C-abaa85a3 (web-shell › The landing page reports engine health › The view for each state); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-1542e67b): The end-to-end test test_m0_skeleton::test_landing_page_health_states[chromium], test_m0_skeleton::test_landing_page_shows_name_and_engine_health[chromium] traces criterion C-1542e67b (web-shell › The landing page reports engine health › Loading, healthy and unavailable in the browser), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-60599e6f): The end-to-end test test_m0_skeleton::test_shell_landmarks_and_skip_link[chromium] traces criterion C-60599e6f (web-shell › The shell is accessible and works for deep links › Landmarks, keyboard and CSP), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-acc8eaf4): No end-to-end test traces criterion C-acc8eaf4 (web-shell › The shell is accessible and works for deep links › Route table and titles); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-0daf92cd): The end-to-end test test_m0_skeleton::test_deep_link_returns_the_app[chromium] traces criterion C-0daf92cd (web-shell › The shell is accessible and works for deep links › Deep link), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-b5ce03f4): No end-to-end test traces criterion C-b5ce03f4 (web-shell › The offline stack serves the built app and the journey passes › The part); step 5 generates one.
- [minor, deterministic] UI criterion without an end-to-end test (criterion C-3dda369f): The end-to-end test test_m0_skeleton::test_encoded_traversal_is_refused, test_m0_skeleton::test_landing_page_reports_engine_health[chromium], test_m0_skeleton::test_security_headers_on_every_response[chromium] (+1 more) traces criterion C-3dda369f (web-shell › The offline stack serves the built app and the journey passes › The M0 journey), but it was never proved to fail without the change (no red, audit or generated record), so it is not evidence; step 5 generates one.
- [minor, judge] Protocol-relative baseUrl in createApiClient is not pinned down by the specification (spec gap) (criterion C-76b2dd3e): createApiClient rejects a path starting with '//' (such as '//evil.test/x') with RangeError, but for baseUrl it only checks that non-empty values start with '/'. A protocol-relative baseUrl such as '//evil.test' passes that check and produces '//evil.test/x'.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.security-headers.test.ts::C-61225ade a handler cannot weaken the CSP and a second registration changes nothing` (task 1.1): passed
- `src.api.security-headers.test.ts::C-ba861867 success error and not-found responses carry the exact security headers` (task 1.1): passed
- `src.api.web-paths.test.ts::C-1dc68043 classifyWebPath classifies the raw strings` (task 2.1): passed
- `src.api.web-paths.test.ts::C-b2a74658 cacheControlFor is immutable only for hashed assets` (task 2.1): passed
- `src.api.web-paths.test.ts::C-b2a74658 contentTypeFor maps the scenario names every extension and an unknown one` (task 2.1): passed
- `src.api.web-paths.test.ts::C-b2a74658 isAssetName accepts the listed asset extensions without regard to case` (task 2.1): passed
- `src.api.web.test.ts::C-0548f9d4 raw socket traversal forms answer 404 and never read the secret` (task 3.1): passed
- `src.api.web.test.ts::C-133bb26a client routes and a directory fall back to index.html` (task 3.1): passed
- `src.api.web.test.ts::C-2b18a36e DEFAULT_WEB_DIST is the repository's web/dist` (task 3.1): passed
- `src.api.web.test.ts::C-31ad3638 a missing build answers WEB_NOT_BUILT and is served once index.html appears` (task 3.1): passed
- `src.api.web.test.ts::C-383b59d1 static files carry their type and cache policy and HEAD has an empty body` (task 3.1): passed
- `src.api.web.test.ts::C-56d1014e a directory that is not a web build serves no file` (task 3.1): passed
- `src.api.web.test.ts::C-62803105 an unknown extension is served as octet-stream with nosniff` (task 3.1): passed
- `src.api.web.test.ts::C-946ba56d unknown API and root paths answer the exact JSON 404` (task 3.1): passed
- `src.api.web.test.ts::C-967db51d bad registration is refused and a second valid call is a duplicate` (task 3.2): passed
- `src.api.web.test.ts::C-a91f316f non-GET client routes answer 404 and a later specific route wins` (task 3.1): passed
- `src.api.web.test.ts::C-ae2edc66 a missing asset-like path answers the JSON 404` (task 3.1): passed
- `src.main.web.test.ts::C-1b33755d main warns once for an unbuilt directory and serves health` (task 4.1): passed
- `src.main.web.test.ts::C-2c3a693b main fails startup for an invalid web directory and closes the database once` (task 4.1): passed
- `src.main.web.test.ts::C-8182ad8f main serves a configured web build, health and the JSON 404` (task 4.1): passed
- `test.support.e2e-stack.web-part.test.ts::C-b5ce03f4 the web part is discovered after the database and hands the built web directory to the engine` (task 5.1): passed
- `web.src.api.client.test.ts::C-12290cf5 an ApiClient sends JSON requests to the same origin` (task 6.1): passed
- `web.src.api.client.test.ts::C-12290cf5 caller headers win and the abort signal is passed through` (task 6.1): passed
- `web.src.api.client.test.ts::C-12290cf5 put, patch and delete send their methods and JSON bodies` (task 6.1): passed
- `web.src.api.client.test.ts::C-76b2dd3e a 2xx with a non-JSON body becomes INVALID_RESPONSE` (task 6.1): passed
- `web.src.api.client.test.ts::C-76b2dd3e a non-envelope failure becomes HTTP_ERROR with the status` (task 6.1): passed
- `web.src.api.client.test.ts::C-76b2dd3e a rejecting fetch becomes NETWORK_ERROR` (task 6.1): passed
- `web.src.api.client.test.ts::C-76b2dd3e an AbortError is rethrown unchanged` (task 6.1): passed
- `web.src.api.client.test.ts::C-76b2dd3e an error envelope becomes an ApiRequestError with its details and request id` (task 6.1): passed
- `web.src.api.client.test.ts::C-76b2dd3e invalid requests throw RangeError before any fetch` (task 6.1): passed
- `web.src.app.features.test.ts::C-0a8a6d93 the default registry holds registered features and exposes them by list and nav` (task 6.2): passed
- `web.src.app.features.test.ts::C-0a8a6d93 the registry keeps registration order and filters the nav by capability` (task 6.2): passed
- `web.src.app.features.test.ts::C-5752eaaf reserved roots match whole segments only` (task 6.2): passed
- `web.src.app.features.test.ts::C-5e6db9ca the registry refuses duplicate reserved and invalid features` (task 6.2): passed
- `web.src.app.health.test.ts::C-87996887 loadEngineHealth classifies /health and engineHealthText names each state` (task 6.4): passed
- `web.src.app.health.test.ts::C-87996887 loadEngineHealth rethrows an AbortError unchanged and hands the signal to client.get` (task 6.4): passed
- `web.src.app.health.test.ts::C-abaa85a3 healthView holds the text, button and focus rule for each state` (task 6.4): passed
- `web.src.app.reserved-roots.test.ts::C-34823202 the web reserved roots equal the engine reserved roots` (task 6.2): passed
- `web.src.app.routes.test.ts::C-acc8eaf4 routeTable appends not-found and pageTitle names the pages` (task 6.3): passed
