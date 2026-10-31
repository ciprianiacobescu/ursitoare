/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiClient, RequestOptions } from "../api/client.ts";
import type { ConfirmSpec } from "./shared.ts";
import { removeMapping, removeMappingConfirm } from "./mappings.ts";
import type { MappingRow } from "./mappings.ts";
import { clip } from "./shared.ts";

assert.equal(typeof removeMappingConfirm, "function");

const ISSUE_DESCRIPTION = "Members of this group lose the role author at once.";
const TEAM_DESCRIPTION = "Members of this group lose the team finance at once.";
const ADMIN_DESCRIPTION =
  "Members of this group lose the role tenant_admin at once. " +
  "This is an administrator role: if no other group maps to it, nobody can manage users " +
  "until an operator maps one again from the command line.";
const TITLE_PREFIX = "Remove the mapping for ";

function mapping(overrides: Partial<MappingRow>): MappingRow {
  return {
    issuer: "https://idp.example/realms/u",
    group: "ursitoare-authors",
    roleId: "author",
    teamId: null,
    reviewedBy: "operator:e2e-seed",
    ...overrides,
  };
}

function confirm(m: MappingRow, label: string): ConfirmSpec {
  let result: ConfirmSpec | undefined;
  assert.doesNotThrow(() => {
    result = removeMappingConfirm(m);
  }, `${label} builds the confirmation without throwing`);
  assert.ok(result !== undefined, `${label} produced a confirmation`);
  return result;
}

interface DeleteCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
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

test("C-8a1094e4 removeMappingConfirm states the role a group loses", () => {
  const spec = confirm(mapping({}), "the role mapping confirmation");
  assert.equal(spec.title, `${TITLE_PREFIX}ursitoare-authors?`, "the title names the group");
  assert.equal(spec.action, "Remove mapping", "the action is Remove mapping");
  assert.equal(
    spec.description,
    ISSUE_DESCRIPTION,
    "the description states the role the group loses",
  );
});

test("C-8a1094e4 removeMappingConfirm states the team a group loses", () => {
  const spec = confirm(
    mapping({ roleId: null, teamId: "finance", group: "team-finance" }),
    "the team mapping confirmation",
  );
  assert.equal(spec.title, `${TITLE_PREFIX}team-finance?`, "the title names the group");
  assert.equal(spec.action, "Remove mapping", "the action is Remove mapping");
  assert.equal(
    spec.description,
    TEAM_DESCRIPTION,
    "the description ends with the team the group loses",
  );
});

test("C-8a1094e4 removeMappingConfirm warns for the administrator role", () => {
  const spec = confirm(
    mapping({ roleId: "tenant_admin", group: "ursitoare-admins" }),
    "the administrator mapping confirmation",
  );
  assert.equal(spec.title, `${TITLE_PREFIX}ursitoare-admins?`, "the title names the group");
  assert.equal(spec.action, "Remove mapping", "the action is Remove mapping");
  assert.equal(spec.description, ADMIN_DESCRIPTION, "the description carries the warning");
  assert.ok(
    spec.description.includes("nobody can manage users"),
    "the warning says nobody can manage users",
  );
});

test("C-8a1094e4 removeMappingConfirm cuts a long group name in the title", () => {
  const longGroup = "g".repeat(100);
  const spec = confirm(mapping({ group: longGroup }), "the long group confirmation");
  assert.equal(
    spec.title,
    `${TITLE_PREFIX}${clip(longGroup)}?`,
    "the title holds the group cut by clip",
  );
  assert.ok(spec.title.length < 130, "the title stays short enough for a dialog");
});

test("C-8a1094e4 removeMapping deletes by issuer and group on the group map path", async () => {
  const recording = recordingDeleteClient();
  let result: unknown;
  await assert.doesNotReject(async () => {
    result = await removeMapping(recording.client, {
      issuer: "https://idp.example/realms/u",
      group: "ursitoare-authors",
    });
  }, "removing a mapping resolves");
  assert.equal(result, undefined, "removing a mapping resolves to undefined");
  assert.equal(recording.calls.length, 1, "the client got one call");
  const call = recording.calls[0];
  assert.ok(call !== undefined, "the call was recorded");
  assert.equal(call.path, "/idp-group-map", "the mapping is removed on the group map path");
  assert.deepEqual(call.opts, { query: { issuer: "https://idp.example/realms/u", group: "ursitoare-authors" } }, "the call carries the issuer and group in the query");
});
