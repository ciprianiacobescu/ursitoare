import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import type { LogDestination, Logger } from "../observability/index.ts";
import { createPdp, entityRef } from "./index.ts";
import type { PolicyRequest, PolicySource } from "./types.ts";

const SCHEMA = `entity Role;
entity User in [Role];
entity Tool { effect: String };
entity Doc { owner: User, locked: Bool };
action read, write, send appliesTo {
  principal: User, resource: Doc, context: { n: Long, tool: Tool, amount?: decimal } };
`;

const PLATFORM: PolicySource = {
  id: "platform.cedar",
  layer: "platform",
  text: '@id("p-forbid-locked") forbid (principal, action, resource) when { resource.locked };',
};

const TENANT: PolicySource = {
  id: "tenant.cedar",
  layer: "tenant",
  text: `@id("t-read-own") permit (principal, action == Action::"read", resource) when { resource.owner == principal };
@id("t-write-admin") permit (principal in Role::"admin", action == Action::"write", resource);
@id("t-send-tool") permit (principal, action == Action::"send", resource) when { context.tool.effect == "send" };
@id("t-forbid-big") forbid (principal, action == Action::"write", resource) when { context.n * 9223372036854775807 > 100 };`,
};

const TEST_SET: readonly PolicySource[] = [PLATFORM, TENANT];

const CLOCK = fixedClock("2026-10-25T09:00:00Z");

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
  return { logger: createLogger({ level: "warn", destination, clock: CLOCK }), lines };
}

function makePdp(opts: {
  policies: readonly PolicySource[];
  clock?: Clock;
  ids?: IdSource;
  logger?: Logger;
}) {
  return createPdp({
    schema: SCHEMA,
    policies: [...opts.policies],
    clock: opts.clock ?? CLOCK,
    ids: opts.ids ?? sequentialIds(),
    logger: opts.logger ?? silentLogger(),
  });
}

function baseRequest(): PolicyRequest {
  return {
    principal: { type: "User", id: "alice" },
    action: "read",
    resource: { type: "Doc", id: "d1" },
    context: { n: 0, tool: entityRef("Tool", "mail") },
    entities: [
      { uid: { type: "User", id: "alice" }, attrs: {}, parents: [{ type: "Role", id: "admin" }] },
      {
        uid: { type: "Doc", id: "d1" },
        attrs: { owner: entityRef("User", "alice"), locked: false },
        parents: [],
      },
      { uid: { type: "Tool", id: "mail" }, attrs: { effect: "send" }, parents: [] },
    ],
  };
}

function writeRequest(n: number, toolEffect = "send"): PolicyRequest {
  const request = baseRequest();
  request.action = "write";
  request.context = { n, tool: entityRef("Tool", "mail") };
  request.entities = request.entities.map((entity) =>
    entity.uid.type === "Tool" ? { ...entity, attrs: { ...entity.attrs, effect: toolEffect } } : entity,
  );
  return request;
}

test("C-e2ed1aed an empty set loads and denies everything", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp({ policies: [] });
    const decision = await pdp.check(baseRequest());
    assert.equal(decision.decision, "deny");
    assert.deepEqual(decision.reasons, []);
    assert.deepEqual(decision.errors, []);
  });
});

test("C-e4b4b8c8 a failing dependency rejects", async () => {
  const failure = new Error("ids are down");
  const ids: IdSource = {
    next(): string {
      throw failure;
    },
  };
  const pdp = await makePdp({ policies: TEST_SET, ids });
  await assert.rejects(pdp.check(baseRequest()), (error: unknown) => {
    assert.equal(error, failure);
    return true;
  });
});

test("C-be9c698f ids and time", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp({ policies: TEST_SET });
    const first = await pdp.check(baseRequest());
    const second = await pdp.check(baseRequest());

    assert.equal(first.decisionId, "dec_00000000-0000-7000-8000-000000000000");
    assert.equal(second.decisionId, "dec_00000000-0000-7000-8000-000000000001");
    assert.equal(first.decidedAt, "2026-10-25T09:00:00.000Z");
    assert.equal(second.decidedAt, "2026-10-25T09:00:00.000Z");
    assert.equal(first.policySetVersion, pdp.policySetVersion);
    assert.equal(second.policySetVersion, pdp.policySetVersion);
    assert.equal(first.decision, "allow");
    assert.equal(second.decision, first.decision);
    assert.deepEqual(first.reasons, ["t-read-own"]);
    assert.deepEqual(second.reasons, first.reasons);
    assert.deepEqual(second.errors, first.errors);
  });
});

test("C-e5a037ca allow forbid and default deny", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp({ policies: TEST_SET });

    const allowed = await pdp.check(baseRequest());
    assert.equal(allowed.decision, "allow");
    assert.deepEqual(allowed.reasons, ["t-read-own"]);

    const locked = baseRequest();
    locked.entities = locked.entities.map((entity) =>
      entity.uid.type === "Doc"
        ? { ...entity, attrs: { ...entity.attrs, locked: true } }
        : entity,
    );
    const forbidden = await pdp.check(locked);
    assert.equal(forbidden.decision, "deny");
    assert.deepEqual(forbidden.reasons, ["p-forbid-locked"]);

    const bob = baseRequest();
    bob.principal = { type: "User", id: "bob" };
    bob.entities = [
      ...bob.entities,
      { uid: { type: "User", id: "bob" }, attrs: {}, parents: [] },
    ];
    const ownerOnly = await pdp.check(bob);
    assert.equal(ownerOnly.decision, "deny");
    assert.deepEqual(ownerOnly.reasons, []);
  });
});

test("C-1642bb70 reasons are sorted", async () => {
  await assert.doesNotReject(async () => {
    const source: PolicySource = {
      id: "sorted.cedar",
      layer: "tenant",
      text: `@id("z-1") permit (principal, action == Action::"read", resource);
@id("a-1") permit (principal, action == Action::"read", resource);`,
    };
    const pdp = await makePdp({ policies: [source] });
    const decision = await pdp.check(baseRequest());
    assert.equal(decision.decision, "allow");
    assert.deepEqual(decision.reasons, ["a-1", "z-1"]);
  });
});

test("C-cd08f435 the deny-on-error log line", async () => {
  const { logger, lines } = capturingLogger();
  await assert.doesNotReject(async () => {
    const pdp = await makePdp({ policies: TEST_SET, logger });
    const decision = await pdp.check(writeRequest(2, "ZZ-CTX-MARKER"));
    assert.equal(decision.decision, "deny");

    const records = lines.map((line) => JSON.parse(line) as Record<string, unknown>);
    const denials = records.filter((record) => record["msg"] === "pdp deny on error");
    assert.equal(denials.length, 1);
    const denial = denials[0];
    assert.ok(denial !== undefined);
    assert.equal(denial["level"], 40);
    assert.deepEqual(denial["errors"], ["PDP_EVALUATION_ERROR:t-forbid-big"]);
    assert.equal(denial["decisionId"], decision.decisionId);
    assert.ok(!lines.some((line) => line.includes("ZZ-CTX-MARKER")));
  });
});

test("C-984b894c concurrent checks", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp({ policies: TEST_SET });
    const decisions = await Promise.all(
      Array.from({ length: 50 }, () => pdp.check(baseRequest())),
    );
    for (const decision of decisions) {
      assert.equal(decision.decision, "allow");
      assert.deepEqual(decision.reasons, ["t-read-own"]);
    }
    assert.equal(new Set(decisions.map((decision) => decision.decisionId)).size, 50);
  });
});
