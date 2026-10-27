# Questions — add-web-shell

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
| Q-001 | answered | none | verdict | Hold H-9e76d931: UI criterion C-ba861867 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-002 | answered | none | verdict | Hold H-b4253062: UI criterion C-61225ade has no end-to-end test (not_testable); see the generated UI tests table |
| Q-003 | answered | none | verdict | Hold H-19960e47: UI criterion C-383b59d1 has no end-to-end test (fails_at_head); see the generated UI tests table |
| Q-004 | answered | none | verdict | Hold H-c85bdd94: UI criterion C-b2a74658 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-005 | answered | none | verdict | Hold H-c2167f30: UI criterion C-62803105 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-006 | answered | none | verdict | Hold H-e0cb8f86: UI criterion C-1dc68043 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-007 | answered | none | verdict | Hold H-4f97b0f0: UI criterion C-946ba56d has no end-to-end test (fails_at_head); see the generated UI tests table |
| Q-008 | answered | none | verdict | Hold H-657e3f25: UI criterion C-a91f316f has no end-to-end test (not_testable); see the generated UI tests table |
| Q-009 | answered | none | verdict | Hold H-86a068a1: UI criterion C-31ad3638 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-010 | answered | none | verdict | Hold H-cae5cbd4: UI criterion C-56d1014e has no end-to-end test (not_testable); see the generated UI tests table |
| Q-011 | answered | none | verdict | Hold H-198b895a: UI criterion C-967db51d has no end-to-end test (not_testable); see the generated UI tests table |
| Q-012 | answered | none | verdict | Hold H-9bf1501b: UI criterion C-1b33755d has no end-to-end test (not_testable); see the generated UI tests table |
| Q-013 | open | none | verdict | Hold H-c1376ce6: UI criterion C-2c3a693b has no end-to-end test (not_testable); see the generated UI tests table |
| Q-014 | open | none | verdict | Hold H-c24d6b2b: UI criterion C-12290cf5 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-015 | open | none | verdict | Hold H-a427f9a7: UI criterion C-76b2dd3e has no end-to-end test (not_testable); see the generated UI tests table |
| Q-016 | open | none | verdict | Hold H-dcbf4ab9: UI criterion C-0a8a6d93 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-a5fb16c6: UI criterion C-5e6db9ca has no end-to-end test (not_testable); see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-e9471b87: UI criterion C-5752eaaf has no end-to-end test (not_testable); see the generated UI tests table |
| Q-019 | open | none | verdict | Hold H-cf11d880: UI criterion C-34823202 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-020 | open | none | verdict | Hold H-e4c11a36: UI criterion C-abaa85a3 has no end-to-end test (writer_failed); see the generated UI tests table |
| Q-021 | open | none | verdict | Hold H-ea19cf93: UI criterion C-b5ce03f4 has no end-to-end test (not_testable); see the generated UI tests table |
<!-- l4:index:end -->

---

## Q-001: Hold H-9e76d931: UI criterion C-ba861867 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-ba861867 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-ba861867 is the scenario "Success, error and not-found responses" of the requirement "Every response carries the security headers". The specification writes that scenario against a buildServer instance on which the test itself registers a route that throws, a route that throws ApiError(401, "AUTH_REQUIRED", "x") and a POST with an invalid JSON body. Those routes do not exist in the served e2e stack, so no Playwright journey can exercise the scenario, and the design's test plan assigns engine behaviour to Node tests with server.inject while the browser journey proves the .tsx files. The scenario is implemented exactly by the Node test in src/api/security-headers.test.ts, which registers the three routes and asserts the four exact header values and the absence of unsafe-inline and unsafe-eval on all five responses. The end-to-end outcome the requirement is about is also proven over the served stack: e2e/test_m0_skeleton.py asserts the four exact headers on GET / and GET /health through the browser, as the M0 journey scenario demands. A missing generated UI test therefore leaves no behaviour of this criterion unproved.
---

## Q-002: Hold H-b4253062: UI criterion C-61225ade has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-61225ade has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-61225ade is the scenario "A handler cannot weaken them and a second call changes nothing" of the requirement "Every response carries the security headers". The specification writes it against a buildServer instance on which the test registers a route that sets content-security-policy to * and calls registerSecurityHeaders twice, and it also reads the exported SECURITY_HEADERS constant. A browser journey against the served e2e stack can register no route and reach no in-process constant, so the scenario cannot be an end-to-end test, and the design's test plan assigns engine behaviour to Node tests with server.inject while the journey proves the .tsx files. The Node test in src/api/security-headers.test.ts implements the scenario exactly: it installs the hook twice, registers the spoofing route, asserts the response carries the exact policy as one string value, and asserts SECURITY_HEADERS x-frame-options is DENY. The implementation guards the second call with a WeakSet and replaces the handler's header in a root onSend hook. The end-to-end outcome of the requirement is also proven over the served stack by e2e/test_m0_skeleton.py, which asserts the four exact headers on GET / and GET /health. A missing generated UI test leaves no behaviour of this criterion unproved.
---

## Q-003: Hold H-19960e47: UI criterion C-383b59d1 has no end-to-end test (fails_at_head); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-383b59d1 has no end-to-end test (fails_at_head); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-383b59d1 is the scenario "Files, types and cache" of the requirement "The engine serves the web build". The specification writes it against a test-made distDir that holds index.html, assets/index-Ab3dEf9Z.js and favicon.svg, and asks for the exact content types and cache-control values of those three files plus a HEAD answer on the script. The served e2e stack cannot reproduce that fixture: the real web build has no favicon.svg (there is no web/public directory and web/index.html references only the module script) and its asset hash is whatever Vite produces, so no browser journey can request the files the scenario names. The design's test plan assigns engine behaviour to Node tests that build a temp dist and use server.inject, while the browser journey proves the .tsx files. The Node test in src/api/web.test.ts implements the scenario exactly and passed in the latest test report: it creates the three files, asserts text/html with no-store, text/javascript with the immutable policy, image/svg+xml with no-cache, and a HEAD answer with status 200, the same two headers and an empty body. The real build is also proven in the browser: the M0 journey loads the page under the strict CSP and nosniff and sees "Engine healthy" rendered, which requires the hashed module script to be served with a JavaScript type, and the hashed-asset rule matches Vite's eight-character hash as design decision 8 records. A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-004: Hold H-c85bdd94: UI criterion C-b2a74658 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b2a74658 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-b2a74658 is the scenario "Names, types and cache policy" of the requirement "The engine serves the web build". The specification writes it as direct calls of the pure helpers isAssetName, contentTypeFor and cacheControlFor on synthetic names such as a.cd, LOGO.PNG and assets/index-Ab3dEf9Z1.js, none of which exist in the served web build and none of which a browser can call, so no end-to-end test can exercise the scenario. The design's test plan assigns engine logic to Node tests beside the code and reserves the browser journey for the .tsx files. The Node test in src/api/web-paths.test.ts implements the scenario exactly: it asserts the eight isAssetName results, the seven contentTypeFor results and the nine cacheControlFor results the specification lists, and all three tests passed in the latest test report. The observable outcome these helpers serve is also proven over the served stack: the M0 journey loads the built page under the strict content security policy and sees "Engine healthy" rendered, which requires the hashed module script to be classified, typed and served correctly. A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-005: Hold H-c2167f30: UI criterion C-62803105 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-62803105 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-62803105 is the scenario "Unknown extension" of the requirement "The engine serves the web build". The specification writes it against a test-made distDir that holds data.bin and asks that a GET of that file answers the type application/octet-stream with x-content-type-options nosniff. The served e2e stack cannot reproduce that fixture: the real web build is produced by Vite from web/index.html, which references only the module script, there is no web/public directory, and the journey cannot place a file into the engine's distDir, so no browser test can request a file with an unknown extension. The design's test plan assigns engine behaviour to Node tests that build a temp dist and use server.inject, and reserves the browser journey for the .tsx files. The Node test in src/api/web.test.ts implements the scenario exactly and passed in the latest test report: it writes index.html and data.bin into a temp dist, requests /data.bin and asserts status 200, content-type application/octet-stream, x-content-type-options nosniff and the file's bytes. The implementation in src/api/web-paths.ts returns application/octet-stream for a missing or unknown extension, and the nosniff header comes from the security headers hook, which e2e/test_m0_skeleton.py proves over the served stack on GET / and GET /health. A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-006: Hold H-e0cb8f86: UI criterion C-1dc68043 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-1dc68043 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-1dc68043 is the scenario "The classifier on raw strings" of the requirement "Static file requests stay inside the web build". The specification writes it as direct calls of the pure function classifyWebPath on thirteen raw strings such as /a/../b, /%zz, /x%2fy and /%61pi/x and asks for the exact WebTarget kinds and segments it returns. A browser journey against the served e2e stack cannot call an in-process TypeScript function and cannot observe a returned discriminated union, so no end-to-end test can exercise the scenario; the design's test plan assigns engine logic to Node tests beside the code and reserves the browser journey for the .tsx files. The Node test in src/api/web-paths.test.ts implements the scenario exactly: it asserts with deepEqual all thirteen results the specification lists, spa, file ["flows"], refused three times, reserved four times, file ["auth","other"], reserved, refused and file ["assets","a.js"], and it passed in the latest test report. The implementation in src/api/web-paths.ts decodes each segment once, refuses a decode failure, dot segments, slashes, backslashes and control characters, matches lower-cased reserved roots and refuses a leading dot. The observable outcome the classifier serves is also proven over the served stack: e2e/test_m0_skeleton.py sends the raw encoded traversal path /%2e%2e%2f%2e%2e%2fetc/passwd and asserts a 404 JSON NOT_FOUND, and requests /api/v1/does-not-exist and asserts a 404 JSON NOT_FOUND rather than HTML. A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-007: Hold H-4f97b0f0: UI criterion C-946ba56d has no end-to-end test (fails_at_head); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-946ba56d has no end-to-end test (fails_at_head); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-946ba56d is the scenario "Unknown API paths" of the requirement "Unknown API and root paths answer the JSON 404", which asks that GET /api/v1/does-not-exist, GET /API/v1/x, GET /api, GET /health/extra and POST /api/v1/x all answer 404 with a JSON content type and the exact body { "error": { "code": "NOT_FOUND", "message": "Route not found" } }. The generated end-to-end test failed at the head because it was written against the wrong body: it expected the message "Not found", while the specification, the engine's not-found handler in src/api/server.ts and the wildcard route in src/api/web.ts all use "Route not found". Its failure therefore shows a defect of the generated test, not of the code. The scenario is implemented exactly by the Node test in src/api/web.test.ts, which registers the web app on a valid distDir, sends the five requests and asserts 404, an application/json content type and deep equality with the exact envelope for each, and that test passed in the latest test report. The served stack is also proven in the browser: e2e/test_m0_skeleton.py requests /api/v1/does-not-exist through the real engine and asserts a 404 JSON answer with error.code NOT_FOUND, and that journey test passed. The design's test plan assigns engine behaviour to Node tests with server.inject and reserves the browser journey for the .tsx files. A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-008: Hold H-657e3f25: UI criterion C-a91f316f has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-a91f316f has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-a91f316f is the scenario "Non-GET on a client route, and routes added later win" of the requirement "Unknown API and root paths answer the JSON 404". The specification writes it against a buildServer instance on which the test itself sends POST /flows, PUT /flows and DELETE / and then registers a route GET /api/v1/ping after registerWebApp and requests it. A browser journey against the served e2e stack can register no route on the running engine, so the second half of the scenario cannot be an end-to-end test, and the design's test plan assigns engine behaviour to Node tests with server.inject while the browser journey proves the .tsx files. The Node test in src/api/web.test.ts implements the scenario exactly: it serves a valid distDir, sends the three non-GET requests and asserts 404 with the exact NOT_FOUND envelope for each, then registers the ping route and asserts its own 200 body, and that test passed in the latest test report. The non-GET half rests on design decision 2, one wildcard GET route so any other method reaches the engine's not-found handler, which src/api/server.ts implements with the exact Route not found body, and the JSON 404 of the served stack is also proven in the browser by e2e/test_m0_skeleton.py on GET /api/v1/does-not-exist. A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-009: Hold H-86a068a1: UI criterion C-31ad3638 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-31ad3638 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-31ad3638 is the scenario "Missing then built" of the requirement "A missing build is reported and does not stop the engine". The specification writes it against an engine whose distDir does not exist, then is created empty, then receives index.html, and it also reads the return value of the in-process helper isWebBuilt for each of the three states. A browser journey against the served e2e stack cannot remove or create files in the engine's web build directory and cannot call an in-process TypeScript function, so no end-to-end test can exercise the scenario; the design's test plan assigns engine behaviour to Node tests that build a temp dist and use server.inject, and reserves the browser journey for the .tsx files. The Node test in src/api/web.test.ts implements the scenario exactly and passed in the latest test report: with a missing distDir it asserts GET / answers 503 with error.code WEB_NOT_BUILT, the exact details.hint, the four security headers and no directory path in the body, asserts GET /health answers 200, asserts isWebBuilt is false for the missing directory, false for an empty one and true once index.html is written, and asserts the next GET / answers 200 with the file's bytes. The implementation in src/api/web.ts checks the disk on every request through isWebBuilt, which never throws and requires a readable index.html under the real path of distDir, and throws the 503 WEB_NOT_BUILT ApiError with the hint when the check fails. The built half of the outcome is also proven over the served stack: e2e/test_m0_skeleton.py opens / through the real engine, asserts status 200 and sees the heading "Ursitoare" and "Engine healthy". A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-010: Hold H-cae5cbd4: UI criterion C-56d1014e has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-56d1014e has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-56d1014e is the scenario "A directory that is not a web build" of the requirement "A missing build is reported and does not stop the engine". The specification writes it against an engine whose distDir holds only secret.txt and asks that GET /secret.txt and GET /flows both answer 503 WEB_NOT_BUILT with no body containing the text of secret.txt. A browser journey against the served e2e stack cannot replace the engine's web build directory with one that holds only a secret file, so no end-to-end test can exercise the scenario; the design's test plan assigns engine behaviour to Node tests that build a temp dist and use server.inject, and reserves the browser journey for the .tsx files. The Node test in src/api/web.test.ts implements the scenario exactly: it makes a dist directory holding only secret.txt, serves it with buildServer, sends GET /secret.txt and GET /flows and asserts for each a 503 status, error.code WEB_NOT_BUILT and that the body does not include the secret text. The implementation in src/api/web.ts checks isWebBuilt on every file and SPA request before any file is resolved, and isWebBuilt returns false unless index.html under the real path of distDir is a readable regular file, so a directory without a build publishes nothing. The built half of the requirement is also proven over the served stack: e2e/test_m0_skeleton.py opens / through the real engine, asserts status 200 and sees the heading "Ursitoare" and "Engine healthy". A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-011: Hold H-198b895a: UI criterion C-967db51d has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-967db51d has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-967db51d is the scenario "Bad registration" of the requirement "A missing build is reported and does not stop the engine". The specification writes it as direct calls of the in-process function registerWebApp with distDir "" and "a\u0000b", and then a valid directory twice on one instance, and asks that the first two throw WebAppError WEB_DIST_INVALID and the second valid call throws WEB_APP_DUPLICATE. A browser journey against the served e2e stack cannot call a TypeScript registration function on the running engine's Fastify instance and cannot observe a thrown error, so no end-to-end test can exercise the scenario; the design's test plan assigns engine behaviour to Node tests beside the code with buildServer and reserves the browser journey for the .tsx files. The Node test in src/api/web.test.ts implements the scenario exactly: it calls registerWebApp with the two invalid values and asserts each throws a WebAppError with code WEB_DIST_INVALID, then registers a valid temp dist once without a throw and asserts the second call throws a WebAppError with code WEB_APP_DUPLICATE, and that test passed in the latest test report. The implementation in src/api/web.ts refuses an empty or NUL-containing distDir with WEB_DIST_INVALID and guards a second registration on one instance with a WeakSet that throws WEB_APP_DUPLICATE. The engine-level consequence of a bad directory is covered by the separate main scenario "A bad directory stops the start". A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-012: Hold H-9bf1501b: UI criterion C-1b33755d has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-1b33755d has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
accept The hold may be waived. Criterion C-1b33755d is the scenario "Unbuilt directory warns once" of the requirement "The composition root serves the web app". The specification writes it against main run in process with an injected loadConfig whose webDist is an empty temp directory and a captured log destination, and asks that exactly one captured log line has code WEB_NOT_BUILT with the exact message and no path, that GET / answers 503 WEB_NOT_BUILT, that GET /health answers 200, and that a second run with a built directory logs no such line. A browser journey against the served e2e stack cannot start the engine with a chosen web directory, cannot read the engine's log output and cannot start a second engine, so no end-to-end test can exercise the scenario; the design's test plan assigns engine behaviour to Node tests beside the code and reserves the browser journey for the .tsx files. The Node test in src/main.web.test.ts implements the scenario exactly and passed in the latest test report: it runs main with an empty temp webDist and a capturing destination, asserts exactly one WEB_NOT_BUILT line with the message web app is not built; run pnpm run build or set URSITOARE_WEB_DIST, asserts no log line holds the directory path, asserts GET / answers 503 with error.code WEB_NOT_BUILT and GET /health answers 200 with status ok, then runs main again with a built directory and asserts GET / answers 200 with the file and no WEB_NOT_BUILT line was logged. The implementation in src/main.ts calls isWebBuilt once after registerWebApp and logs one warn line with code WEB_NOT_BUILT and that exact message, without the path. The built half of the requirement is also proven over the served stack by e2e/test_m0_skeleton.py, which opens / through the real engine, asserts status 200 and sees the heading Ursitoare and Engine healthy. A missing generated end-to-end test therefore leaves no behaviour of this criterion unproved.
---

## Q-013: Hold H-c1376ce6: UI criterion C-2c3a693b has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.66 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-2c3a693b has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-014: Hold H-c24d6b2b: UI criterion C-12290cf5 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.66 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-12290cf5 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-015: Hold H-a427f9a7: UI criterion C-76b2dd3e has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.66 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-76b2dd3e has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-dcbf4ab9: UI criterion C-0a8a6d93 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Escalated by:** the delegate: the delegate's cost cap of the unit is used ($12.66 of $15.00)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-0a8a6d93 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-017: Hold H-a5fb16c6: UI criterion C-5e6db9ca has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-5e6db9ca has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-018: Hold H-e9471b87: UI criterion C-5752eaaf has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-5752eaaf has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-019: Hold H-cf11d880: UI criterion C-34823202 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-34823202 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-020: Hold H-e4c11a36: UI criterion C-abaa85a3 has no end-to-end test (writer_failed); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-abaa85a3 has no end-to-end test (writer_failed); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-021: Hold H-ea19cf93: UI criterion C-b5ce03f4 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
After round 1 the verifier cannot decide on its own: UI criterion C-b5ce03f4 has no end-to-end test (not_testable); see the generated UI tests table

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
