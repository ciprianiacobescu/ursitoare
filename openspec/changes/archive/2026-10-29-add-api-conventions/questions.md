# Questions — add-api-conventions

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
| Q-001 | accepted | 3.3 | technical | src/api/idempotency.test.ts:162 — the release-refusing wrapper calls the real client's query method unbound |
| Q-002 | accepted | 3.3 | technical | src/api/idempotency.test.ts:254 — a JavaScript counter cannot be undone by rolling back the transaction |
| Q-003 | accepted | 3.3 | technical | src/api/idempotency.test.ts:219 — response_body::text of a jsonb column cannot yield the compact JSON.stringify text |
| Q-004 | accepted | 3.4 | technical | src/api/idempotent-response.test.ts:215 |
<!-- l4:index:end -->

---

## Q-001: src/api/idempotency.test.ts:162 — the release-refusing wrapper calls the real client's query method unbound

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: names the frozen path src/api/idempotency.test.ts of task 3.3; only the clarifier suggestion may unfreeze it
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-10-29T14:03Z by glm, run r-20261029T1219Z-7db8, task 3.3

### Context
clientThatRejectsRelease forwards non-DELETE queries as `raw(...args)` (line 162), but pg 8.23's Client#query builds its result promise from `this._Promise` (node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/client.js:689), so the unbound call throws 'TypeError: Cannot read properties of undefined (reading _Promise)' for every forwarded query, including BEGIN. The wrapped withIdempotency call therefore rejects with that TypeError before fn runs (observed as the 'actual' of the assert.rejects failure at line 509), so boom2 can never surface and the key can never stay in_progress — with the wrapper as written the assertion is unreachable for any psql-based implementation.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/idempotency.test.ts`, write an answer that names its path exactly as written here or run `l4 questions accept Q-NNN --unit add-api-conventions`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/api/idempotency.test.ts: change line 162 from `return raw(...args);` to `return client.query(...args);` so forwarded queries run bound to the real client
2. Edit src/api/idempotency.test.ts: change line 162 from `return raw(...args);` to `return raw.apply(client, args);`

### Clarifier suggestion
Edit `src/api/idempotency.test.ts`: change line 162 from `return raw(...args);` to `return client.query(...args);` so forwarded queries run bound to the real client

### Answer
<!-- write below this line -->
---

## Q-002: src/api/idempotency.test.ts:254 — a JavaScript counter cannot be undone by rolling back the transaction

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: names the frozen path src/api/idempotency.test.ts of task 3.3; only the clarifier suggestion may unfreeze it
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-10-29T14:03Z by glm, run r-20261029T1219Z-7db8, task 3.3

### Context
failingFn inserts into ursitoare.idem_probe, then increments the in-memory counter probeCount.n (line 238) and returns a BigInt body that makes JSON.stringify throw the expected TypeError. The rollback undoes only the database write, so after the first call probeCount.n is 1 for any implementation in which fn runs — and fn must run for its result to generate the TypeError — yet line 254 asserts probeCount.n === 0 ('the rolled back probe write is undone'). The criterion C-ea12d606 does not mention this counter; the DB-level assertions at lines 248–253 already cover the rollback.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/idempotency.test.ts`, write an answer that names its path exactly as written here or run `l4 questions accept Q-NNN --unit add-api-conventions`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/api/idempotency.test.ts: delete the assertion at line 254 (the probe and key-count assertions at lines 248–253 already assert the rollback)
2. Edit src/api/idempotency.test.ts: change line 254 to `assert.equal(probeCount.n, 1, "fn ran once before the write rolled back");`

### Clarifier suggestion
Edit `src/api/idempotency.test.ts`: delete the assertion at line 254 (the probe and key-count assertions at lines 248–253 already assert the rollback)

### Answer
<!-- write below this line -->
---

## Q-003: src/api/idempotency.test.ts:219 — response_body::text of a jsonb column cannot yield the compact JSON.stringify text

- **Status:** accepted
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): the reply was discarded: names the frozen path src/api/idempotency.test.ts of task 3.3; only the clarifier suggestion may unfreeze it
- **Blocking tasks:** 3.3
- **Kind:** technical
- **Asked:** 2026-10-29T14:03Z by glm, run r-20261029T1219Z-7db8, task 3.3

### Context
The migration (0140_idempotency.sql, per design.md Data model) stores the body in `response_body jsonb` and the task requires `response_body = $6::jsonb`, but the frozen SELECTs compare `response_body::text` against the compact '{"id":"f_1"}' / '{"id":"f_2"}' (lines 219, 274 and 576). On this Postgres 18.4 cluster a jsonb object's ::text form is '{"id": "f_1"}' with a space after the colon (verified with a direct query), so any design-conforming implementation stores exactly the text the test stringified and still reads it back spaced.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/idempotency.test.ts`, write an answer that names its path exactly as written here or run `l4 questions accept Q-NNN --unit add-api-conventions`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/api/idempotency.test.ts: change the expected body strings at lines 219, 274 and 576 from '{"id":"f_1"}' / '{"id":"f_2"}' to the jsonb text form '{"id": "f_1"}' / '{"id": "f_2"}'
2. Edit src/api/idempotency.test.ts: read and compare the parsed value (SELECT response_body without ::text and expect { id: "f_1" } / { id: "f_2" }) instead of comparing text

### Clarifier suggestion
Edit `src/api/idempotency.test.ts`: change the expected body strings at lines 219, 274 and 576 from '{"id":"f_1"}' / '{"id":"f_2"}' to the jsonb text form '{"id": "f_1"}' / '{"id": "f_2"}'

### Answer
<!-- write below this line -->

---

## Q-004: src/api/idempotent-response.test.ts:215

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.4
- **Kind:** technical
- **Asked:** 2026-10-29T14:58Z by glm, run r-20261029T1412Z-bf29, task 3.4

### Context
The frozen red test asserts that the 400 body for a key 'has space' on the respondIdempotent route has details.fields deepEqual [{ field: "headers/idempotency-key" }]. Design decision 5 fixes the key refusal as fields [{ field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" }] - the shape idempotencyKeyOf throws (asserted by the frozen src/api/idempotency-key.test.ts:62) and withIdempotency throws before any query (asserted by the frozen src/api/idempotency.test.ts:360) - and decision 6 sends a request carrying a key through withIdempotency. deepEqual in node:assert/strict is exact, so the message-bearing entry the design pins makes the assertion fail; honouring the test as written would need a second, message-less refusal thrown only on this route path, diverging from the design's single refusal shape.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/idempotency-key.test.ts`, `src/api/idempotency.test.ts`, `src/api/idempotent-response.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-api-conventions`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/api/idempotent-response.test.ts: change line 215 from assert.deepEqual(invalid.fields, [{ field: "headers/idempotency-key" }], "the refusal names the header field"); to assert.deepEqual(invalid.fields, [{ field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" }], "the refusal names the header field");
2. Edit src/api/idempotent-response.test.ts: change line 215 to assert.ok((invalid.fields ?? []).some((issue) => issue.field === "headers/idempotency-key"), "the refusal names the header field"); so the assertion only checks that the field is named

### Clarifier suggestion
Edit `src/api/idempotent-response.test.ts`: change line 215 from assert.deepEqual(invalid.fields, [{ field: "headers/idempotency-key" }], "the refusal names the header field"); to assert.deepEqual(invalid.fields, [{ field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" }], "the refusal names the header field");

### Answer
<!-- write below this line -->
