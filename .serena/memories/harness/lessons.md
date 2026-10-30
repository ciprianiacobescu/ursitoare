<!-- l4:lessons v1 — harness-owned; propose changes via .serena/memories/inbox/ -->

## L-09421538 · UI criteria need an end-to-end test
- **Scope:** `web/**`
- **Source:** verifier round 2
- **Dedupe key:** ui-criterion-without-e2e-test
- **Reinforced:** 3 · 2026-10-30
A criterion about what a user sees or does needs a browser test that traces it by id (`C-<hex>` in the test name). A unit test does not cover it. Put the browser test in the end-to-end directory (`e2e/`, not under `tests/`, whose gate has no server) and write it with the change, not after the verifier asks.

## L-c96adcf5 · Guard rule repeated: frozen test
- **Source:** 2 runs
- **Dedupe key:** guard-violation-frozen-test
- **Reinforced:** 1 · 2026-10-28
The guard rule `frozen test` was triggered in 2 separate runs. Do not touch the files it protects; the harness reverts the change and the run loses time.
