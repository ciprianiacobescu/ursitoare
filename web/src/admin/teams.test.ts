/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import { ADMIN_PAGES, featureLiterals } from "./pages.ts";
import type { FeatureLiterals } from "./pages.ts";
import type { Check, ConfirmSpec } from "./shared.ts";
import {
  checkTeamId,
  deleteTeamConfirm,
  parseNamed,
  postTeam,
  removeTeamById,
} from "./teams.ts";

assert.equal(typeof checkTeamId, "function");

const DELETE_DESCRIPTION = "The team is removed. A team that is still in use is refused.";
const TEAM_PATTERN_MESSAGE =
  "Use a lower-case letter first, then lower-case letters, digits, hyphens or underscores (up to 64 characters).";
const FEATURE_URL = new URL("../features/61-admin-roles-teams.tsx", import.meta.url);

function named(raw: unknown, key: "roleId" | "teamId", label: string): string | null {
  let result: string | null | undefined;
  assert.doesNotThrow(() => {
    result = parseNamed(raw, key);
  }, `${label} parses without throwing`);
  assert.ok(result !== undefined, `${label} returned a value`);
  return result as string | null;
}

function checked(text: string, label: string): Check<string> {
  let result: Check<string> | undefined;
  assert.doesNotThrow(() => {
    result = checkTeamId(text);
  }, `${label} is checked without throwing`);
  assert.ok(result !== undefined, `${label} returned a check`);
  return result;
}

function confirmation(teamId: string, label: string): ConfirmSpec {
  let result: ConfirmSpec | undefined;
  assert.doesNotThrow(() => {
    result = deleteTeamConfirm(teamId);
  }, `${label} builds a confirmation without throwing`);
  assert.ok(result !== undefined, `${label} returned a confirmation`);
  return result;
}

interface PostCall {
  readonly path: string;
  readonly body: unknown;
  readonly opts: unknown;
}

interface RecordingPostClient {
  readonly client: Pick<ApiClient, "post">;
  readonly calls: PostCall[];
}

function recordingPostClient(response: unknown): RecordingPostClient {
  const calls: PostCall[] = [];
  const client: Pick<ApiClient, "post"> = {
    async post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, body, opts });
      return response as T;
    },
  };
  return { client, calls };
}

interface DeleteCall {
  readonly path: string;
  readonly opts: unknown;
}

interface RecordingDeleteClient {
  readonly client: Pick<ApiClient, "delete">;
  readonly calls: DeleteCall[];
}

function recordingDeleteClient(): RecordingDeleteClient {
  const calls: DeleteCall[] = [];
  const client: Pick<ApiClient, "delete"> = {
    async delete<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      return undefined as T;
    },
  };
  return { client, calls };
}

async function created(
  client: Pick<ApiClient, "post">,
  teamId: string,
  key: string,
): Promise<string> {
  let result: string | undefined;
  await assert.doesNotReject(async () => {
    result = await postTeam(client, teamId, key);
  }, "creating a team resolves");
  assert.ok(result !== undefined, "creating a team returned its id");
  return result;
}

test("C-4bc159f4 parseNamed reads a role or team id and refuses a malformed one", () => {
  assert.equal(named({ roleId: "tenant_admin" }, "roleId", "a role"), "tenant_admin");
  assert.equal(named({ roleId: "Tenant" }, "roleId", "an upper case role"), null);
  assert.equal(named({ teamId: "finance" }, "teamId", "a team"), "finance");
  assert.equal(named({ teamId: "Finance" }, "teamId", "an upper case team"), null);
  assert.equal(named({ roleId: "tenant_admin" }, "teamId", "a body without the asked key"), null);
});

test("C-4bc159f4 checkTeamId trims a name and explains what a team id may be", () => {
  assert.deepEqual(checked(" ops ", "a padded team name"), { ok: true, value: "ops" });
  assert.deepEqual(checked("", "the empty team name"), {
    ok: false,
    message: "Enter a team name.",
  });
  const upper = checked("Ops", "an upper case team name");
  assert.equal(upper.ok, false, "an upper case team name is refused");
  if (!upper.ok) {
    assert.equal(upper.message, TEAM_PATTERN_MESSAGE);
  }
});

test("C-c174064a postTeam sends a keyed create and reads the returned id", async () => {
  const recording = recordingPostClient({ teamId: "ops" });
  const result = await created(recording.client, "ops", "key-1");
  assert.equal(result, "ops", "the created team id is returned");
  assert.equal(recording.calls.length, 1, "the client got one call");
  const call = recording.calls[0];
  assert.ok(call !== undefined, "the call was recorded");
  assert.equal(call.path, "/teams", "the create posts to the teams path");
  assert.deepEqual(call.body, { teamId: "ops" }, "the body carries the team id");
  assert.deepEqual(
    call.opts,
    { headers: { "Idempotency-Key": "key-1" } },
    "the idempotency key travels as a header",
  );

  const unreadable = recordingPostClient({});
  await assert.rejects(
    postTeam(unreadable.client, "ops", "key-1"),
    (error: unknown) =>
      error instanceof ApiRequestError &&
      error.code === "INVALID_RESPONSE" &&
      error.status === 200 &&
      error.message === "Invalid team",
    "an unreadable answer rejects with INVALID_RESPONSE",
  );
});

test("C-c174064a postTeam refuses a bad team or key before sending", async () => {
  const badTeam = recordingPostClient({ teamId: "ops" });
  await assert.rejects(
    postTeam(badTeam.client, "Ops", "key-1"),
    RangeError,
    "an upper case team is refused",
  );
  assert.equal(badTeam.calls.length, 0, "nothing was sent for the bad team");

  const badKey = recordingPostClient({ teamId: "ops" });
  await assert.rejects(
    postTeam(badKey.client, "ops", "key with space"),
    RangeError,
    "a key with a space is refused",
  );
  assert.equal(badKey.calls.length, 0, "nothing was sent for the bad key");
});

test("C-c174064a removeTeamById deletes the encoded team path", async () => {
  const recording = recordingDeleteClient();
  let result: unknown = "not called";
  await assert.doesNotReject(async () => {
    result = await removeTeamById(recording.client, "ops");
  }, "deleting a team resolves");
  assert.equal(result, undefined, "deleting a team resolves to undefined");
  assert.equal(recording.calls.length, 1, "the client got one call");
  const call = recording.calls[0];
  assert.ok(call !== undefined, "the call was recorded");
  assert.equal(call.path, "/teams/ops", "the team id is in the path");
  assert.equal(call.opts, undefined, "the delete carries no body or headers");
});

test("C-c174064a removeTeamById refuses a path-like team before sending", async () => {
  const recording = recordingDeleteClient();
  await assert.rejects(
    removeTeamById(recording.client, "../x"),
    RangeError,
    "a path-like team id is refused",
  );
  assert.equal(recording.calls.length, 0, "nothing was sent");
});

test("C-c174064a deleteTeamConfirm names the team and its consequence", () => {
  assert.deepEqual(confirmation("ops", "the ops team"), {
    title: "Delete team ops?",
    description: DELETE_DESCRIPTION,
    action: "Delete team",
  });
});

test("C-bf07943b the roles and teams feature file declares its literal page entry", () => {
  assert.ok(existsSync(FEATURE_URL), `${FEATURE_URL.pathname} must exist`);
  const source = readFileSync(FEATURE_URL, "utf8");
  const entry = ADMIN_PAGES.find((page) => page.id === "admin-roles-teams");
  assert.ok(entry !== undefined, "the admin-roles-teams page is listed");
  const expected: FeatureLiterals = {
    id: entry.id,
    path: entry.path,
    navLabel: entry.navLabel,
    capability: entry.capability,
  };

  let literal: FeatureLiterals | null | undefined;
  assert.doesNotThrow(() => {
    literal = featureLiterals(source);
  }, "the feature file literals are read");
  assert.deepEqual(literal, expected, "the feature file declares its page entry without the file");
});
