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
| Q-003 | open | none | verdict | Hold H-19960e47: UI criterion C-383b59d1 has no end-to-end test (fails_at_head); see the generated UI tests table |
| Q-004 | open | none | verdict | Hold H-c85bdd94: UI criterion C-b2a74658 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-005 | open | none | verdict | Hold H-c2167f30: UI criterion C-62803105 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-006 | open | none | verdict | Hold H-e0cb8f86: UI criterion C-1dc68043 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-007 | open | none | verdict | Hold H-4f97b0f0: UI criterion C-946ba56d has no end-to-end test (fails_at_head); see the generated UI tests table |
| Q-008 | open | none | verdict | Hold H-657e3f25: UI criterion C-a91f316f has no end-to-end test (not_testable); see the generated UI tests table |
| Q-009 | open | none | verdict | Hold H-86a068a1: UI criterion C-31ad3638 has no end-to-end test (not_testable); see the generated UI tests table |
| Q-010 | open | none | verdict | Hold H-cae5cbd4: UI criterion C-56d1014e has no end-to-end test (not_testable); see the generated UI tests table |
| Q-011 | open | none | verdict | Hold H-198b895a: UI criterion C-967db51d has no end-to-end test (not_testable); see the generated UI tests table |
| Q-012 | open | none | verdict | Hold H-9bf1501b: UI criterion C-1b33755d has no end-to-end test (not_testable); see the generated UI tests table |
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

- **Status:** open
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
---

## Q-004: Hold H-c85bdd94: UI criterion C-b2a74658 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
---

## Q-005: Hold H-c2167f30: UI criterion C-62803105 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
---

## Q-006: Hold H-e0cb8f86: UI criterion C-1dc68043 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
---

## Q-007: Hold H-4f97b0f0: UI criterion C-946ba56d has no end-to-end test (fails_at_head); see the generated UI tests table

- **Status:** open
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
---

## Q-008: Hold H-657e3f25: UI criterion C-a91f316f has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
---

## Q-009: Hold H-86a068a1: UI criterion C-31ad3638 has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
---

## Q-010: Hold H-cae5cbd4: UI criterion C-56d1014e has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
---

## Q-011: Hold H-198b895a: UI criterion C-967db51d has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
---

## Q-012: Hold H-9bf1501b: UI criterion C-1b33755d has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
---

## Q-013: Hold H-c1376ce6: UI criterion C-2c3a693b has no end-to-end test (not_testable); see the generated UI tests table

- **Status:** open
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
