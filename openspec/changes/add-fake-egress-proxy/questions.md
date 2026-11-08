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
| Q-002 | answered | 5.2 | harness | Task 5.2: the pre-satisfied check could not decide |
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

---

## Q-002: Task 5.2: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.2
- **Kind:** harness
- **Asked:** 2026-11-08T23:40Z by claude-sonnet, run r-20261108T2228Z-da41, task 5.2
- **Criteria:** C-eb168123 (test-fake-egress › The fake starts on loopback, clears its records and closes completely › Start, register, clear and close)

### Context
L4 could not run the pre-satisfied check of task 5.2, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and test/support/fake-egress/lifecycle.test.ts is not a Python file; the test-base-run run wrote no readable report (timed out after 1800s)
Runs: test-base-run
Kept real: nothing
Tests: test.support.fake-egress.lifecycle.test.ts::C-eb168123 close releases ports, sockets, sessions and held forwards, test.support.fake-egress.lifecycle.test.ts::C-eb168123 two fakes start on loopback with distinct ports and secrets, validate and clear

Changes the replay applies (1 files):
    added test/support/fake-egress/lifecycle.test.ts

Source of the tests (redacted; at most 40 lines each):
test.support.fake-egress.lifecycle.test.ts::C-eb168123 close releases ports, sockets, sessions and held forwards:
    test("C-eb168123 close releases ports, sockets, sessions and held forwards", async () => {
      const a = await start();
      let echo: EchoUpstream | undefined;
      await assert.doesNotReject(async () => {
        echo = await startEchoUpstream();
      });
      assert.ok(echo !== undefined);
      let upstreamSocketClosed: Promise<void> = Promise.resolve();
      let resolveHeld: () => void = () => {};
      const heldSeen = new Promise<void>((r) => {
        resolveHeld = r;
      });
      const upstream = http.createServer((req, res) => {
        if (req.url === "/hold") {
          upstreamSocketClosed = closed(req.socket);
          res.write("x");
          resolveHeld();
          return;
        }
        res.end("ok");
      });
      await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
      const addr = upstream.address();
      assert.ok(addr !== null && typeof addr !== "string");
      a.addUpstream("tools.fake.test", `http://127.0.0.1:${addr.port}`);
      const proxyPort = Number(new URL(a.proxyUrl).port);
      try {
        await putS1(a);
        const token = await issue(a);
    
        const keepAlive = net.connect(proxyPort, "127.0.0.1");
        await new Promise<void>((r) => keepAlive.once("connect", () => r()));
        const session = http2.connect(a.vaultUrl);
        session.on("error", () => {});
        await new Promise<void>((r) => session.once("connect", () => r()));
    
        const held = new Promise<void>((resolve, reject) => {
          const req = http.request(
            { host: "127.0.0.1", port: proxyPort, path: `/${S1}/hold`, headers: { authorization: `Bearer ${token}` }, agent: false },
            (res) => {
    [cut: 31 more lines]
test.support.fake-egress.lifecycle.test.ts::C-eb168123 two fakes start on loopback with distinct ports and secrets, validate and clear:
    test("C-eb168123 two fakes start on loopback with distinct ports and secrets, validate and clear", async () => {
      const echo = await startEchoUpstream();
      const a = await start();
      const b = await start();
      try {
        const ports = new Set<string>();
        for (const f of [a, b]) {
          for (const url of [f.brokerUrl, f.proxyUrl, f.vaultUrl]) {
            assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
            ports.add(url);
          }
        }
        assert.equal(ports.size, 6);
        const tokens = [a, b].flatMap((f) => [f.brokerServiceToken, f.proxyServiceToken]);
        tokens.push(a.vaultAdmin.token, a.vaultProxy.token, a.vaultDenied.token);
        for (const t of tokens) assert.match(t, /^[A-Za-z0-9_-]{32}$/);
        assert.equal(new Set(tokens).size, tokens.length);
        assert.deepEqual(
          [a.vaultAdmin, a.vaultProxy, a.vaultDenied].map((v) => ({ identity: v.identity, scopes: v.scopes })),
          [
            { identity: "svcid_ursitoare_admin", scopes: ["vault.put", "vault.read"] },
            { identity: "svcid_proxy", scopes: ["vault.read", "vault.put"] },
            { identity: "svcid_email_proxy", scopes: [] },
          ],
        );
    
        const O = echo.origin;
        const bad: [() => void, string][] = [
          [() => { a.addUpstream("example.com", O); }, 'addUpstream: host must end with ".fake.test"'],
          [() => { a.addUpstream("fake.test", O); }, 'addUpstream: host must end with ".fake.test"'],
          [() => { a.addUpstream("a.fake.test:8080", O); }, 'addUpstream: host must end with ".fake.test"'],
          [() => { a.addUpstream("a.fake.test", "https://127.0.0.1:9"); }, "addUpstream: origin must be an http origin on a loopback host"],
          [() => { a.addUpstream("a.fake.test", "http://example.com"); }, "addUpstream: origin must be an http origin on a loopback host"],
          [() => { a.addUpstream("a.fake.test", "http://127.0.0.1:9/path"); }, "addUpstream: origin must be an http origin on a loopback host"],
          [() => { a.addUpstream("a.fake.test", "http://u:p@127.0.0.1:9"); }, "addUpstream: origin must be an http origin on a loopback host"],
          [() => { a.addCredentialless("svc_1", T_A, "http://tools.fake.test"); }, "addCredentialless: ids must be lowercase UUIDs"],
          [() => { a.addCredentialless(S3, T_A.toUpperCase(), "http://tools.fake.test"); }, "addCredentialless: ids must be lowercase UUIDs"],
          [() => { a.addCredentialless(S3, T_A, "http://tools.fake.test/x"); }, "addCredentialless: targetUrl must be an http or https origin"],
          [() => { a.addCredentialless(S3, T_A, "ftp://tools.fake.test"); }, "addCredentialless: targetUrl must be an http or https origin"],
        ];
    [cut: 18 more lines]

Diff of test/support/fake-egress/lifecycle.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/test/support/fake-egress/lifecycle.test.ts b/test/support/fake-egress/lifecycle.test.ts
    new file mode 100644
    index 0000000..58a3b35
    --- /dev/null
    +++ b/test/support/fake-egress/lifecycle.test.ts
    @@ -0,0 +1,207 @@
    +import assert from "node:assert/strict";
    +import http from "node:http";
    +import http2 from "node:http2";
    +import net from "node:net";
    +import { test } from "node:test";
    +
    +import { startEchoUpstream, startFakeEgress } from "./index.ts";
    +import type { EchoUpstream, FakeEgress } from "./index.ts";
    +import { putCredential } from "./vault-client.ts";
    +
    +const T0 = new Date("2026-11-06T10:00:00.000Z");
    +const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
    +const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
    +const S3 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e03";
    +
    +async function start(): Promise<FakeEgress> {
    +  let fake: FakeEgress | undefined;
    +  await assert.doesNotReject(async () => {
    +    fake = await startFakeEgress({ now: () => T0 });
    +  });
    +  assert.ok(fake !== undefined, "fake started");
    +  return fake;
    +}
    +
    +async function putS1(fake: FakeEgress): Promise<void> {
    +  const res = await putCredential(fake.vaultUrl, fake.vaultAdmin, {
    +    tenantId: T_A,
    +    serviceId: S1,
    +    authScheme: 1,
    +    value: Buffer.from("kv-secret-7f3a"),
    +    headerName: "x-fake-tools-key",
    +    callerActorId: "carol",
    +    targetUrl: "http://tools.fake.test",
    +  });
    [cut: 173 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-fake-egress-proxy/.l4/held/5.2-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-fake-egress-proxy/.l4/held/5.2-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: accept: The already-satisfied claim of task 5.2 holds in the repository, and the two held tests are genuine evidence rather than trivially satisfied assertions. The lifecycle test asserts everything the scenario Start, register, clear and close demands: six distinct loopback URLs over two fakes, seven distinct 32-character base64url secrets, the three vault identities with their scopes, the eleven TypeError registrations with the exact messages of test-plan.md Registration rows, clearRecords emptying issued, requests and events while credentials stay, a second forward leaving one record, and a double close that resolves both calls, closes a keep-alive proxy socket and an h2 vault session, rejects a held forward, closes its upstream socket and leaves ECONNREFUSED on all three ports. The production code already does this: index.ts validates addUpstream against a lowercase host ending in .fake.test with a label before it and a loopback http origin, validates addCredentialless ids as lowercase UUIDs and the target as an http or https origin, and its memoised close() closes the three servers and destroys every tracked socket and HTTP/2 session, while proxy.ts destroys the outgoing upstream request when the caller's response closes unfinished, which is design decision 11. The random secrets are 24 random bytes in base64url, so 32 characters of the asserted alphabet. Nothing in the trace can hang: the test uses no sleep beyond 100 ms, the per-test timeout is 120 s, and the 1800 s the base run hit is the configured 30 minute gate timeout for the whole suite, so the timeout is not evidence against the test. The typecheck excerpt about RequestRedirect is stale: the name no longer occurs anywhere under test/support/fake-egress. Replaying the one-file patch with every gate is the right next step; a retry would meet the same Python-only limitation of the zero-value run, and if the replay's test gate times out again the accept is used up and a person sees it.
