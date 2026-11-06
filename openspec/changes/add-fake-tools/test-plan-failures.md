# Failure rows for add-fake-tools

The catalogue rows (L1 to L3) and the abort row (K6) of scenarios in `spec.md`; the other rows are in `test-plan.md`, whose constants and conventions apply (tests send with `node:http` unless a row says `fetch`, and close every fake in `finally`).

## Catalogue rows (scenario "A catalogue that cannot be read rejects the start and opens no listener")

`T` is `process.getActiveResourcesInfo().filter((r) => r === "TCPServerWrap").length`, read immediately before the call and immediately after it settles, with no wait (ran: a closed `http.Server` still counts right after `close()`, not 20 ms later). `dir` is a `mkdtemp` directory under `os.tmpdir()`, removed in `finally`; `bad.json` holds `{`; `missing.json` is never written. The errors ran on the repo's `readCatalogueDocument` (Node 24.22.2); the class is `CatalogueDataError` of `test/support/catalogue/errors.ts` and has no `details`.

| # | call | result |
|---|---|---|
| L1 | `startFakeTools({ catalogue: dir/bad.json })` | rejects, `code` `CATALOGUE_INVALID`, `message` starts `invalid JSON: ` (ran: `invalid JSON: Expected property name or '}' in JSON at position 1 (line 1 column 2)`; V8's wording is not asserted); `T` equal before and after |
| L2 | `startFakeTools({ catalogue: dir/missing.json })` | rejects, `code` `CATALOGUE_READ`, `message` `cannot read <p>: ENOENT: no such file or directory, open '<p>'` with `<p>` the path given; `T` equal before and after |
| L3 | `startFakeTools({ catalogue: TEST_CATALOGUE_PATH })` | resolves; `T` after is `T` before plus 1 (the control: the count sees a listening fake); closed in `finally` |

## Abort row (scenario "A client that aborts during a delay leaves its record and the next call is answered")

K6: `setDelay("docs.fetch@1", 1000)`; `fetch` posts `{"url":"u"}` to `<origin>/blocks/docs.fetch@1` with `AbortSignal.timeout(50)` and rejects with a `DOMException` named `TimeoutError` (`node:http` would give `AbortError`, code `ABORT_ERR`; ran: 52 ms). `calls()` (polled at 10 ms, bounded at 5000 ms) holds one record: `seq` 1, `docs.fetch@1`, status 200, `duplicate` false, `input` `{"url":"u"}`, appended before the delay. Then `setDelay("docs.fetch@1", 0)` and the same post with no signal gives 200 `{"content":"Fetched document for u. Quarterly policy: payments above 10000 require two approvers.","content_type":"text/plain"}`; `calls()` has `seq` 1, 2. Unlike the pending call of scenario "Reset and close" (30 s delay, an abort that never fires, ended by `close()`), this client leaves at 50 ms and the fake stays open.
