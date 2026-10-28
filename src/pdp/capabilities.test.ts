import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { IdSource } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import type { LogDestination, Logger } from "../observability/index.ts";
import {
  ACTIONS,
  ACTION_NAMES,
  type ActionName,
  type PrincipalEntity,
  probeRequest,
  tenantEntity,
  userEntity,
} from "./index.ts";
import {
  createPolicyEngine,
  type PolicyEngine,
  type PolicyEngineOptions,
} from "./policy-engine.ts";
import type { PolicyRequest, PolicySource } from "./types.ts";

const tempDirs: string[] = [];

const ALICE: PrincipalEntity = {
  tenantId: "tenant_a",
  userId: "alice",
  kind: "human",
  roles: [],
  teams: [],
};

const CAPABILITY_ACTIONS: readonly ActionName[] = ACTION_NAMES.filter(
  (name) => ACTIONS[name].capability,
);

const PERMIT_SOURCE: PolicySource = {
  id: "t-src",
  layer: "tenant",
  text: '@id("t-all") permit (principal, action, resource);',
};

const FLOW_SOURCE: PolicySource = {
  id: "t-src",
  layer: "tenant",
  text: '@id("t-flow") permit (principal, action == Action::"read_flow", resource);',
};

const ADMIN_SOURCE: PolicySource = {
  id: "t-admin",
  layer: "tenant",
  text: '@id("t-admin") permit (principal in Role::"tenant_admin", action == Action::"manage_users_roles", resource);',
};

const OVERFLOW_SOURCE: PolicySource = {
  id: "x-ovf",
  layer: "tenant",
  text: '@id("x-ovf") forbid (principal, action == Action::"read_flow", resource) when { 9223372036854775807 + 1 > 0 };',
};

function silentLogger(): Logger {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function capturingLogger(): { logger: Logger; lines: string[] } {
  const lines: string[] = [];
  const destination: LogDestination = {
    write(line: string): void {
      lines.push(line);
    },
  };
  return { logger: createLogger({ level: "warn", destination, clock: fixedClock("2026-10-25T09:00:00Z") }), lines };
}

function throwingIds(): IdSource {
  return {
    next(): string {
      throw new Error("ids are down");
    },
  };
}

async function engineWith(
  tenantPolicies: readonly PolicySource[] | undefined,
  opts?: { ids?: IdSource; logger?: Logger },
): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "pdp-src-"));
  tempDirs.push(srcDir);
  const options: PolicyEngineOptions = {
    srcDir,
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: opts?.ids ?? sequentialIds(),
    logger: opts?.logger ?? silentLogger(),
  };
  if (tenantPolicies !== undefined && tenantPolicies.length > 0) {
    options.tenantPolicies = tenantPolicies;
  }
  return createPolicyEngine(options);
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function allowedOf(
  engine: PolicyEngine,
  principal: PrincipalEntity,
  actions: readonly ActionName[],
): Promise<ActionName[] | undefined> {
  let result: ActionName[] | undefined;
  await assert.doesNotReject(async () => {
    result = await engine.allowedActions(principal, actions);
  }, "allowedActions");
  return result;
}

test("C-010fae49 allowedActions returns read_self for a principal without roles", async () => {
  const engine = await engineWith(undefined);
  const result = await allowedOf(engine, ALICE, ACTION_NAMES);
  assert.ok(result !== undefined, "no result");
  assert.deepEqual(result, ["read_self"], "wrong capability list without roles");
});

test("C-f08a88ad allowedActions follows the tenant policies and the roles", async () => {
  const engine = await engineWith([FLOW_SOURCE, ADMIN_SOURCE]);

  const plain = await allowedOf(engine, ALICE, ACTION_NAMES);
  assert.ok(plain !== undefined, "no result for alice");
  assert.deepEqual(plain, ["read_flow", "read_self"], "wrong list for alice");

  const admin = await allowedOf(
    engine,
    { ...ALICE, roles: ["tenant_admin"] } satisfies PrincipalEntity,
    ACTION_NAMES,
  );
  assert.ok(admin !== undefined, "no result for the admin");
  assert.deepEqual(
    admin,
    ["manage_users_roles", "read_flow", "read_self"],
    "wrong list for the admin",
  );

  const service = await allowedOf(
    engine,
    { ...ALICE, kind: "service" } satisfies PrincipalEntity,
    ACTION_NAMES,
  );
  assert.ok(service !== undefined, "no result for the service principal");
  assert.deepEqual(service, ["read_flow", "read_self"], "wrong list for the service");
});

test("C-24b9b8eb allowedActions on a permit-all engine lists the 21 capabilities", async () => {
  const engine = await engineWith([PERMIT_SOURCE]);
  const result = await allowedOf(engine, ALICE, ACTION_NAMES);
  assert.ok(result !== undefined, "no result");
  assert.deepEqual(result, [...CAPABILITY_ACTIONS], "wrong capability list");
  assert.equal(result.length, 21, "wrong capability count");
});

test("C-56c0c377 allowedActions dedupes and ignores unknown and non-capability names", async () => {
  const engine = await engineWith([PERMIT_SOURCE]);

  const withRepeats = await allowedOf(
    engine,
    ALICE,
    [
      "read_self",
      "read_self",
      "nope",
      "constructor",
      "__proto__",
      "read_self",
    ] as unknown as readonly ActionName[],
  );
  assert.ok(withRepeats !== undefined, "no result for the repeated list");
  assert.deepEqual(withRepeats, ["read_self"], "repeats and unknown names are not handled");

  const empty = await allowedOf(engine, ALICE, []);
  assert.ok(empty !== undefined, "no result for the empty list");
  assert.deepEqual(empty, [], "the empty list is not empty");

  const notAnArray = await allowedOf(
    engine,
    ALICE,
    undefined as unknown as readonly ActionName[],
  );
  assert.ok(notAnArray !== undefined, "no result for a non-array");
  assert.deepEqual(notAnArray, [], "a non-array is not handled");
});

test("C-c19eaf0b allowedActions rejects hostile principals with an empty list and a log line", async () => {
  const { logger, lines } = capturingLogger();
  const engine = await engineWith([PERMIT_SOURCE], { logger });

  const hostile: readonly unknown[] = [
    { ...ALICE, roles: Array.from({ length: 65 }, () => "r1") },
    { ...ALICE, userId: "" },
    { ...ALICE, tenantId: "bad tenant!" },
    {
      tenantId: "tenant_a",
      userId: "alice",
      kind: "human",
      teams: [],
      get roles(): readonly string[] {
        throw new Error("boom");
      },
    },
    null,
  ];

  for (const principal of hostile) {
    const result = await allowedOf(
      engine,
      principal as PrincipalEntity,
      ACTION_NAMES,
    );
    assert.ok(result !== undefined, `no result for ${String(typeof principal)}`);
    assert.deepEqual(result, [], `a hostile principal was not rejected`);
  }

  const records = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  const invalids = records.filter(
    (record) => record["msg"] === "pdp capability principal invalid",
  );
  assert.equal(invalids.length, hostile.length, "wrong number of invalid-principal log lines");
});

test("C-3e28778a probeRequest builds the probe request and skips non-capabilities", () => {
  let request: PolicyRequest | null | undefined;
  assert.doesNotThrow(() => {
    request = probeRequest(ALICE, "read_self");
  }, "probeRequest for read_self");
  assert.ok(request !== undefined, "no request for read_self");
  assert.deepEqual(
    request,
    {
      principal: { type: "User", id: "tenant_a/alice" },
      action: "read_self",
      resource: { type: "Tenant", id: "tenant_a" },
      context: {},
      entities: [userEntity(ALICE), tenantEntity("tenant_a")],
    },
    "the read_self probe request is wrong",
  );

  let invoke: PolicyRequest | null | undefined;
  assert.doesNotThrow(() => {
    invoke = probeRequest(ALICE, "invoke_tool");
  }, "probeRequest for invoke_tool");
  assert.equal(invoke, null, "invoke_tool is not skipped");

  let other: PolicyRequest | null | undefined;
  assert.doesNotThrow(() => {
    other = probeRequest({ ...ALICE, tenantId: "tenant_b" } satisfies PrincipalEntity, "read_flow");
  }, "probeRequest for tenant_b");
  assert.ok(other !== undefined && other !== null, "no request for tenant_b");
  assert.deepEqual(
    other.resource,
    { type: "Tenant", id: "tenant_b" },
    "the probe of tenant_b uses the wrong resource",
  );
});

test("C-f82e338e a policy that errors keeps the action out of allowedActions", async () => {
  const engine = await engineWith([PERMIT_SOURCE, OVERFLOW_SOURCE]);
  const result = await allowedOf(engine, ALICE, [
    "read_flow",
    "read_self",
  ] as unknown as readonly ActionName[]);
  assert.ok(result !== undefined, "no result");
  assert.deepEqual(result, ["read_self"], "the erroring policy is not skipped");
});

test("C-80ff48ba a failing dependency keeps every action out and logs one line per action", async () => {
  const { logger, lines } = capturingLogger();
  const engine = await engineWith([PERMIT_SOURCE], { ids: throwingIds(), logger });

  const result = await allowedOf(
    engine,
    ALICE,
    ["read_self", "read_flow"] as unknown as readonly ActionName[],
  );
  assert.ok(result !== undefined, "no result");
  assert.deepEqual(result, [], "the failing dependency is not handled");

  const records = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
  const failures = records.filter(
    (record) => record["msg"] === "pdp capability probe failed",
  );
  assert.equal(failures.length, 2, "wrong number of probe-failure log lines");
  const loggedActions = new Set(failures.map((failure) => String(failure["action"])));
  assert.deepEqual(
    [...loggedActions].sort(),
    ["read_flow", "read_self"],
    "the logged actions are wrong",
  );
});

test("C-bf86a21c concurrent allowedActions calls agree", async () => {
  const engine = await engineWith([PERMIT_SOURCE]);
  let all: (readonly ActionName[] | undefined)[] | undefined;
  await assert.doesNotReject(async () => {
    all = await Promise.all(
      Array.from({ length: 50 }, () => engine.allowedActions(ALICE, ACTION_NAMES)),
    );
  }, "50 concurrent calls");
  assert.ok(all !== undefined, "no results");
  assert.equal(all.length, 50, "wrong number of results");
  for (const result of all) {
    assert.deepEqual(result, [...CAPABILITY_ACTIONS], "a concurrent call disagreed");
  }
});
