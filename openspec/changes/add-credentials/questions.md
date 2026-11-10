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
| Q-002 | open | 3.2 | harness | Task 3.2: the pre-satisfied check could not decide |
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

- **Status:** open
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
