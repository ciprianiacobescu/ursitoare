/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import { loadMyTeams, parseMyTeams, parsePeople, personLabel } from "./people.ts";
import type { PersonName } from "./people.ts";

assert.equal(typeof parsePeople, "function");
assert.equal(typeof parseMyTeams, "function");
assert.equal(typeof personLabel, "function");
assert.equal(typeof loadMyTeams, "function");

function parsedPeople(raw: unknown): PersonName[] | null {
  let value: PersonName[] | null | undefined;
  assert.doesNotThrow(() => {
    value = parsePeople(raw);
  }, "parsePeople returns an answer");
  assert.ok(value !== undefined, "parsePeople returned an answer");
  return value as PersonName[] | null;
}

function parsedTeams(raw: unknown): string[] | null {
  let value: string[] | null | undefined;
  assert.doesNotThrow(() => {
    value = parseMyTeams(raw);
  }, "parseMyTeams returns an answer");
  assert.ok(value !== undefined, "parseMyTeams returned an answer");
  return value as string[] | null;
}

function labelOf(names: ReadonlyMap<string, string>, userId: string): string {
  let value: string | undefined;
  assert.doesNotThrow(() => {
    value = personLabel(names, userId);
  }, "personLabel returns an answer");
  assert.ok(value !== undefined, "personLabel returned an answer");
  return value as string;
}

interface GetCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

type GetAnswer = (
  path: string,
  opts: Omit<RequestOptions, "body"> | undefined,
) => Promise<unknown>;

interface RecordingGet {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: GetCall[];
}

function recordingGet(answer: GetAnswer): RecordingGet {
  const calls: GetCall[] = [];
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      return (await answer(path, opts)) as T;
    },
  };
  return { client, calls };
}

async function loadedTeams(
  client: Pick<ApiClient, "get">,
  signal?: AbortSignal,
): Promise<string[]> {
  let value: string[] | undefined;
  await assert.doesNotReject(async () => {
    value = await loadMyTeams(client, signal);
  }, "loadMyTeams resolves");
  assert.ok(value !== undefined, "loadMyTeams returned teams");
  return value as string[];
}

test("C-20c4fd10 parsePeople keeps valid bodies and drops extra members", () => {
  assert.deepEqual(
    parsedPeople({
      items: [
        { userId: "u_carol", displayName: "Carol Example", kind: "human" },
        { userId: "svc_ci", displayName: "CI bot", kind: "service", email: "x" },
      ],
    }),
    [
      { userId: "u_carol", displayName: "Carol Example", kind: "human" },
      { userId: "svc_ci", displayName: "CI bot", kind: "service" },
    ],
    "the two items keep only the three keys",
  );
  assert.deepEqual(parsedPeople({ items: [] }), [], "an empty list is kept");
  assert.deepEqual(
    parsedPeople({ items: [{ userId: "u1", displayName: "\u00a0", kind: "human" }] }),
    [{ userId: "u1", displayName: "\u00a0", kind: "human" }],
    "a name of one non-breaking space is kept",
  );
});

test("C-20c4fd10 parsePeople refuses malformed people bodies", () => {
  const good = { userId: "u1", displayName: "A", kind: "human" };
  const rows: readonly { readonly label: string; readonly body: unknown }[] = [
    { label: "null", body: null },
    { label: "an array", body: [] },
    { label: "no items", body: {} },
    { label: "items that are not an array", body: { items: "x" } },
    { label: "a null item", body: { items: [null] } },
    { label: "a userId with a space", body: { ...good, userId: "a b" } },
    { label: "an empty userId", body: { ...good, userId: "" } },
    { label: "a 65-character userId", body: { ...good, userId: "x".repeat(65) } },
    { label: "an empty displayName", body: { ...good, displayName: "" } },
    { label: "a numeric displayName", body: { ...good, displayName: 7 } },
    { label: "an unknown kind", body: { ...good, kind: "robot" } },
    { label: "a missing kind", body: { userId: "u1", displayName: "A" } },
    {
      label: "a later numeric kind",
      body: { items: [good, { ...good, kind: 1 }] },
    },
  ];

  for (const row of rows) {
    assert.equal(parsedPeople(row.body), null, `${row.label} gives null`);
  }
});

test("C-20c4fd10 parseMyTeams keeps valid bodies and deduplicates ids", () => {
  assert.deepEqual(
    parsedTeams({
      items: [{ id: "finance" }, { id: "audit" }, { id: "finance" }],
      next_cursor: null,
    }),
    ["finance", "audit"],
    "a repeated team is kept once",
  );
  assert.deepEqual(parsedTeams({ items: [] }), [], "an empty list is kept");
});

test("C-20c4fd10 parseMyTeams refuses malformed team bodies", () => {
  const rows: readonly { readonly label: string; readonly body: unknown }[] = [
    { label: "null", body: null },
    { label: "items that are not an array", body: { items: {} } },
    { label: "an upper-case id", body: { items: [{ id: "Finance" }] } },
    { label: "an empty id", body: { items: [{ id: "" }] } },
    { label: "a 65-character id", body: { items: [{ id: "a".repeat(65) }] } },
    { label: "an item without an id", body: { items: [{}] } },
    { label: "a null item", body: { items: [null] } },
  ];

  for (const row of rows) {
    assert.equal(parsedTeams(row.body), null, `${row.label} gives null`);
  }
});

test("C-20c4fd10 personLabel trims a name and falls back to the id", () => {
  const names = new Map([
    ["u_carol", "  Carol Example "],
    ["u_b", "   "],
    ["u_c", ""],
  ]);

  assert.equal(labelOf(names, "u_carol"), "Carol Example", "the name is trimmed");
  assert.equal(labelOf(names, "u_zed"), "u_zed", "an unknown id is its own label");
  assert.equal(labelOf(names, "u_b"), "u_b", "a blank name falls back to the id");
  assert.equal(labelOf(names, "u_c"), "u_c", "an empty name falls back to the id");
});

test("C-20c4fd10 loadMyTeams asks me teams and returns their ids", async () => {
  const body = { items: [{ id: "finance" }], next_cursor: null };

  const withoutSignal = recordingGet(async () => body);
  assert.deepEqual(await loadedTeams(withoutSignal.client), ["finance"], "the ids are returned");
  assert.deepEqual(
    withoutSignal.calls,
    [{ path: "/me/teams", opts: undefined }],
    "no signal means no second argument",
  );

  const controller = new AbortController();
  const withSignal = recordingGet(async () => body);
  assert.deepEqual(
    await loadedTeams(withSignal.client, controller.signal),
    ["finance"],
    "the ids are returned with a signal",
  );
  assert.deepEqual(
    withSignal.calls,
    [{ path: "/me/teams", opts: { signal: controller.signal } }],
    "a signal is passed through",
  );
});

test("C-20c4fd10 loadMyTeams answers empty for every failure", async () => {
  const failures: readonly { readonly label: string; readonly failure: unknown }[] = [
    {
      label: "a 401",
      failure: new ApiRequestError(401, "UNAUTHENTICATED", "x"),
    },
    {
      label: "a 500",
      failure: new ApiRequestError(500, "INTERNAL", "x"),
    },
    { label: "a network error", failure: new TypeError("x") },
    { label: "a malformed body", failure: { items: [{ id: "Bad" }] } },
  ];

  for (const row of failures) {
    const fake = recordingGet(async () => {
      if (row.failure instanceof Error) {
        throw row.failure;
      }
      return row.failure;
    });

    assert.deepEqual(
      await loadedTeams(fake.client),
      [],
      `loadMyTeams answers empty for ${row.label}`,
    );
    assert.deepEqual(
      fake.calls,
      [{ path: "/me/teams", opts: undefined }],
      `loadMyTeams asks once for ${row.label}`,
    );
  }
});

test("C-20c4fd10 loadMyTeams rejects an abort with AbortError", async () => {
  const fake = recordingGet(async () => {
    throw new DOMException("aborted", "AbortError");
  });

  await assert.rejects(
    async () => loadMyTeams(fake.client),
    (error: unknown) => {
      assert.equal((error as { name?: unknown }).name, "AbortError", "the abort keeps its name");
      return true;
    },
  );
});
