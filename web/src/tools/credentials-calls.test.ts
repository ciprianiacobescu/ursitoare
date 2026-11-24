/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import {
  loadServerCredential,
  rotateServerCredential,
  storeCredential,
  type CredentialDraft,
  type CredentialView,
} from "./credentials.ts";

type Rec = [string, string, unknown?, unknown?];
type Answer = (method: string, path: string, body: unknown, opts: unknown) => unknown;

function fake(answer: Answer): { records: Rec[]; client: ApiClient } {
  const records: Rec[] = [];
  const log = (method: string, path: string, body: unknown, opts: unknown): unknown => {
    const rec: Rec = [method, path];
    if (body !== undefined || opts !== undefined) rec.push(body);
    if (opts !== undefined) rec.push(opts);
    records.push(rec);
    return answer(method, path, body, opts);
  };
  const client = {
    get: async (path: string, opts?: unknown) => log("get", path, undefined, opts),
    post: async (path: string, body?: unknown, opts?: unknown) => log("post", path, body, opts),
  } as unknown as ApiClient;
  return { records, client };
}

async function settled<T>(p: Promise<T>): Promise<T> {
  await assert.doesNotReject(p);
  return await p;
}

async function invalid(p: Promise<unknown>): Promise<void> {
  await assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof ApiRequestError);
    assert.equal(e.status, 200);
    assert.equal(e.code, "INVALID_RESPONSE");
    return true;
  });
}

const BASE: CredentialView = {
  id: "cred_1",
  toolServerId: "crm",
  authScheme: "BEARER_TOKEN",
  headerName: null,
  keyVersion: 1,
};

function CV(over: Partial<CredentialView> = {}): CredentialView {
  return { ...BASE, ...over };
}

function CREC(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...CV(),
    serviceId: "svc_1",
    targetOrigin: "https://mcp.fake.test",
    provisionedBy: "u_carol",
    provisionedAt: "2026-11-09T10:00:00.000000Z",
    rotatedAt: null,
    ...over,
  };
}

function cursorOf(opts: unknown): unknown {
  return (opts as { query?: { cursor?: unknown } } | undefined)?.query?.cursor;
}

test("C-29e43442 loadServerCredential pages the list and resolves the first credential of the server", async () => {
  const { records, client } = fake((_method, _path, _body, opts) =>
    cursorOf(opts) === "c1"
      ? { items: [CREC({ value: "s3cr3t" })], next_cursor: "c2" }
      : { items: [CREC({ toolServerId: "shop", id: "cred_2" })], next_cursor: "c1" },
  );
  const view = await settled(loadServerCredential(client, "crm"));
  assert.deepEqual(view, CV());
  assert.ok(!JSON.stringify(view).includes("s3cr3t"), "the view does not hold the secret");
  assert.ok(!JSON.stringify(records).includes("s3cr3t"), "no record holds the secret");
  assert.deepEqual(records, [
    ["get", "/credentials", undefined, { query: { limit: 200 } }],
    ["get", "/credentials", undefined, { query: { limit: 200, cursor: "c1" } }],
  ]);
});

test("C-29e43442 loadServerCredential resolves null and refuses unreadable pages, a forbidden list and a bad id", async () => {
  const empty = fake(() => ({ items: [], next_cursor: null }));
  assert.equal(await settled(loadServerCredential(empty.client, "crm")), null);
  assert.equal(empty.records.length, 1);

  await invalid(
    loadServerCredential(fake(() => ({ items: [{ id: 5 }], next_cursor: null })).client, "crm"),
  );

  const forbidden = new ApiRequestError(403, "FORBIDDEN", "m");
  await assert.rejects(
    loadServerCredential(
      fake(() => {
        throw forbidden;
      }).client,
      "crm",
    ),
    (e: unknown) => e === forbidden,
  );

  let page = 0;
  const endless = fake(() => {
    page += 1;
    return {
      items: [CREC({ toolServerId: "shop", id: "cred_2" })],
      next_cursor: `c${page}`,
    };
  });
  await invalid(loadServerCredential(endless.client, "crm"));
  assert.equal(endless.records.length, 50);

  const none = fake(() => ({ items: [], next_cursor: null }));
  await assert.rejects(loadServerCredential(none.client, "a/b"), RangeError);
  assert.deepEqual(none.records, []);
});

const B1: Record<string, unknown> = {
  toolServerId: "crm",
  authScheme: "API_KEY_HEADER",
  headerName: "x-api-key",
  value: "k-1",
};

test("C-29e43442 storeCredential posts the body under the key and refuses a blank key, a non-object body and an unreadable answer", async () => {
  const store = fake(() => CREC({ authScheme: "API_KEY_HEADER", headerName: "x-api-key" }));
  assert.deepEqual(
    await settled(storeCredential(store.client, B1, "k-1")),
    CV({ authScheme: "API_KEY_HEADER", headerName: "x-api-key" }),
  );
  assert.deepEqual(store.records, [
    ["post", "/credentials", B1, { headers: { "Idempotency-Key": "k-1" } }],
  ]);

  const none = fake(() => CREC());
  for (const key of ["", "  "]) {
    await assert.rejects(storeCredential(none.client, B1, key), RangeError, key);
  }
  for (const body of [null, 5, "x"]) {
    await assert.rejects(storeCredential(none.client, body, "k-1"), RangeError);
  }
  assert.deepEqual(none.records, []);

  await invalid(storeCredential(fake(() => ({ id: 5 })).client, B1, "k-1"));
});

const ROT: CredentialDraft = {
  authScheme: "API_KEY_HEADER",
  headerName: "x-api-key",
  value: "n3w-secret",
};

test("C-29e43442 rotateServerCredential sends the value and scheme and refuses a bad id, a bad value and an unreadable answer", async () => {
  const rotate = fake(() => CREC({ keyVersion: 2 }));
  assert.deepEqual(
    await settled(rotateServerCredential(rotate.client, "cred_1", ROT)),
    CV({ keyVersion: 2 }),
  );
  assert.deepEqual(rotate.records, [
    [
      "post",
      "/credentials/cred_1/rotate",
      { value: "n3w-secret", authScheme: "API_KEY_HEADER", headerName: "x-api-key" },
    ],
  ]);

  const bearer = fake(() => CREC({ keyVersion: 2 }));
  await settled(
    rotateServerCredential(bearer.client, "cred_1", {
      authScheme: "BEARER_TOKEN",
      headerName: "ignored",
      value: "n3w-secret",
    }),
  );
  assert.deepEqual(bearer.records, [
    ["post", "/credentials/cred_1/rotate", { value: "n3w-secret", authScheme: "BEARER_TOKEN" }],
  ]);

  const none = fake(() => CREC({ keyVersion: 2 }));
  await assert.rejects(rotateServerCredential(none.client, "a/b", ROT), RangeError);
  await assert.rejects(
    rotateServerCredential(none.client, "cred_1", { ...ROT, headerName: "Authorization" }),
    RangeError,
  );
  for (const value of ["", "s3 cr3t"]) {
    await assert.rejects(
      rotateServerCredential(none.client, "cred_1", { ...ROT, value }),
      (e: unknown) => {
        assert.ok(e instanceof RangeError);
        assert.equal(e.message, "The secret value is not valid.");
        assert.ok(!e.message.includes("s3"), "no message holds the value");
        return true;
      },
      value,
    );
  }
  assert.deepEqual(none.records, []);

  await invalid(rotateServerCredential(fake(() => ({})).client, "cred_1", ROT));
});
