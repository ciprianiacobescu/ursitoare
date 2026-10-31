import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { ApiRequestError } from "../../web/src/api/client.ts";
import type { ApiClient } from "../../web/src/api/client.ts";
import { adminErrorMessage } from "../../web/src/admin/messages.ts";
import { auditFetcher, loadVerification, verificationView } from "../../web/src/admin/audit.ts";
import {
  defaultIssuer,
  loadAllItems,
  parseGroupMapping,
  removeMapping,
  setMapping,
} from "../../web/src/admin/mappings.ts";
import { parseNamed, postTeam, removeTeamById } from "../../web/src/admin/teams.ts";
import { parseAccount, patchAccountState } from "../../web/src/admin/users.ts";
import { cursorPageFetcher } from "../../web/src/kit/data/page-fetcher.ts";
import { errorPanelModel } from "../../web/src/kit/error-panel.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";
import { startE2eStack } from "../support/e2e-stack/stack.ts";
import { sessionClient, signInAs } from "./session.ts";
import type { TestSession } from "./session.ts";

assert.equal(typeof signInAs, "function");

let stack: E2eStack | undefined;

before(async () => {
  stack = await startE2eStack({ port: 0, controlPort: 0 });
  assert.ok(stack.handles.has("rbac"));
});

after(async () => {
  await stack?.close();
});

function running(): E2eStack {
  assert.ok(stack !== undefined);
  return stack;
}

async function signedIn(username: string): Promise<{ session: TestSession; client: ApiClient }> {
  const current = running();
  let session: TestSession | undefined;
  await assert.doesNotReject(async () => {
    session = await signInAs(current, username);
  });
  assert.ok(session !== undefined);
  assert.ok(session.cookie.length > 0);
  assert.ok(session.csrfToken.length > 0);
  assert.ok(session.userId.length > 0);
  let client: ApiClient | undefined;
  assert.doesNotThrow(() => {
    client = sessionClient(current, session as TestSession);
  });
  assert.ok(client !== undefined);
  return { session, client };
}

async function rejection(promise: Promise<unknown>): Promise<ApiRequestError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  assert.ok(error instanceof ApiRequestError);
  return error;
}

test("C-dd02e61e carol manages mappings and teams and reads the log", async () => {
  const { client } = await signedIn("carol");

  const roles = await loadAllItems(
    cursorPageFetcher(client, "/roles", { parseItem: (raw) => parseNamed(raw, "roleId") }),
  );
  assert.deepEqual(roles, ["approver", "auditor", "author", "tenant_admin"]);
  const teams = await loadAllItems(
    cursorPageFetcher(client, "/teams", { parseItem: (raw) => parseNamed(raw, "teamId") }),
  );
  assert.deepEqual(teams, ["finance"]);
  const mappings = await loadAllItems(
    cursorPageFetcher(client, "/idp-group-map", { parseItem: parseGroupMapping }),
  );
  assert.equal(mappings.length, 4);

  const issuer = defaultIssuer(mappings);
  assert.notEqual(issuer, "");
  const mapped = await setMapping(client, { issuer, group: "ursitoare-auditors", roleId: "auditor" });
  assert.equal(mapped.roleId, "auditor");

  assert.equal(await postTeam(client, "ops", "k-1"), "ops");
  assert.equal(await postTeam(client, "ops", "k-1"), "ops");
  assert.equal((await rejection(postTeam(client, "ops", "k-2"))).code, "ALREADY_EXISTS");
  assert.equal(await removeTeamById(client, "ops"), undefined);
  assert.equal((await rejection(removeTeamById(client, "finance"))).code, "IN_USE");

  const events = await auditFetcher(client, "identity.group_mapped")({
    cursor: null,
    limit: 25,
    signal: new AbortController().signal,
  });
  assert.ok(events.items.some((item) => item.payload["group"] === "ursitoare-auditors"));

  const verification = await loadVerification(client);
  assert.equal(verification.ok, true);
  assert.equal(verification.anchorsChecked, false);
  assert.equal(verification.anchorsVerified, 0);
  assert.ok(verification.checked >= 1);
  const view = verificationView({ status: "done", result: verification });
  assert.equal(view.headline, "Audit chain verified");
  assert.ok(view.detail.includes("only the hash chain was checked"));

  assert.equal(await removeMapping(client, mapped), undefined);
});

test("C-06a71640 alice is refused and carol finds the id and disables her", async () => {
  const alice = await signedIn("alice");
  const carol = await signedIn("carol");

  const refused = await rejection(alice.client.get("/users", {}));
  assert.equal(refused.status, 403);
  assert.equal(refused.code, "FORBIDDEN");
  const decisionId = errorPanelModel(refused).decisionId;
  assert.ok(typeof decisionId === "string" && decisionId.length > 0);

  const denied = await auditFetcher(carol.client, "authz.denied")({
    cursor: null,
    limit: 25,
    signal: new AbortController().signal,
  });
  assert.ok(denied.items.some((item) => item.payload["decisionId"] === decisionId));

  const accounts = (
    await loadAllItems(cursorPageFetcher(carol.client, "/users", { parseItem: parseAccount }))
  );
  const aliceRow = accounts.find((row) => row.userId === alice.session.userId);
  assert.deepEqual(aliceRow?.roles, ["author"]);
  assert.deepEqual(aliceRow?.teams, ["finance"]);
  assert.deepEqual(aliceRow?.localRoles, []);
  const carolRow = accounts.find((row) => row.userId === carol.session.userId);
  assert.ok(carolRow?.roles.includes("tenant_admin"));

  assert.equal((await patchAccountState(carol.client, alice.session.userId, "disabled")).state, "disabled");
  const ended = await rejection(alice.client.get("/users", {}));
  assert.equal(ended.status, 401);
  assert.equal(ended.code, "UNAUTHENTICATED");

  const self = await rejection(patchAccountState(carol.client, carol.session.userId, "disabled"));
  assert.equal(self.code, "OPERATION_REFUSED");
  assert.equal(adminErrorMessage(self), "You cannot disable your own account.");

  assert.equal((await patchAccountState(carol.client, alice.session.userId, "active")).state, "active");
  const back = await rejection(alice.client.get("/users", {}));
  assert.equal(back.status, 403);
  assert.equal(back.code, "FORBIDDEN");
});
