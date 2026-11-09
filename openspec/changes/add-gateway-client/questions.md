# Questions — add-gateway-client

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
| Q-001 | accepted | 2.1 | technical | src/config/egress.test.ts line 193 asserts maxCalls ["/s/broker"] for the L6 /s/max case |
| Q-002 | open | 8.1 | technical | test/support/e2e-stack/egress-part.test.ts lines 147 and 227: URL check indexes the token-file key |
<!-- l4:index:end -->

---

## Q-001: src/config/egress.test.ts line 193 asserts maxCalls ["/s/broker"] for the L6 /s/max case

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-11-09T04:27Z by glm, run r-20261109T0343Z-db5e, task 2.1

### Context
The test sets URSITOARE_EGRESS_BROKER_TOKEN_FILE to "/s/max" (line 187) and asserts brokerToken.reveal() equals 4096 'a' characters (line 192), which is only possible if the reader read /s/max. It then asserts maxCalls deep-equals ["/s/broker"] (line 193), i.e. that /s/max was never read. The two assertions cannot both hold, so the red test can never pass; test-plan.md row L6 only says the 4096-character token loads and does not state an expected read list. My implementation records ["/s/max"] and produces the 4096-character token.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/config/egress.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-gateway-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/config/egress.test.ts: replace assert.deepEqual(maxCalls, ["/s/broker"]) with assert.deepEqual(maxCalls, ["/s/max"]) on line 193

### Clarifier suggestion
Edit `src/config/egress.test.ts`: replace assert.deepEqual(maxCalls, ["/s/broker"]) with assert.deepEqual(maxCalls, ["/s/max"]) on line 193

### Answer
<!-- write below this line -->

---

## Q-002: test/support/e2e-stack/egress-part.test.ts lines 147 and 227: URL check indexes the token-file key

- **Status:** open
- **Blocking tasks:** 8.1
- **Kind:** technical
- **Asked:** 2026-11-09T09:04Z by claude-sonnet, run r-20261109T0705Z-0de6, task 8.1

### Context
Both loops iterate `[EGRESS_KEYS[0], EGRESS_KEYS[1], EGRESS_KEYS[5]]` and assert each value matches the loopback URL regex. EGRESS_KEYS is alphabetically sorted, so [0] is URSITOARE_EGRESS_BROKER_TOKEN_FILE (a file path, mode 0600 per the spec), while the PROXY_URL at [2] is never checked. The spec requires only that the three URL variables be loopback URLs and the token variables be file paths.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `test/support/e2e-stack/egress-part.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-gateway-client`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `test/support/e2e-stack/egress-part.test.ts`: at lines 147 and 227 replace `[EGRESS_KEYS[0], EGRESS_KEYS[1], EGRESS_KEYS[5]]` with `[EGRESS_KEYS[1], EGRESS_KEYS[2], EGRESS_KEYS[5]]`

### Clarifier suggestion
Edit `test/support/e2e-stack/egress-part.test.ts`: at lines 147 and 227 replace `[EGRESS_KEYS[0], EGRESS_KEYS[1], EGRESS_KEYS[5]]` with `[EGRESS_KEYS[1], EGRESS_KEYS[2], EGRESS_KEYS[5]]`

### Answer
<!-- write below this line -->
