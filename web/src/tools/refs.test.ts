/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import { loadToolRefs, toolListNote } from "./grants.ts";

type Rec = [string, string, unknown?, unknown?];
type Answer = (path: string, opts: unknown) => unknown;

function fake(answer: Answer): { records: Rec[]; client: ApiClient } {
  const records: Rec[] = [];
  const log = (method: string, path: string, body: unknown, opts: unknown): unknown => {
    const rec: Rec = [method, path];
    if (body !== undefined || opts !== undefined) rec.push(body);
    if (opts !== undefined) rec.push(opts);
    records.push(rec);
    return answer(path, opts);
  };
  const client = {
    get: async (path: string, opts?: unknown) => log("get", path, undefined, opts),
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

function blk(ref: unknown, bound: unknown): unknown {
  return {
    ref,
    def: { effect: "read" },
    bound,
    contentHash: "sha256:" + "a".repeat(64),
    importedAt: "2026-11-06T10:00:00.000000Z",
  };
}

function cursorOf(opts: unknown): unknown {
  return (opts as { query?: { cursor?: unknown } } | undefined)?.query?.cursor;
}

test("C-5d82c84b loadToolRefs is complete when the hundredth page ends the list and refuses unreadable answers", async () => {
  let n = 0;
  const { records, client } = fake(() => {
    n += 1;
    return { items: [blk(`acme.t${n}@1`, true)], next_cursor: n === 100 ? null : `c${n}` };
  });
  const list = await settled(loadToolRefs(client));
  assert.equal(records.length, 100);
  assert.equal(cursorOf(records[99]?.[3]), "c99");
  assert.deepEqual(list, {
    refs: Array.from({ length: 100 }, (_value, i) => `acme.t${i + 1}@1`),
    complete: true,
  });

  await invalid(loadToolRefs(fake(() => ({ items: [blk(5, true)], next_cursor: null })).client));
  await invalid(
    loadToolRefs(fake(() => ({ items: [blk("acme.t@1", "yes")], next_cursor: null })).client),
  );
  const failure = new ApiRequestError(500, "INTERNAL", "m");
  await assert.rejects(
    loadToolRefs(
      fake(() => {
        throw failure;
      }).client,
    ),
    (e: unknown) => e === failure,
  );
});

test("C-5d82c84b an empty tool list is complete and only a cut list carries the note", async () => {
  const { records, client } = fake(() => ({ items: [], next_cursor: null }));
  const list = await settled(loadToolRefs(client));
  assert.equal(records.length, 1);
  assert.deepEqual(list, { refs: [], complete: true });
  assert.equal(toolListNote({ refs: [], complete: true }), null);
  assert.equal(
    toolListNote({ refs: [], complete: false }),
    "Only the first 10,000 tools are listed.",
  );
});
