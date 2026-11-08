# Questions — add-fake-egress-proxy

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
| Q-001 | answered | 4.2 | harness | Task 4.2: the pre-satisfied check could not decide |
<!-- l4:index:end -->

---

## Q-001: Task 4.2: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 4.2
- **Kind:** harness
- **Asked:** 2026-11-08T22:25Z by claude-sonnet, run r-20261108T2150Z-9e5e, task 4.2
- **Criteria:** C-4347a436 (test-fake-egress › The proxy forwards with the stored credential injected › Streaming, redirects and upstream errors pass through), C-6f87d878 (test-fake-egress › The proxy forwards with the stored credential injected › The credential-less route is fake-only)

### Context
L4 could not run the pre-satisfied check of task 4.2, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and test/support/fake-egress/proxy-forward.test.ts is not a Python file; test.support.fake-egress.proxy-forward.test.ts::C-4347a436 redirects, errors and unrouted hosts pass through did not run in test-base-run
Runs: test-base-run
Kept real: nothing
Tests: test.support.fake-egress.proxy-forward.test.ts::C-4347a436 redirects, errors and unrouted hosts pass through, test.support.fake-egress.proxy-forward.test.ts::C-4347a436 the proxy streams the body before the upstream ends, test.support.fake-egress.proxy-forward.test.ts::C-6f87d878 bad credential-less registrations throw and register nothing, test.support.fake-egress.proxy-forward.test.ts::C-6f87d878 the credential-less route serves until a credential is stored

Source of the tests (redacted; at most 40 lines each):
test.support.fake-egress.proxy-forward.test.ts::C-4347a436 redirects, errors and unrouted hosts pass through:
    test("C-4347a436 redirects, errors and unrouted hosts pass through", async () => {
      const { fake, u } = await passSetup();
      try {
        const tok = await issue(fake, S1);
        const found = await fetch(`${fake.proxyUrl}/${S1}/found`, {
          headers: { authorization: `Bearer ${tok}` },
          redirect: "manual",
          signal: AbortSignal.timeout(5000),
        });
        assert.equal(found.status, 302);
        assert.equal(found.headers.get("location"), "https://elsewhere.example/x?y=1");
        assert.deepEqual(found.headers.getSetCookie(), ["a=1", "b=2"]);
        assert.equal(found.headers.get("x-up"), "1");
        await found.text();
    
        const boom = await viaFetch(fake, S1, "/boom");
        assert.deepEqual(boom, { status: 500, text: "boom" });
        const down = await viaFetch(fake, S4, "/x");
        assert.deepEqual(down, { status: 502, text: "bad gateway: upstream unreachable\n" });
        const nowhere = await viaFetch(fake, S5, "/x");
        assert.deepEqual(nowhere, { status: 502, text: "bad gateway: upstream unreachable\n" });
        const who = await viaFetch(fake, S6, "/who");
        assert.deepEqual(who, { status: 200, text: `127.0.0.1:${u.port}` });
    
        assert.deepEqual(u.log, ["/found", "/boom", "/who"]);
        assert.deepEqual(fake.requests().map(view), [
          { path: "/found", status: 302, outcome: "allowed", host: "tools.fake.test" },
          { path: "/boom", status: 500, outcome: "error", host: "tools.fake.test" },
          { path: "/x", status: 502, outcome: "error", host: "down.fake.test" },
          { path: "/x", status: 502, outcome: "error", host: "nowhere.fake.test" },
          { path: "/who", status: 200, outcome: "allowed", host: `127.0.0.1:${u.port}` },
        ]);
        const proxyEvents = fake
          .events()
          .filter((e) => e.event_type.startsWith("proxy."))
          .map((e) => [e.event_type, e.payload["upstream_status"]]);
        assert.deepEqual(proxyEvents, [
          ["proxy.hit", 302],
          ["proxy.error", 500],
          ["proxy.error", 502],
    [cut: 8 more lines]
test.support.fake-egress.proxy-forward.test.ts::C-4347a436 the proxy streams the body before the upstream ends:
    test("C-4347a436 the proxy streams the body before the upstream ends", async () => {
      const { fake, u } = await passSetup();
      try {
        const tok = await issue(fake, S1);
        const decoder = new TextDecoder();
        const out: { reader: ReadableStreamDefaultReader<Uint8Array> | null; first: string } = { reader: null, first: "" };
        await assert.doesNotReject(async () => {
          const res = await fetch(`${fake.proxyUrl}/${S1}/stream`, {
            headers: { authorization: `Bearer ${tok}` },
            signal: AbortSignal.timeout(5000),
          });
          assert.ok(res.body !== null, "a body streams back");
          out.reader = res.body.getReader();
          out.first = decoder.decode((await out.reader.read()).value);
        });
        assert.equal(out.first, "first\n");
        assert.deepEqual(fake.requests(), []);
        u.open();
        const reader = out.reader;
        assert.ok(reader !== null, "reader open");
        let rest = "";
        let r = await reader.read();
        while (!r.done) {
          rest += decoder.decode(r.value);
          r = await reader.read();
        }
        assert.equal(rest, "second\n");
        assert.deepEqual(fake.requests().map(view), [
          { path: "/stream", status: 200, outcome: "allowed", host: "tools.fake.test" },
        ]);
        assert.deepEqual(
          fake.events().map((e) => e.event_type),
          ["token.issued", "proxy.hit"],
        );
      } finally {
        await u.close();
        await fake.close();
      }
    });
test.support.fake-egress.proxy-forward.test.ts::C-6f87d878 bad credential-less registrations throw and register nothing:
    test("C-6f87d878 bad credential-less registrations throw and register nothing", async () => {
      const fake = await start();
      try {
        assert.throws(() => fake.addCredentialless("svc_1", T_A, "http://tools.fake.test"), {
          name: "TypeError",
          message: "addCredentialless: ids must be lowercase UUIDs",
        });
        assert.throws(() => fake.addCredentialless(S3, T_A.toUpperCase(), "http://tools.fake.test"), {
          name: "TypeError",
          message: "addCredentialless: ids must be lowercase UUIDs",
        });
        for (const bad of ["http://tools.fake.test/x", "ftp://tools.fake.test"]) {
          assert.throws(() => fake.addCredentialless(S3, T_A, bad), {
            name: "TypeError",
            message: "addCredentialless: targetUrl must be an http or https origin",
          });
        }
        const tok = await issue(fake, S3);
        const reply = await call(fake.proxyUrl, "GET", `/${S3}/x`, { authorization: `Bearer ${tok}` });
        assert.deepEqual(reply, { status: 502, body: "bad gateway: vault error\n" });
      } finally {
        await fake.close();
      }
    });
test.support.fake-egress.proxy-forward.test.ts::C-6f87d878 the credential-less route serves until a credential is stored:
    test("C-6f87d878 the credential-less route serves until a credential is stored", async () => {
      const fake = await start();
      const echo = await startNewEcho();
      try {
        fake.addUpstream("tools.fake.test", echo.origin);
        fake.addCredentialless(S3, T_A, "http://tools.fake.test");
        const tok = await issue(fake, S3);
        const auth = { authorization: `Bearer ${tok}` };
    
        const first = seen(await call(fake.proxyUrl, "GET", `/${S3}/x`, auth));
        assert.deepEqual(first.headers, { host: "tools.fake.test" });
        assert.deepEqual(
          fake.requests().map((r) => r.headers),
          [{ host: "tools.fake.test" }],
        );
        assert.deepEqual(fake.credentials(), []);
    
        await put(fake, fake.vaultAdmin, { serviceId: S3 });
        const second = seen(await call(fake.proxyUrl, "GET", `/${S3}/x`, auth));
        assert.equal(second.headers[H_KEY], VAL1);
        assert.equal(fake.requests()[1]?.headers[H_KEY], "[credential]");
      } finally {
        await fake.close();
        await echo.close();
      }
    });

`accept: <why>` replays exactly the saved change of 0 files (the whole patch is in `openspec/changes/add-fake-egress-proxy/.l4/held/4.2-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The already-satisfied claim of task 4.2 holds in the repository. The four held tests exist in the test file that task 4.1 committed, named with C-4347a436 and C-6f87d878, and their assertions follow the Pass-through, credential-less and Registration rows of test-plan.md: the 302 with its location, both set-cookie lines and x-up, the 500, the two 502 answers with the exact body, the loopback target answering with its own host and port, the gated stream read before any record, the credential-less route without a credential header and the stored credential winning afterwards, and the four TypeError registrations followed by the 502 vault error. The production code already implements what task 4.2 names: the proxy resolves the target from the stored credential or the credential-less map, connects to a loopback target host when no upstream is mapped, and answers 502 bad gateway upstream unreachable for an unmapped non-loopback host or a connection error, while addCredentialless validates lowercase UUIDs and an http or https origin. None of these assertions can pass without that code, so the passing real run is genuine evidence rather than a trivially satisfied test. The typecheck excerpt about RequestRedirect belongs to the first red attempt of task 4.1; the committed file no longer contains that name. Replaying the empty patch with every gate is the right next step; a retry would meet the same Python-only limitation of the zero-value run.
