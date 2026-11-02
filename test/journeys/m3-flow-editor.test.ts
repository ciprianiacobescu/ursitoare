import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { ApiRequestError } from "../../web/src/api/client.ts";
import type { ApiClient } from "../../web/src/api/client.ts";
import { diagnosticRows, textProblemRow } from "../../web/src/flows/diagnostics.ts";
import { flowListFetcher, loadFlow, postFlow } from "../../web/src/flows/flows.ts";
import { flowErrorMessage } from "../../web/src/flows/messages.ts";
import { pointerRange } from "../../web/src/flows/positions.ts";
import {
  loadVersion,
  saveVersion,
  validateVersion,
  versionListFetcher,
} from "../../web/src/flows/versions.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";
import { startE2eStack } from "../support/e2e-stack/stack.ts";
import { sessionClient, signInAs } from "./session.ts";
import type { TestSession } from "./session.ts";

const GOOD = [
  'ursitoare: "0.1"',
  "flow: demo-intake",
  "version: 1.0.0",
  "inputs:",
  "  type: object",
  "  properties:",
  "    url:",
  "      type: string",
  "  required: [url]",
  "start: fetch",
  "nodes:",
  "  fetch:",
  "    kind: block",
  "    uses: docs.fetch@1",
  "    with:",
  "      url: ${{ inputs.url }}",
  "    next: done",
  "  done:",
  "    kind: end",
  "    status: completed",
  "",
].join("\n");
const BAD = GOOD.replace("docs.fetch@1", "nope.missing@1");

let stack: E2eStack | undefined;

before(async () => {
  stack = await startE2eStack({ port: 0, controlPort: 0 });
  assert.ok(stack.handles.has("catalogue"));
});

after(async () => {
  await stack?.close();
});

function running(): E2eStack {
  assert.ok(stack !== undefined);
  return stack;
}

async function signedIn(username: string): Promise<ApiClient> {
  const current = running();
  let session: TestSession | undefined;
  await assert.doesNotReject(async () => {
    session = await signInAs(current, username);
  });
  assert.ok(session !== undefined);
  return sessionClient(current, session);
}

async function rejection(promise: Promise<unknown>): Promise<ApiRequestError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  assert.ok(error instanceof ApiRequestError);
  return error;
}

async function listIds(client: ApiClient): Promise<string[]> {
  const page = await flowListFetcher(client)({
    cursor: null,
    limit: 50,
    signal: new AbortController().signal,
  });
  return page.items.map((item) => item.flowId);
}

test("C-6b221b86 alice, bob, carol and mallory work against the real engine", async () => {
  const alice = await signedIn("alice");
  const bob = await signedIn("bob");
  const carol = await signedIn("carol");
  const mallory = await signedIn("mallory");

  const created = await postFlow(alice, { name: "demo-intake", ownerTeam: "finance" }, "k-create");
  assert.equal(created.ownerTeam, "finance");
  assert.equal(created.versionCount, 0);
  assert.equal(created.latest, null);

  const first = await saveVersion(alice, { flowId: "demo-intake", text: GOOD }, "k-good-1");
  assert.equal(first.created, true);
  assert.equal(first.version.number, 1);
  assert.equal(first.version.state, "draft");
  assert.equal(first.version.surface, "yaml");
  const second = await saveVersion(alice, { flowId: "demo-intake", text: GOOD }, "k-good-2");
  assert.equal(second.created, false);
  assert.equal(second.version.hash, first.version.hash);

  const validated = await validateVersion(alice, "demo-intake", first.version.hash);
  assert.equal(validated.version.state, "validated");
  assert.equal(validated.result.ok, true);
  assert.equal(diagnosticRows(validated.result).length, 0);
  const loaded = await loadVersion(alice, "demo-intake", first.version.hash);
  assert.deepEqual(loaded.result, validated.result);
  assert.equal(loaded.text, GOOD);

  const bad = await saveVersion(alice, { flowId: "demo-intake", text: BAD }, "k-bad");
  assert.equal(bad.version.number, 2);
  const badResult = await validateVersion(alice, "demo-intake", bad.version.hash);
  assert.equal(badResult.result.ok, false);
  const rows = diagnosticRows(badResult.result);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.code, "L2_UNKNOWN_BLOCK");
  assert.equal(rows[0]?.where, "Node fetch · /nodes/fetch/uses");
  const range = pointerRange(BAD, rows[0]?.path ?? "");
  assert.equal(BAD.slice(range.from, range.to), "nope.missing@1");

  const fetcher = versionListFetcher(alice, "demo-intake");
  const signal = new AbortController().signal;
  const page1 = await fetcher({ cursor: null, limit: 1, signal });
  assert.deepEqual(page1.items.map((item) => item.number), [2]);
  assert.notEqual(page1.next_cursor, null);
  const page2 = await fetcher({ cursor: page1.next_cursor, limit: 1, signal });
  assert.deepEqual(page2.items.map((item) => item.number), [1]);

  const broken = await rejection(
    saveVersion(alice, { flowId: "demo-intake", text: "a: [1" }, "k-broken"),
  );
  const brokenRow = textProblemRow(broken, "demo-intake");
  assert.equal(brokenRow?.code, "FORMAT_YAML_SYNTAX");
  assert.notEqual(brokenRow?.position, null);
  const other = await rejection(
    saveVersion(
      alice,
      { flowId: "demo-intake", text: GOOD.replace("flow: demo-intake", "flow: other") },
      "k-other",
    ),
  );
  const otherRow = textProblemRow(other, "demo-intake");
  assert.equal(otherRow?.code, "FLOW_TEXT_INVALID");
  assert.equal(otherRow?.message, 'The flow key must be "demo-intake", the name of this flow.');

  assert.deepEqual(await listIds(bob), ["demo-intake"]);
  assert.equal((await loadFlow(bob, "demo-intake")).flowId, "demo-intake");
  const refused = await rejection(saveVersion(bob, { flowId: "demo-intake", text: GOOD }, "k-bob"));
  assert.equal(refused.status, 403);
  const message = flowErrorMessage(refused);
  assert.ok(message.startsWith("You are not allowed to do this."));
  assert.ok(message.includes("Decision id: "));

  const hidden = await rejection(loadFlow(mallory, "demo-intake"));
  assert.equal(hidden.status, 404);
  assert.equal(hidden.code, "NOT_FOUND");
  assert.deepEqual(await listIds(carol), []);
  assert.deepEqual(await listIds(mallory), []);
});
