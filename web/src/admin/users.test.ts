/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import { featureLiterals, ADMIN_PAGES } from "./pages.ts";
import type { FeatureLiterals } from "./pages.ts";
import { accountAction, accountCells, parseAccount, patchAccountState } from "./users.ts";
import type { AccountAction, AccountCells, AccountRow } from "./users.ts";

assert.equal(typeof parseAccount, "function");

const BOB_BODY: Readonly<Record<string, unknown>> = {
  userId: "u_bob",
  kind: "human",
  ownerUserId: null,
  displayName: "Bob Example",
  email: "bob@example.test",
  state: "active",
  roles: ["author", "auditor"],
  teams: ["finance"],
  localRoles: ["auditor"],
};

const DISABLE_DESCRIPTION =
  "Bob Example can no longer sign in, and open sessions stop working while the account is disabled. Enabling it again restores the sessions that have not expired.";

const FEATURE_URL = new URL("../features/60-admin-users.tsx", import.meta.url);

function parsedAccount(raw: unknown, name: string): AccountRow {
  let result: AccountRow | null | undefined;
  assert.doesNotThrow(() => {
    result = parseAccount(raw);
  }, `${name} parses without throwing`);
  assert.ok(result !== null && result !== undefined, `${name} parses to an account`);
  return result as AccountRow;
}

function refusedAccount(raw: unknown, name: string): void {
  let result: AccountRow | null | undefined;
  assert.doesNotThrow(() => {
    result = parseAccount(raw);
  }, `${name} parses without throwing`);
  assert.equal(result, null, `${name} is refused`);
}

function cellsOf(account: AccountRow, name: string): AccountCells {
  let result: AccountCells | undefined;
  assert.doesNotThrow(() => {
    result = accountCells(account);
  }, `${name} builds cells without throwing`);
  assert.ok(result !== undefined, `${name} produced cells`);
  return result;
}

function actionOf(account: AccountRow, selfId: string | null, name: string): AccountAction {
  let result: AccountAction | undefined;
  assert.doesNotThrow(() => {
    result = accountAction(account, selfId);
  }, `${name} builds an action without throwing`);
  assert.ok(result !== undefined, `${name} produced an action`);
  return result;
}

interface PatchCall {
  readonly path: string;
  readonly body: unknown;
}

interface RecordingPatchClient {
  readonly client: Pick<ApiClient, "patch">;
  readonly calls: PatchCall[];
}

function recordingPatchClient(response: unknown): RecordingPatchClient {
  const calls: PatchCall[] = [];
  const client: Pick<ApiClient, "patch"> = {
    async patch<T>(path: string, body?: unknown, _opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, body });
      return response as T;
    },
  };
  return { client, calls };
}

async function patched(
  client: Pick<ApiClient, "patch">,
  userId: string,
  state: AccountRow["state"],
): Promise<AccountRow> {
  let result: AccountRow | undefined;
  await assert.doesNotReject(async () => {
    result = await patchAccountState(client, userId, state);
  }, "the state change resolves");
  assert.ok(result !== undefined, "the state change returned an account");
  return result;
}

test("C-97244065 parseAccount keeps a valid account and refuses malformed bodies", () => {
  const account = parsedAccount(BOB_BODY, "the Bob account");
  assert.deepEqual(
    account,
    {
      userId: "u_bob",
      kind: "human",
      displayName: "Bob Example",
      email: "bob@example.test",
      state: "active",
      roles: ["author", "auditor"],
      teams: ["finance"],
      localRoles: ["auditor"],
    },
    "the valid account is kept without the owner field",
  );

  refusedAccount({ ...BOB_BODY, state: "deleted" }, "a deleted state");
  refusedAccount({ ...BOB_BODY, userId: "../x" }, "a path-like user id");
  refusedAccount({ ...BOB_BODY, roles: "author" }, "a text roles field");
  refusedAccount({ ...BOB_BODY, teams: ["Finance"] }, "an upper case team");
  refusedAccount({ ...BOB_BODY, localRoles: [7] }, "a numeric local role");
  refusedAccount({ ...BOB_BODY, displayName: "x".repeat(201) }, "a 201 character display name");
  refusedAccount(null, "a null body");
});

test("C-87e93809 accountCells and accountAction describe active disabled empty and own rows", () => {
  const active = parsedAccount(BOB_BODY, "the active Bob account");
  assert.deepEqual(cellsOf(active, "the active Bob account"), {
    name: "Bob Example",
    email: "bob@example.test",
    state: "Active",
    rolesTeams: "author, auditor (direct) · finance",
  });

  const activeAction = actionOf(active, null, "the active Bob account");
  assert.equal(activeAction.kind, "disable", "an active account can be disabled");
  if (activeAction.kind === "disable") {
    assert.equal(activeAction.buttonLabel, "Disable Bob Example");
    assert.equal(activeAction.done, "Disabled Bob Example.");
    assert.deepEqual(activeAction.confirm, {
      title: "Disable Bob Example?",
      description: DISABLE_DESCRIPTION,
      action: "Disable user",
    });
  }

  const disabled = parsedAccount(
    { ...BOB_BODY, state: "disabled", roles: [], localRoles: [], teams: ["finance"] },
    "the disabled Bob account",
  );
  const disabledCells = cellsOf(disabled, "the disabled Bob account");
  assert.equal(disabledCells.state, "Disabled", "a disabled account says so");
  assert.equal(disabledCells.rolesTeams, "finance", "the disabled account keeps its team");

  const disabledAction = actionOf(disabled, null, "the disabled Bob account");
  assert.equal(disabledAction.kind, "enable", "a disabled account can be enabled");
  if (disabledAction.kind === "enable") {
    assert.equal(disabledAction.buttonLabel, "Enable Bob Example");
    assert.equal(disabledAction.confirm, null, "enabling needs no confirmation");
    assert.equal(disabledAction.done, "Enabled Bob Example.");
  }

  const empty = parsedAccount(
    { ...BOB_BODY, roles: [], localRoles: [], teams: [] },
    "the Bob account without roles or teams",
  );
  assert.equal(
    cellsOf(empty, "the Bob account without roles or teams").rolesTeams,
    "—",
    "no roles and no teams show a dash",
  );

  const own = actionOf(active, "u_bob", "the own account");
  assert.deepEqual(own, { kind: "none", note: "This is your account" }, "the own row is a note");
});

test("C-87e93809 a long display name and many roles are cut by clip", () => {
  const longName = "N".repeat(100);
  const named = parsedAccount({ ...BOB_BODY, displayName: longName }, "the 100 character name");
  assert.equal(
    cellsOf(named, "the 100 character name").name,
    `${"N".repeat(79)}…`,
    "the name cell is cut to eighty characters",
  );

  const roles = Array.from({ length: 100 }, (_, index) => `role${String(index).padStart(2, "0")}`);
  const manyRoles = parsedAccount({ ...BOB_BODY, roles, localRoles: [] }, "the hundred roles");
  const joined = roles.join(", ");
  const expected = `${joined.slice(0, 79)}…`;
  const rolesTeams = cellsOf(manyRoles, "the hundred roles").rolesTeams;
  assert.equal(rolesTeams, expected, "the roles cell is cut to eighty characters");
  assert.equal(rolesTeams.length, 80, "the cut cell is eighty characters long");
  assert.ok(rolesTeams.endsWith("…"), "the cut cell ends with an ellipsis");
});

test("C-87e93809 a blank display name falls back to the user id and a missing email shows a dash", () => {
  const blank = parsedAccount(
    { ...BOB_BODY, displayName: "   ", email: null },
    "the blank display name",
  );
  const cells = cellsOf(blank, "the blank display name");
  assert.equal(cells.name, "u_bob", "a blank display name falls back to the user id");
  assert.equal(cells.email, "—", "a missing email shows a dash");
});

test("C-0c16ec24 patchAccountState sends the state and rejects an unreadable account", async () => {
  const recording = recordingPatchClient({ ...BOB_BODY, state: "disabled" });
  const result = await patched(recording.client, "u_bob", "disabled");
  assert.equal(recording.calls.length, 1, "the client got one call");
  const call = recording.calls[0];
  assert.ok(call !== undefined, "the call was recorded");
  assert.equal(call.path, "/users/u_bob", "the user id is in the path");
  assert.deepEqual(call.body, { state: "disabled" }, "the body carries the state");
  assert.equal(result.state, "disabled", "the returned account has the new state");

  const unreadable = recordingPatchClient({});
  await assert.rejects(
    patchAccountState(unreadable.client, "u_bob", "disabled"),
    (error: unknown) =>
      error instanceof ApiRequestError &&
      error.code === "INVALID_RESPONSE" &&
      error.status === 200 &&
      error.message === "Invalid account",
    "an unreadable answer rejects with INVALID_RESPONSE",
  );
});

test("C-0c16ec24 patchAccountState refuses a path-like user id before sending", async () => {
  const recording = recordingPatchClient({ ...BOB_BODY, state: "disabled" });
  await assert.rejects(
    patchAccountState(recording.client, "../x", "disabled"),
    RangeError,
    "a path-like user id is refused",
  );
  assert.equal(recording.calls.length, 0, "nothing was sent");
});

test("C-bf07943b the admin users feature file declares its literal page entry", () => {
  assert.ok(existsSync(FEATURE_URL), `${FEATURE_URL.pathname} must exist`);
  const source = readFileSync(FEATURE_URL, "utf8");
  const entry = ADMIN_PAGES.find((page) => page.id === "admin-users");
  assert.ok(entry !== undefined, "the admin-users page is listed");
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
