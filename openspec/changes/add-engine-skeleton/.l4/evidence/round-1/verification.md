# Verification: openspec:add-engine-skeleton: FAIL (round 1)

traceability: not checked (an earlier step failed)

- Base: `f01a0413a890c257db1b4c9baad1155861ecb63e`
- Head: `d0191ceb6266eb6008b1fde7235e39e9b4d73c41`
- Implementer profiles: deepseek, glm, claude-sonnet
- Judge: gemini-judge, 0 call(s), prompt sha256 `-`

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | failed | 0.8 | base merged: main@f01a0413a8 as d0191ceb62 (1 commit); tasks not done |
| 1 | integrity | not_run | 0.0 | an earlier step failed |
| 2 | build | not_run | 0.0 | an earlier step failed |
| 3 | tests | not_run | 0.0 | an earlier step failed |
| 4 | traceability | not_run | 0.0 | an earlier step failed |
| 4a | audit sampling | not_run | 0.0 | an earlier step failed |
| 5 | ui test generation | not_run | 0.0 | an earlier step failed |
| 6 | quality | not_run | 0.0 | an earlier step failed |
| 8 | s1 judge | not_run | 0.0 | an earlier step failed |
| 9 | judge | not_run | 0.0 | an earlier step failed |
| 10 | aggregation | ok | 0.0 | FAIL |

## Criteria

None judged.

## Findings

- [blocker, deterministic] tasks not done: these tasks are not ticked: 1.1

## Fix unit

Fix unit 1 is created for these tasks:
- 1.1 e2e gate failed (F-22a9abae)

## New tests (red then green, `task.red_ok` in the ledger)

- `src.api.errors.test.ts::C-240590ab toErrorResponse maps body schema failures to field details` (task 4.1): not in the report
- `src.api.errors.test.ts::C-240590ab toErrorResponse reports query and path parameter fields` (task 4.1): not in the report
- `src.api.errors.test.ts::C-3284ea9e ApiError refuses a status outside 400 to 599 or a malformed code` (task 4.1): not in the report
- `src.api.errors.test.ts::C-3284ea9e toErrorResponse maps an ApiError with and without details` (task 4.1): not in the report
- `src.api.errors.test.ts::C-aea19ec5 toErrorResponse hides an unknown error behind INTERNAL` (task 4.1): not in the report
- `src.api.errors.test.ts::C-d145c766 toErrorResponse keeps another 4xx status as BAD_REQUEST` (task 4.1): not in the report
- `src.api.errors.test.ts::C-d145c766 toErrorResponse maps malformed JSON oversized and wrongly typed bodies` (task 4.1): not in the report
- `src.api.health.test.ts::C-14452135 an empty registry reports ok with no checks` (task 4.2): not in the report
- `src.api.health.test.ts::C-14452135 checks that resolve ok are reported by name` (task 4.2): not in the report
- `src.api.health.test.ts::C-609c36a3 a check that never settles times out after 10 ms` (task 4.2): not in the report
- `src.api.health.test.ts::C-609c36a3 a check that resolves fail marks the report failed` (task 4.2): not in the report
- `src.api.health.test.ts::C-609c36a3 a check that resolves junk fails as an invalid result` (task 4.2): not in the report
- `src.api.health.test.ts::C-609c36a3 a check that throws fails without leaking its message` (task 4.2): not in the report
- `src.api.health.test.ts::C-64e17386 a check registered after a run appears in the next run` (task 4.2): not in the report
- `src.api.health.test.ts::C-64e17386 duplicate and invalid names are refused` (task 4.2): not in the report
- `src.api.health.test.ts::C-64e17386 overlapping runs call every check once` (task 4.2): not in the report
- `src.api.server.test.ts::C-14452135 GET /health reports passing checks by name` (task 4.4): not in the report
- `src.api.server.test.ts::C-14452135 GET /health with no checks reports ok and healthPayload is unchanged` (task 4.4): not in the report
- `src.api.server.test.ts::C-240590ab buildServer reports the first body query or path schema fault` (task 4.3): not in the report
- `src.api.server.test.ts::C-2490a98e a path that carries a token logs the wildcard route only` (task 4.3): not in the report
- `src.api.server.test.ts::C-3284ea9e buildServer answers an ApiError with its own status code and details` (task 4.3): not in the report
- `src.api.server.test.ts::C-3c17bb81 a recording tracer holds one ended http.request span per request` (task 4.4): not in the report
- `src.api.server.test.ts::C-595eb185 a failing tracer logs a warning and the request still succeeds` (task 4.4): not in the report
- `src.api.server.test.ts::C-609c36a3 GET /health reports a failing check without leaking its content` (task 4.4): not in the report
- `src.api.server.test.ts::C-609c36a3 GET /health reports a hanging check as a timeout` (task 4.4): not in the report
- `src.api.server.test.ts::C-609c36a3 GET /health reports a junk check result as invalid` (task 4.4): not in the report
- `src.api.server.test.ts::C-609c36a3 GET /health reports a throwing check without its message` (task 4.4): not in the report
- `src.api.server.test.ts::C-64866f0f a 404 and a thrown error both carry the request id` (task 4.3): not in the report
- `src.api.server.test.ts::C-71327adc a well-formed x-request-id is kept and the route is logged without the query` (task 4.3): not in the report
- `src.api.server.test.ts::C-aea19ec5 unknown errors answer INTERNAL and never log hunter2` (task 4.3): not in the report
- `src.api.server.test.ts::C-c68d2bde missing malformed and oversized request ids are replaced` (task 4.3): not in the report
- `src.api.server.test.ts::C-ce3d89ea the health request log holds the route without the query token` (task 4.4): not in the report
- `src.api.server.test.ts::C-d145c766 buildServer keeps the fixed codes for malformed oversized and wrongly typed bodies` (task 4.3): not in the report
- `src.api.server.test.ts::buildServer hands an injectable server to the routes a test adds` (task 4.3): not in the report
- `src.api.shutdown.test.ts::C-341a5ed6 a SIGTERM then SIGINT closes once and exits zero` (task 4.5): not in the report
- `src.api.shutdown.test.ts::C-3d0f68d6 a direct shutdown is idempotent and resolves undefined after exit zero` (task 4.5): not in the report
- `src.api.shutdown.test.ts::C-3d0f68d6 dispose removes both signal listeners and never closes` (task 4.5): not in the report
- `src.api.shutdown.test.ts::C-78a31ae6 a failed close logs shutdown failed without the error text` (task 4.5): not in the report
- `src.api.shutdown.test.ts::C-78a31ae6 a missed drain deadline force closes and exits one` (task 4.5): not in the report
- `src.api.shutdown.test.ts::C-9abd6ccb requests during the drain still get the envelope and the slow request finishes` (task 4.5): not in the report
- `src.config.config.test.ts::C-16430cae a loaded config hides the engine key and database password from JSON String and inspect` (task 3.3): not in the report
- `src.config.config.test.ts::C-3d74e0ae a bad database URL is CONFIG_INVALID naming the URL variable without the password` (task 3.3): not in the report
- `src.config.config.test.ts::C-3d74e0ae a bad owner database URL names the owner URL variable` (task 3.3): not in the report
- `src.config.config.test.ts::C-3d74e0ae a database password file without its URL names the password-file variable` (task 3.3): not in the report
- `src.config.config.test.ts::C-3d74e0ae an empty database password file with a valid URL gives CONFIG_SECRET_EMPTY` (task 3.3): not in the report
- `src.config.config.test.ts::C-406ddaa1 loadConfig keeps a postgresql sslmode URL unchanged and leaves a missing password null` (task 3.3): not in the report
- `src.config.config.test.ts::C-406ddaa1 loadConfig parses app and owner database endpoints with secret passwords` (task 3.3): not in the report
- `src.config.config.test.ts::C-7a4aa4d4 loadConfig reads the engine key from its file and strips the trailing newline` (task 3.3): not in the report
- `src.config.config.test.ts::C-7b6bccec loadConfig returns every documented default for an empty environment` (task 3.2): not in the report
- `src.config.config.test.ts::C-95e9881e loadConfig derives publicBaseUrl from the port and ignores empty or unknown variables` (task 3.2): not in the report
