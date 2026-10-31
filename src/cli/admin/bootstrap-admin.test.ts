import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env, SecretReader } from "../../config/index.ts";
import type { Clock, IdSource } from "../../core/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { listGroupMappings, provisionTenantIdp } from "../../identity/index.ts";
import type { GroupMapping } from "../../identity/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import type { CliOutput } from "../output.ts";
import { createCommandRegistry } from "../registry.ts";
import type { CommandRegistry } from "../registry.ts";
import type { CliDeps, OwnerConnection } from "../run.ts";
import { runCli } from "../run.ts";
import { bootstrapAdminCommand } from "./bootstrap-admin.ts";

const ISS = "https://idp.example/realms/ursitoare";
const OTHER_ISSUER = "https://other.example";
const SECOND_ISSUER = "https://two.example/realms/ursitoare";
const BOOTSTRAP_GROUP = "ursitoare-admins";
const OPERATOR = "ops";

interface Captured {
  output: CliOutput;
  text(): string;
}

function capture(): Captured {
  let buffer = "";
  return {
    output: {
      write(text: string): void {
        buffer += text;
      },
    },
    text(): string {
      return buffer;
    },
  };
}

interface AuditRow {
  event_type: string;
  actor: unknown;
  payload: Unknown;
}

type Unknown = Record<string, unknown>;

async function readEvents(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      "SELECT event_type, actor, payload FROM ursitoare.audit_event WHERE tenant_id = $1 ORDER BY seq",
      [ctx.tenantId],
    );
    return result.rows;
  });
}

async function mappingsIn(db: TestDatabase, ctx: TenantContext): Promise<GroupMapping[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => listGroupMappings(tx, ctx));
}

function ownerEnv(db: TestDatabase, extra: Env = {}): Env {
  return {
    URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
    URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
    ...extra,
  };
}

function readSecretFor(db: TestDatabase): SecretReader {
  return (path) => {
    if (path === "/run/owner-pw") {
      return db.ownerEndpoint.password?.reveal() ?? "";
    }
    return "";
  };
}

function depsFor(
  registry: CommandRegistry,
  env: Env,
  stdout: Captured,
  stderr: Captured,
  db: TestDatabase,
  clock: Clock,
  ids: IdSource,
): CliDeps {
  const connectOwner = (_endpoint: Parameters<NonNullable<CliDeps["connectOwner"]>>[0]): OwnerConnection => ({
    pool: db.ownerPool,
    close: async () => undefined,
  });
  return {
    env,
    stdout: stdout.output,
    stderr: stderr.output,
    registry,
    clock,
    ids,
    readSecret: readSecretFor(db),
    connectOwner,
  };
}

const clockOf = (): Clock => fixedClock("2031-03-10T00:00:00.000Z");
const idsOf = (): IdSource => sequentialIds(1);

test("C-5d7dfa57 admin bootstrap-admin maps the first admin group once and states its effect in help", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    await provisionTenantIdp(db.ownerPool, b, { issuer: ISS, organization: "org-b" });
    const registry = createCommandRegistry();
    registry.registerCommand("admin bootstrap-admin", bootstrapAdminCommand);

    const firstStdout = capture();
    const firstStderr = capture();
    const first = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_a", "--operator", "ops"],
      depsFor(registry, ownerEnv(db), firstStdout, firstStderr, db, clockOf(), idsOf()),
    );
    assert.equal(first, 0, "the first run succeeds");
    assert.equal(firstStderr.text(), "");
    assert.equal(
      firstStdout.text(),
      `mapped ${BOOTSTRAP_GROUP} to tenant_admin\nmembers of ${BOOTSTRAP_GROUP} get tenant_admin at their next sign-in\n`,
    );

    const secondStdout = capture();
    const secondStderr = capture();
    const second = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_a", "--group", "other-admins", "--operator", "ops"],
      depsFor(registry, ownerEnv(db), secondStdout, secondStderr, db, clockOf(), idsOf()),
    );
    assert.equal(second, 0, "the second run succeeds");
    assert.equal(secondStdout.text(), "already mapped: tenant_admin has a group; nothing changed\n");

    const thirdStdout = capture();
    const thirdStderr = capture();
    const third = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_b", "--operator", "ops"],
      depsFor(registry, ownerEnv(db, { URSITOARE_BOOTSTRAP_ADMIN_GROUP: "corp-admins" }), thirdStdout, thirdStderr, db, clockOf(), idsOf()),
    );
    assert.equal(third, 0, "the configured default run succeeds");
    assert.equal(
      thirdStdout.text(),
      "mapped corp-admins to tenant_admin\nmembers of corp-admins get tenant_admin at their next sign-in\n",
    );

    const helpStdout = capture();
    const helpStderr = capture();
    const help = await runCli(
      ["admin", "bootstrap-admin", "--help"],
      depsFor(registry, ownerEnv(db), helpStdout, helpStderr, db, clockOf(), idsOf()),
    );
    assert.equal(help, 0, "--help succeeds without running the command");
    assert.ok(helpStdout.text().startsWith("usage: node src/cli/main.ts admin bootstrap-admin"), "the usage line comes first");
    assert.ok(
      helpStdout.text().includes("Prerequisite: the tenant's identity provider is provisioned."),
      "the help states the prerequisite",
    );
    assert.ok(
      helpStdout.text().includes("Effect: members of the group get tenant_admin at their next sign-in."),
      "the help states the effect",
    );
    assert.equal(helpStderr.text(), "");

    assert.deepEqual(await mappingsIn(db, a), [
      {
        issuer: ISS,
        group: BOOTSTRAP_GROUP,
        roleId: "tenant_admin",
        teamId: null,
        reviewedBy: `operator:${OPERATOR}`,
      },
    ]);

    const events = await readEvents(db, a);
    assert.deepEqual(
      events.map((event) => event.event_type),
      ["identity.bootstrap_admin_mapped", "cli.command_run", "cli.command_run"],
      "the mapped mapping appends its identity event, each run one command event",
    );
    assert.deepEqual(events[0]?.actor, { kind: "system", id: `operator:${OPERATOR}` });
    assert.deepEqual(events[1]?.payload, {
      command: "admin bootstrap-admin",
      outcome: "ok",
      group: BOOTSTRAP_GROUP,
      issuer: ISS,
      result: "mapped",
    });
    assert.deepEqual(events[2]?.payload, {
      command: "admin bootstrap-admin",
      outcome: "ok",
      group: "other-admins",
      issuer: ISS,
      result: "already_mapped",
    });
  } finally {
    await db.close();
  }
});

test("C-b47916b5 admin bootstrap-admin refuses a wrong or unclear issuer and invalid input", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const registry = createCommandRegistry();
    registry.registerCommand("admin bootstrap-admin", bootstrapAdminCommand);

    const wrongIssuerStdout = capture();
    const wrongIssuerStderr = capture();
    const wrongIssuer = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_a", "--issuer", OTHER_ISSUER],
      depsFor(registry, ownerEnv(db), wrongIssuerStdout, wrongIssuerStderr, db, clockOf(), idsOf()),
    );
    assert.equal(wrongIssuer, 1, "an issuer unknown to the tenant refuses");
    assert.equal(wrongIssuerStdout.text(), "");
    assert.ok(
      wrongIssuerStderr.text().startsWith("RBAC_UNKNOWN_ISSUER: "),
      "the wrong issuer line names the code",
    );

    const noIdpStdout = capture();
    const noIdpStderr = capture();
    const noIdp = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_b"],
      depsFor(registry, ownerEnv(db), noIdpStdout, noIdpStderr, db, clockOf(), idsOf()),
    );
    assert.equal(noIdp, 1, "a tenant without an identity provider refuses");
    assert.equal(noIdpStderr.text(), "CLI_NO_IDP: the tenant has no identity provider; provision one first\n");

    await provisionTenantIdp(db.ownerPool, a, { issuer: SECOND_ISSUER, organization: "org-a-two" });
    const twoIdpStdout = capture();
    const twoIdpStderr = capture();
    const twoIdp = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_a"],
      depsFor(registry, ownerEnv(db), twoIdpStdout, twoIdpStderr, db, clockOf(), idsOf()),
    );
    assert.equal(twoIdp, 1, "several issuers without a choice refuse");
    assert.equal(twoIdpStderr.text(), "CLI_ISSUER_REQUIRED: the tenant has several identity providers; pass --issuer <url>\n");

    const emptyGroupStdout = capture();
    const emptyGroupStderr = capture();
    const emptyGroup = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_a", "--group", ""],
      depsFor(registry, ownerEnv(db), emptyGroupStdout, emptyGroupStderr, db, clockOf(), idsOf()),
    );
    assert.equal(emptyGroup, 2, "an empty group name is a usage error");
    assert.equal(emptyGroupStderr.text(), "CLI_USAGE: --group is not a valid group name\n");

    const longGroup = "g".repeat(256);
    const configuredStdout = capture();
    const configuredStderr = capture();
    const configured = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_a"],
      depsFor(registry, ownerEnv(db, { URSITOARE_BOOTSTRAP_ADMIN_GROUP: longGroup }), configuredStdout, configuredStderr, db, clockOf(), idsOf()),
    );
    assert.equal(configured, 1, "an invalid configured group refuses");
    assert.equal(configuredStderr.text(), "CLI_CONFIG_INVALID: URSITOARE_BOOTSTRAP_ADMIN_GROUP: is not a valid group name\n");

    const badOperatorStdout = capture();
    const badOperatorStderr = capture();
    const badOperator = await runCli(
      ["admin", "bootstrap-admin", "--tenant", "tenant_a", "--operator", "bad name!"],
      depsFor(registry, ownerEnv(db), badOperatorStdout, badOperatorStderr, db, clockOf(), idsOf()),
    );
    assert.equal(badOperator, 2, "an invalid operator name is a usage error");
    assert.equal(badOperatorStderr.text(), "CLI_USAGE: --operator is not a valid operator name\n");

    const eventsA = await readEvents(db, a);
    assert.deepEqual(
      eventsA.map((event) => event.payload),
      [
        { command: "admin bootstrap-admin", outcome: "refused", code: "RBAC_UNKNOWN_ISSUER" },
        { command: "admin bootstrap-admin", outcome: "refused", code: "CLI_ISSUER_REQUIRED" },
        { command: "admin bootstrap-admin", outcome: "refused", code: "CLI_USAGE" },
        { command: "admin bootstrap-admin", outcome: "refused", code: "CLI_CONFIG_INVALID" },
      ],
      "each refusal on tenant_a leaves one refused command event",
    );
    const eventsB = await readEvents(db, b);
    assert.deepEqual(
      eventsB.map((event) => event.payload),
      [{ command: "admin bootstrap-admin", outcome: "refused", code: "CLI_NO_IDP" }],
      "the no-idp refusal is audited in its own tenant",
    );

    assert.deepEqual(await mappingsIn(db, a), [], "nothing is mapped");
    assert.deepEqual(await mappingsIn(db, b), [], "nothing is mapped for the other tenant");
  } finally {
    await db.close();
  }
});
