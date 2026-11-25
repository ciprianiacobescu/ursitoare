<!-- l4:lessons v1 — harness-owned; propose changes via .serena/memories/inbox/ -->

## L-09421538 · UI criteria need an end-to-end test
- **Scope:** `web/**`
- **Source:** verifier round 2
- **Dedupe key:** ui-criterion-without-e2e-test
- **Reinforced:** 6 · 2026-11-21
A criterion about what a user sees or does needs a browser test that traces it by id (`C-<hex>` in the test name). A unit test does not cover it. Put the browser test in the end-to-end directory (`e2e/`, not under `tests/`, whose gate has no server) and write it with the change, not after the verifier asks.

## L-c96adcf5 · Guard rule repeated: frozen test
- **Source:** 2 runs
- **Dedupe key:** guard-violation-frozen-test
- **Reinforced:** 2 · 2026-11-20
The guard rule `frozen test` was triggered in 2 separate runs. Do not touch the files it protects; the harness reverts the change and the run loses time.

## L-e6475845 · Human feedback: The OIDC route handlers are async and call reply...send()…
- **Scope:** `src/api/**`, `src/identity/oidc/**`
- **Source:** human feedback FB-001 (openspec:add-oidc-login-followup-1 round 1)
- **Dedupe key:** feedback-1f1650e10b0d
- **Reinforced:** 1 · 2026-11-25
The OIDC route handlers are async and call reply...send() without returning reply (login.ts:105 and :109, callback.ts:191 and :216, logout.ts:55, :64 and :93, routes.ts:35 for the not-configured 503). Fastify's wrap-thenable sees the handler resolve with undefined while the first send is still in its onSend hooks and calls send again. With two async onSend hooks (the x-request-id hook in server.ts and registerSecurityHeaders, as in the real app through registerWebApp) the second send throws ERR_HTTP_HEADERS_SENT, the error handler logs 'request failed' at error level, sets reply.code(500) on…

## L-e7230fe4 · Guard rule repeated: red scope
- **Source:** 2 runs
- **Dedupe key:** guard-violation-red-scope
- **Reinforced:** 1 · 2026-11-24
The guard rule `red scope` was triggered in 2 separate runs. Do not touch the files it protects; the harness reverts the change and the run loses time.
