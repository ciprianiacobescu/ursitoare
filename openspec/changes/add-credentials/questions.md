# Questions — add-credentials

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
| Q-001 | accepted | 1.1 | technical | src/credentials/schema.test.ts:31-38 insertServer cannot insert into tool_server through the owner pool |
| Q-002 | answered | 3.2 | harness | Task 3.2: the pre-satisfied check could not decide |
| Q-003 | accepted | 5.2 | technical | src/api/credential-secrets.test.ts:378-380 contradicts :418 and :429 (C-01ef6501) |
| Q-004 | answered | none | verdict | Criterion C-96e47324 (api-conventions › Every error code is registered › The registry): accept as satisfied? |
| Q-005 | answered | none | verdict | Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan): accept as satisfied? |
| Q-006 | answered | none | verdict | Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass): accept as satisfied? |
| Q-007 | open | none | verdict | Criterion C-541ef4f9 (api-conventions › Every error code is registered › Route errors): accept as satisfied? |
| Q-008 | open | none | verdict | Finding F-0b2a2fe6: task 3.2 is ticked as already satisfied, but its text is not done |
<!-- l4:index:end -->

---

## Q-001: src/credentials/schema.test.ts:31-38 insertServer cannot insert into tool_server through the owner pool

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 1.1
- **Kind:** technical
- **Asked:** 2026-11-09T22:06Z by claude-sonnet, run r-20261109T2147Z-0cd4, task 1.1

### Context
`insertServer` runs INSERT INTO ursitoare.tool_server on `db.ownerPool` outside a tenant transaction. 0470 forces row level security with WITH CHECK (tenant_id = current_setting('app.tenant_id', true)), and the owner role has no bypass, so the insert fails with 42501 before any credential_ref row is tested. `insertRef` already uses withTenantTx, which sets app.tenant_id, and that works.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/credentials/schema.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-credentials`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/credentials/schema.test.ts`: make `insertServer` run its INSERT inside `withTenantTx(db.ownerPool, { tenantId } as TenantContext, tx => tx.query(...))`, or set `app.tenant_id` with set_config in a transaction on the owner pool, so the forced RLS policy passes.

### Clarifier suggestion
Edit `src/credentials/schema.test.ts`: make `insertServer` run its INSERT inside `withTenantTx(db.ownerPool, { tenantId } as TenantContext, tx => tx.query(...))`, or set `app.tenant_id` with set_config in a transaction on the owner pool, so the forced RLS policy passes.

### Answer
<!-- write below this line -->

---

## Q-002: Task 3.2: the pre-satisfied check could not decide

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): I cannot run the tests, and the repository argues against taking the claim: the head already contains everything task 3.2 names as its green work. provision.ts maps 23505 on credential_ref_server_key and credential_ref_service_key to CREDENTIALS_EXISTS and 23503 on the fkey to CREDENTIALS_NOT_FOUND
- **Blocking tasks:** 3.2
- **Kind:** harness
- **Asked:** 2026-11-10T01:34Z by deepseek-free, run r-20261110T0049Z-18e5, task 3.2
- **Criteria:** C-842be4dd (credentials › Provisioning writes the vault first, then the reference and the audit event, and leaves nothing behind on failure › Vault and insert failures write nothing and a later put counts on)

### Context
L4 could not run the pre-satisfied check of task 3.2, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/credentials/provision-failures.test.ts is not a Python file; the test-base-run run wrote no readable report (timed out after 1800s)
Runs: test-base-run
Kept real: nothing
Tests: src.credentials.provision-failures.test.ts::C-842be4dd a transaction abort and a down pool write nothing, src.credentials.provision-failures.test.ts::C-842be4dd an insert failure leaves the vault entry and the repeat counts on, src.credentials.provision-failures.test.ts::C-842be4dd an insert failure without a service id orphans the first put, src.credentials.provision-failures.test.ts::C-842be4dd concurrent provisions keep one row and refuse the lost race, src.credentials.provision-failures.test.ts::C-842be4dd concurrent provisions of one service id keep one row and refuse the loser, src.credentials.provision-failures.test.ts::C-842be4dd insert constraint errors map by constraint and other errors pass unchanged, src.credentials.provision-failures.test.ts::C-842be4dd vault failures map to CREDENTIALS_VAULT and leave no row or event

Changes the replay applies (1 files):
    added src/credentials/provision-failures.test.ts

Source of the tests (redacted; at most 40 lines each):
src.credentials.provision-failures.test.ts::C-842be4dd a transaction abort and a down pool write nothing:
    test("C-842be4dd a transaction abort and a down pool write nothing", async () => {
      const rig = await setup();
      try {
        const abort = new Error("abort");
        await assert.rejects(
          withTenantTx(rig.db.appPool, rig.ta, async (tx) => {
            await provisionCredentialTx(
              tx,
              rig.deps,
              rig.ta,
              { toolServerId: "beta", authScheme: API, headerName: KH, value: VAL1, serviceId: S2 },
              CAROL,
            );
            throw abort;
          }),
          (error: unknown) => error === abort,
        );
        assert.equal(await countRows(rig, "credential_ref"), 0);
        assert.equal(await countEvents(rig), 0);
        assert.deepEqual(serviceVersions(rig), [{ serviceId: S2, keyVersion: 1 }]);
    
        const down: TenantPool = {
          connect: async () => {
            throw new Error("db down");
          },
        };
        await assert.rejects(
          provisionCredential(
            { ...rig.deps, pool: down },
            rig.ta,
            { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 },
            CAROL,
          ),
          /db down/,
        );
        assert.equal(await countRows(rig, "credential_ref"), 0);
        assert.equal(await countEvents(rig), 0);
      } finally {
        await teardown(rig);
      }
    [cut: 1 more lines]
src.credentials.provision-failures.test.ts::C-842be4dd an insert failure leaves the vault entry and the repeat counts on:
    test("C-842be4dd an insert failure leaves the vault entry and the repeat counts on", async () => {
      const rig = await setup();
      try {
        const failing = rejectingPool(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text));
        const input = {
          toolServerId: "acme",
          authScheme: API,
          headerName: KH,
          value: VAL1,
          serviceId: SVC1,
        } as const;
        await assert.rejects(provisionCredential({ ...rig.deps, pool: failing }, rig.ta, input, CAROL), /injected/);
        assert.equal(await countRows(rig, "credential_ref"), 0);
        assert.equal(await countEvents(rig), 0);
        assert.deepEqual(serviceVersions(rig), [{ serviceId: SVC1, keyVersion: 1 }]);
    
        const repeat = await provisionCredential(rig.deps, rig.ta, input, CAROL);
        assert.equal(repeat.serviceId, SVC1);
        assert.equal(repeat.keyVersion, 2);
        assert.deepEqual(await credentialRows(rig), [{ mintkey_service_id: SVC1, key_version: 2 }]);
        assert.equal(await countEvents(rig), 1);
      } finally {
        await teardown(rig);
      }
    });
src.credentials.provision-failures.test.ts::C-842be4dd an insert failure without a service id orphans the first put:
    test("C-842be4dd an insert failure without a service id orphans the first put", async () => {
      const rig = await setup();
      try {
        const failing = rejectingPool(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text));
        const input = { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 } as const;
        await assert.rejects(provisionCredential({ ...rig.deps, pool: failing }, rig.ta, input, CAROL), /injected/);
        assert.equal(await countRows(rig, "credential_ref"), 0);
        assert.equal(await countEvents(rig), 0);
        assert.deepEqual(serviceVersions(rig), [{ serviceId: SVC1, keyVersion: 1 }]);
    
        const repeat = await provisionCredential(rig.deps, rig.ta, input, CAROL);
        assert.equal(repeat.serviceId, SVC3);
        assert.equal(repeat.id, CRED4);
        assert.equal(repeat.keyVersion, 1);
        assert.deepEqual(await credentialRows(rig), [{ mintkey_service_id: SVC3, key_version: 1 }]);
        assert.deepEqual(serviceVersions(rig), [
          { serviceId: SVC1, keyVersion: 1 },
          { serviceId: SVC3, keyVersion: 1 },
        ]);
      } finally {
        await teardown(rig);
      }
    });
src.credentials.provision-failures.test.ts::C-842be4dd concurrent provisions keep one row and refuse the lost race:
    test("C-842be4dd concurrent provisions keep one row and refuse the lost race", async () => {
      const rig = await setup();
      try {
        const serverRace = barrierWriter(rig.inner, 2);
        const input = { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 } as const;
        const serverOutcomes = await Promise.allSettled([
          provisionCredential({ ...rig.deps, vault: serverRace }, rig.ta, input, CAROL),
          provisionCredential({ ...rig.deps, vault: serverRace }, rig.ta, { ...input, value: VAL2 }, CAROL),
        ]);
        const serverRecord = serverOutcomes.find(
          (outcome): outcome is PromiseFulfilledResult<CredentialRecord> => outcome.status === "fulfilled",
        );
        const serverFailure = serverOutcomes.find(
          (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected",
        );
        assert.ok(serverRecord !== undefined, "one provision returned a record");
        assert.ok(serverFailure !== undefined, "one provision was refused");
        assert.equal(serverRecord.value.toolServerId, "acme");
        const serverError: unknown = serverFailure.reason;
        assert.ok(serverError instanceof CredentialsError, "the loser throws a CredentialsError");
        assert.equal(serverError.code, "CREDENTIALS_EXISTS");
        assert.deepEqual({ ...serverError.details }, { toolServerId: "acme" });
        assert.equal(await countRows(rig, "credential_ref"), 1);
        assert.equal(await countEvents(rig), 1);
        const serverEntries = rig.fake.credentials();
        assert.equal(serverEntries.length, 2);
        const storedServer = serverEntries.find((entry) => entry.serviceId === serverRecord.value.serviceId);
        assert.ok(storedServer !== undefined, "the row's service is in the vault");
        assert.equal(storedServer.keyVersion, serverRecord.value.keyVersion);
      } finally {
        await teardown(rig);
      }
    });
src.credentials.provision-failures.test.ts::C-842be4dd concurrent provisions of one service id keep one row and refuse the loser:
    test("C-842be4dd concurrent provisions of one service id keep one row and refuse the loser", async () => {
      const rig = await setup();
      try {
        const serviceRace = barrierWriter(rig.inner, 2);
        const outcomes = await Promise.allSettled([
          provisionCredential(
            { ...rig.deps, vault: serviceRace },
            rig.ta,
            { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1, serviceId: S1 },
            CAROL,
          ),
          provisionCredential(
            { ...rig.deps, vault: serviceRace },
            rig.ta,
            { toolServerId: "beta", authScheme: API, headerName: KH, value: VAL2, serviceId: S1 },
            CAROL,
          ),
        ]);
        const record = outcomes.find(
          (outcome): outcome is PromiseFulfilledResult<CredentialRecord> => outcome.status === "fulfilled",
        );
        const failure = outcomes.find(
          (outcome): outcome is PromiseRejectedResult => outcome.status === "rejected",
        );
        assert.ok(record !== undefined, "one provision returned a record");
        assert.ok(failure !== undefined, "one provision was refused");
        const error: unknown = failure.reason;
        assert.ok(error instanceof CredentialsError, "the loser throws a CredentialsError");
        assert.equal(error.code, "CREDENTIALS_EXISTS");
        assert.deepEqual({ ...error.details }, { serviceId: S1 });
        assert.equal(await countRows(rig, "credential_ref"), 1);
        assert.equal(await countEvents(rig), 1);
        assert.deepEqual(serviceVersions(rig), [{ serviceId: S1, keyVersion: 2 }]);
        const stored = await credentialRows(rig);
        assert.deepEqual(stored.map((row) => row.mintkey_service_id), [S1]);
        assert.equal(stored[0]?.key_version, record.value.keyVersion);
      } finally {
        await teardown(rig);
      }
    });
src.credentials.provision-failures.test.ts::C-842be4dd insert constraint errors map by constraint and other errors pass unchanged:
    test("C-842be4dd insert constraint errors map by constraint and other errors pass unchanged", async () => {
      const rig = await setup();
      try {
        const fk = Object.assign(new Error("fk"), {
          code: "23503",
          constraint: "credential_ref_tool_server_fkey",
        });
        await assert.rejects(
          provisionCredential(
            { ...rig.deps, pool: rejectingPoolWith(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text), fk) },
            rig.ta,
            { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 },
            CAROL,
          ),
          refusal("CREDENTIALS_NOT_FOUND", { toolServerId: "acme" }),
        );
        assert.equal(await countRows(rig, "credential_ref"), 0);
        assert.equal(await countEvents(rig), 0);
    
        const otherFk = Object.assign(new Error("other fk"), { code: "23503", constraint: "other_fkey" });
        await assert.rejects(
          provisionCredential(
            { ...rig.deps, pool: rejectingPoolWith(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text), otherFk) },
            rig.ta,
            { toolServerId: "beta", authScheme: API, headerName: KH, value: VAL1 },
            CAROL,
          ),
          (error: unknown) => error === otherFk,
        );
    
        const otherUnique = Object.assign(new Error("other unique"), {
          code: "23505",
          constraint: "other_key",
        });
        await assert.rejects(
          provisionCredential(
            {
              ...rig.deps,
              pool: rejectingPoolWith(rig.db.appPool, (text) => INSERT_CREDENTIAL.test(text), otherUnique),
            },
    [cut: 12 more lines]
src.credentials.provision-failures.test.ts::C-842be4dd vault failures map to CREDENTIALS_VAULT and leave no row or event:
    test("C-842be4dd vault failures map to CREDENTIALS_VAULT and leave no row or event", async () => {
      const rig = await setup();
      try {
        const denied = createVaultWriter(
          {
            url: rig.fake.vaultUrl,
            identity: rig.fake.vaultDenied.identity,
            token: new Secret(rig.fake.vaultDenied.token),
          },
          { logger: rig.logger },
        );
        const input = { toolServerId: "acme", authScheme: API, headerName: KH, value: VAL1 } as const;
        const writers: [VaultWriter, (error: unknown) => boolean][] = [
          [denied, refusal("CREDENTIALS_VAULT", { reason: "token_refused" })],
          [
            rejectingWriter(new GatewayError("GATEWAY_INVALID", "refused", { reason: "bad" })),
            refusal("CREDENTIALS_VAULT", { reason: "vault_refused" }),
          ],
          [
            rejectingWriter(new GatewayError("GATEWAY_UNAVAILABLE", "down", { stage: "vault" })),
            refusal("CREDENTIALS_VAULT", { reason: "unavailable" }),
          ],
        ];
        for (const [vault, check] of writers) {
          await assert.rejects(provisionCredential({ ...rig.deps, vault }, rig.ta, input, CAROL), check);
        }
        const boom = new Error("boom");
        await assert.rejects(
          provisionCredential({ ...rig.deps, vault: rejectingWriter(boom) }, rig.ta, input, CAROL),
          (error: unknown) => error === boom,
        );
        assert.equal(await countRows(rig, "credential_ref"), 0);
        assert.equal(await countEvents(rig), 0);
        assert.deepEqual(rig.fake.credentials(), []);
      } finally {
        await teardown(rig);
      }
    });

Diff of src/credentials/provision-failures.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/credentials/provision-failures.test.ts b/src/credentials/provision-failures.test.ts
    new file mode 100644
    index 0000000..e77a98a
    --- /dev/null
    +++ b/src/credentials/provision-failures.test.ts
    @@ -0,0 +1,458 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import { Secret } from "../config/index.ts";
    +import { fixedClock, sequentialIds } from "../core/index.ts";
    +import { GatewayError } from "../gateway/index.ts";
    +import { createVaultWriter } from "../gateway/vault.ts";
    +import type { PutCredentialInput, VaultWriter } from "../gateway/vault.ts";
    +import { createLogger } from "../observability/index.ts";
    +import { withTenantTx } from "../tenancy/index.ts";
    +import type { TenantContext, TenantPool } from "../tenancy/index.ts";
    +import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
    +import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
    +import { withTestDatabase } from "../../test/support/pg.ts";
    +import type { TestDatabase } from "../../test/support/pg.ts";
    +import { seedTwoTenants } from "../../test/support/tenants.ts";
    +import { provisionCredential, provisionCredentialTx } from "./provision.ts";
    +import { CredentialsError } from "./types.ts";
    +import type { CredentialDeps, CredentialRecord } from "./types.ts";
    +
    +assert.equal(typeof provisionCredential, "function");
    +assert.equal(typeof provisionCredentialTx, "function");
    +
    +const ORIGIN = "https://tools.fake.test";
    +const KH = "x-fake-tools-key";
    +const NOW = "2026-11-06T10:00:00Z";
    +const SVC1 = "00000000-0000-7000-8000-000000000001";
    +const SVC3 = "00000000-0000-7000-8000-000000000003";
    +const CRED4 = "cred_00000000-0000-7000-8000-000000000004";
    +const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
    +const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
    +const CAROL = { kind: "user", id: "u_carol" } as const;
    +const API = "API_KEY_HEADER";
    +const VAL1 = "kv-secret-7f3a";
    [cut: 424 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-credentials/.l4/held/3.2-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-credentials/.l4/held/3.2-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: the 7 tests are real and pass at the head because task 3.1's green already wrote the mapping task 3.2 names (vault-call.ts maps GatewayError to CREDENTIALS_VAULT; provision.ts maps 23505 and 23503 by constraint), although tasks.md:14 told 3.1 to leave errors unmapped. Checked out of band on c7b94971 with the held patch (sha256 e19f3d66): all 7 pass; eslint and tsc are clean; with vault errors unmapped 1 test fails by AssertionError, with insert errors unmapped 3 fail by AssertionError, so the tests discriminate. The zero-value run cannot vary TypeScript and the base run timed out at 1800s without a report, so a retry only repeats the same check. Green for 3.2 has nothing left to write.

---

## Q-003: src/api/credential-secrets.test.ts:378-380 contradicts :418 and :429 (C-01ef6501)

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-11-10T03:57Z by claude-sonnet, run r-20261110T0141Z-96fe, task 5.2

### Context
Lines 378-380 push Buffer.from(call.value).toString("utf8") for every call in vaultCalls and deniedCalls into errorTexts. Line 418 asserts that the same vaultCalls values include CANARY, and line 429 asserts that the joined errorTexts do not include CANARY ('errors do not contain the canary'). The vault writer must receive the canary, so errorTexts always holds it and the assertion cannot pass with any implementation. Every other test passes, including all of C-bbdd4a2c and C-94f3dabe.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/api/credential-secrets.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-credentials`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/api/credential-secrets.test.ts`: delete the loop at lines 378-380 (`for (const call of [...vaultCalls, ...deniedCalls]) { errorTexts.push(Buffer.from(call.value).toString("utf8")); }`) so errorTexts holds only the error texts

### Clarifier suggestion
Edit `src/api/credential-secrets.test.ts`: delete the loop at lines 378-380 (`for (const call of [...vaultCalls, ...deniedCalls]) { errorTexts.push(Buffer.from(call.value).toString("utf8")); }`) so errorTexts holds only the error texts

### Answer
<!-- write below this line -->

---

## Q-004: Criterion C-96e47324 (api-conventions › Every error code is registered › The registry): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-96e47324 (api-conventions › Every error code is registered › The registry)

### Context
Criterion C-96e47324 (api-conventions › Every error code is registered › The registry) is needs human after round 1.

Scenario:
\- **WHEN** `ERROR_CODES` is read
\- **THEN** it has exactly these 27 entries, `CODE status "message"`, and `isRegisteredCode` is true for each and false for `cursor_invalid`, `""` and `NOT_A_CODE`: `NOT_FOUND 404 "Route not found"`, `VALIDATION_FAILED 400 "Request validation failed"`, `PAYLOAD_TOO_LARGE 413 "Payload too large"`, `UNSUPPORTED_MEDIA_TYPE 415 "Unsupported media type"`, `BAD_REQUEST 400 "Bad request"`, `INTERNAL 500 "Internal server error"`, `WEB_NOT_BUILT 503 "Web app is not built"`, `UNAUTHENTICATED 401 "Authentication required"`, `FORBIDDEN 403 "Action not permitted"`, `CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_CSRF_INVALID 403 "CSRF token missing or invalid"`, `OIDC_NOT_CONFIGURED 503 "Sign-in is not configured"`, `AUTHZ_UNAVAILABLE 503 "Authorization is unavailable"`, `CURSOR_INVALID 400 "Cursor is invalid"`, `IDEMPOTENCY_KEY_REUSED 422 "Idempotency key was used with a different request"`, `IDEMPOTENCY_IN_PROGRESS 409 "A request with this idempotency key is in progress"`, `ALREADY_EXISTS 409 "Resource already exists"`, `IN_USE 409 "Resource is in use"`, `ELEVATION_REFUSED 403 "Role cannot be granted by this principal"`, `UNKNOWN_ISSUER 422 "Issuer is not routed to this tenant"`, `OPERATION_REFUSED 422 "Operation is refused"`, `ENGINE_KEY_REQUIRED 503 "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)"`, `FLOW_TEXT_INVALID 422 "Flow text is not a readable flow document"`, `RUNS_UNAVAILABLE 503 "Runs are unavailable"`, `TEST_MOCK_MISSING 422 "A block node has no mock"`, `TEST_MOCK_INVALID 422 "A mock does not fit its node"`, `EGRESS_UNAVAILABLE 503 "The egress broker or vault is unavailable"`

Why: uncovered: the tests that trace it are inadequate or did not pass
Judge: pass
Tracing tests: src.api.credential-codes.test.ts::C-96e47324 registers EGRESS_UNAVAILABLE with its status and message (passed, red_assertion, inadequate)
Ignored tests: src.api.error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message (no proof that it discriminates (no red, audit or generated record)); src.api.flow-errors.test.ts::C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422 (no proof that it discriminates (no red, audit or generated record)); src.api.run-list.test.ts::C-96e47324 the runs failure code is registered with status and message (no proof that it discriminates (no red, audit or generated record)); src.api.test-run-codes.test.ts::C-96e47324 registers TEST_MOCK_INVALID with its status and message (no proof that it discriminates (no red, audit or generated record)); src.api.test-run-codes.test.ts::C-96e47324 registers TEST_MOCK_MISSING with its status and message (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept ERROR_CODES in src/api/error-codes.ts holds exactly the 27 entries of the scenario with the listed status and message, isRegisteredCode is a hasOwnProperty check, and the edited frozen test asserts the exact key set, every entry, true for each code and false for cursor_invalid, the empty string and NOT_A_CODE; the new narrow test of task 5.1 asserts the EGRESS_UNAVAILABLE entry, which is the shape the proposal prescribes.
---

## Q-005: Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan)

### Context
Criterion C-601275f9 (api-conventions › Every error code is registered › An unregistered literal code fails the scan) is needs human after round 1.

Scenario:
\- **WHEN** `checkApiErrorCodes` runs on a snapshot whose `src/x/a.ts` has `throw new ApiError(409, "FLOW_EXISTS", "x")` on line 3, with the registered list `["NOT_FOUND"]`
\- **THEN** it returns one violation with code `ARCH_API_ERROR_CODE`, file `src/x/a.ts`, line 3, and a message that names `FLOW_EXISTS` and `src/api/error-codes.ts`

Why: the judge answered insufficient_evidence
Judge: insufficient_evidence
Tracing tests: test.arch.error-codes.test.ts::C-601275f9 An unregistered literal ApiError code fails the scan (passed, pass_to_pass)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept checkApiErrorCodes in test/arch/error-codes.ts walks every non-test src ts file, reports each new ApiError whose second argument is a string literal not in the registered list as ARCH_API_ERROR_CODE with the file, the 1-based line and a message naming the code and src/api/error-codes.ts; the tracing test builds exactly the scenario's snapshot with the throw on line 3 and the list ["NOT_FOUND"] and asserts one violation with each of those members.
---

## Q-006: Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass)

### Context
Criterion C-05ca73a7 (api-conventions › Every error code is registered › Registered, dynamic and test uses pass) is needs human after round 1.

Scenario:
\- **WHEN** a snapshot holds `new ApiError(404, "NOT_FOUND", "m")`, `new ApiError(500, code, "m")` and a `src/x/a.test.ts` with the literal `"FLOW_EXISTS"`
\- **THEN** `checkApiErrorCodes` returns `[]`, and also `[]` over `readSnapshot()` with the default registry

Why: the judge answered insufficient_evidence
Judge: insufficient_evidence
Tracing tests: test.arch.error-codes.test.ts::C-05ca73a7 Registered, dynamic and test code use passes the scan (passed, pass_to_pass)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The scan returns null for a non-literal second argument and skips test files, so the registered literal, the dynamic code and the test-file literal give no violation; the tracing test builds that snapshot and asserts [] with the default registry and with ["NOT_FOUND"], and asserts [] over readSnapshot(); every literal ApiError code in the non-test src tree is in the registry, so that assertion holds.
---

## Q-007: Criterion C-541ef4f9 (api-conventions › Every error code is registered › Route errors): accept as satisfied?

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier
- **Criteria:** C-541ef4f9 (api-conventions › Every error code is registered › Route errors)

### Context
Criterion C-541ef4f9 (api-conventions › Every error code is registered › Route errors) is needs human after round 1.

Scenario:
\- **WHEN** `unregisteredRouteErrors` gets `GET /a` with errors `["NOT_FOUND", "NOPE"]` and `POST /b` with `[]`
\- **THEN** it returns `["GET /a: NOPE"]`, and `[]` for no routes (the real engine's routes are checked in "The real engine" of the OpenAPI requirement)

Why: the judge answered insufficient_evidence
Judge: insufficient_evidence
Tracing tests: src.api.error-codes.test.ts::C-541ef4f9 Route errors lists only routes whose declared codes are unregistered (passed, pass_to_pass)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-008: Finding F-0b2a2fe6: task 3.2 is ticked as already satisfied, but its text is not done

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 1, verifier

### Context
The judge raised a major finding in round 1, and no deterministic check confirms it.

Title: task 3.2 is ticked as already satisfied, but its text is not done
Detail: task 3.2 implementation (provision.ts SQLSTATE 23505/23503 mapping, vault-call.ts GatewayError mapping, provision-failures.test.ts) is in parts 2-3, not shown in part 1; the gate report lists C-842be4dd tests as pre_satisfied/inconclusive via Q-002, so part 1 does not show the task is done.

Answer `accept` to waive the finding, or `reject` and say why: a rejected finding is fixed by a fix unit, and your reason comes first in it.
This finding cites no criterion: end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals, or no fix can be made from the reject.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
