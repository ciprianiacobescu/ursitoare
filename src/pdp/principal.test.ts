import assert from "node:assert/strict";
import { test } from "node:test";

import { isPrincipalEntity, scopedId, tenantEntity, userEntity } from "./principal.ts";
import type { PrincipalEntity } from "./principal.ts";
import { entityRef } from "./values.ts";

const ALICE: PrincipalEntity = {
  tenantId: "tenant_a",
  userId: "alice",
  kind: "human",
  roles: ["author", "approver", "author"],
  teams: ["finance"],
};

function callUserEntity(p: PrincipalEntity, label: string): unknown {
  let result: unknown;
  assert.doesNotThrow(() => {
    result = userEntity(p);
  }, label);
  return result;
}

function callIsPrincipal(value: unknown, label: string): unknown {
  let result: unknown;
  assert.doesNotThrow(() => {
    result = isPrincipalEntity(value);
  }, label);
  return result;
}

function principalWith(overrides: Record<string, unknown>): PrincipalEntity {
  return { ...ALICE, ...overrides } as unknown as PrincipalEntity;
}

test("C-c6e0af1b a user entity", () => {
  const user = callUserEntity(ALICE, "userEntity(alice)");
  assert.deepEqual(user, {
    uid: { type: "User", id: "tenant_a/alice" },
    attrs: {
      tenant: "tenant_a",
      kind: "human",
      roles: [entityRef("Role", "approver"), entityRef("Role", "author")],
      teams: [entityRef("Team", "tenant_a/finance")],
    },
    parents: [
      { type: "Role", id: "approver" },
      { type: "Role", id: "author" },
      { type: "Team", id: "tenant_a/finance" },
    ],
  });
});

test("C-7406a453 a tenant entity and a scoped id", () => {
  let tenant: unknown;
  let scoped: unknown;
  assert.doesNotThrow(() => {
    tenant = tenantEntity("tenant_a");
  }, "tenantEntity");
  assert.doesNotThrow(() => {
    scoped = scopedId("tenant_a", "x");
  }, "scopedId");
  assert.deepEqual(tenant, {
    uid: { type: "Tenant", id: "tenant_a" },
    attrs: { tenant: "tenant_a" },
    parents: [],
  });
  assert.equal(scoped, "tenant_a/x");
});

test("C-7406a453 a scoped id keeps tenant first", () => {
  let scoped: unknown;
  assert.doesNotThrow(() => {
    scoped = scopedId("tenant_b", "local_1");
  }, "scopedId");
  assert.ok(typeof scoped === "string");
  assert.ok((scoped as string).startsWith("tenant_b/"), "the tenant id comes first");
  assert.deepEqual((scoped as string).slice("tenant_b/".length), "local_1");
});

test("C-44bafaf9 principal validation", () => {
  assert.equal(callIsPrincipal(ALICE, "alice"), true, "alice is accepted");

  const invalids: { value: unknown; label: string }[] = [
    { value: principalWith({ tenantId: "bad tenant!" }), label: "tenantId with a space" },
    { value: principalWith({ userId: "" }), label: "empty userId" },
    { value: principalWith({ userId: "a".repeat(129) }), label: "129-character userId" },
    { value: principalWith({ userId: "alice\u0000" }), label: "userId holding NUL" },
    { value: principalWith({ kind: "robot" }), label: "kind robot" },
    {
      value: principalWith({ roles: Array.from({ length: 65 }, () => "author") }),
      label: "65 roles",
    },
    { value: principalWith({ roles: ["", "author"] }), label: "an empty role" },
    { value: principalWith({ teams: "x" }), label: "teams is not an array" },
    {
      value: (() => {
        const p: Record<string, unknown> = { ...ALICE };
        Object.defineProperty(p, "roles", {
          get(): never {
            throw new Error("roles getter");
          },
        });
        return p;
      })(),
      label: "a roles getter that throws",
    },
    { value: null, label: "null" },
    { value: "alice", label: "the string alice" },
  ];
  for (const { value, label } of invalids) {
    assert.equal(callIsPrincipal(value, label), false, label);
  }
});
