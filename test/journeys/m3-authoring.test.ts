import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { parseFlowText } from "../../src/authoring/index.ts";
import { ApiRequestError } from "../../web/src/api/client.ts";
import type { ApiClient } from "../../web/src/api/client.ts";
import { graphView } from "../../web/src/flow-graph/graph-model.ts";
import { loadLatestGraph } from "../../web/src/flow-graph/graph-source.ts";
import type { LatestGraph } from "../../web/src/flow-graph/graph-source.ts";
import { layoutFlow } from "../../web/src/flow-graph/layout.ts";
import { postFlow } from "../../web/src/flows/flows.ts";
import { saveVersion } from "../../web/src/flows/versions.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";
import { startE2eStack } from "../support/e2e-stack/stack.ts";
import { sessionClient, signInAs } from "./session.ts";
import type { TestSession } from "./session.ts";

const GRAPH_GOOD = [
  'ursitoare: "0.1"',
  "flow: demo-graph",
  "version: 1.0.0",
  "inputs:",
  "  type: object",
  "  properties:",
  "    url:",
  "      type: string",
  "    mode:",
  "      type: string",
  "  required:",
  "    - url",
  "    - mode",
  "start: fetch",
  "nodes:",
  "  fetch:",
  "    kind: block",
  "    uses: docs.fetch@1",
  "    with:",
  "      url: ${{ inputs.url }}",
  "    next: route",
  "  route:",
  "    kind: switch",
  "    on: ${{ inputs.mode }}",
  "    cases:",
  "      fast: done",
  "    default: failed",
  "  done:",
  "    kind: end",
  "    status: completed",
  "  failed:",
  "    kind: end",
  "    status: failed",
  "",
].join("\n");
const GRAPH_BAD = GRAPH_GOOD.replace("docs.fetch@1", "nope.missing@1");

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

async function graphOf(client: ApiClient, flowId: string): Promise<LatestGraph> {
  let out: LatestGraph | undefined;
  await assert.doesNotReject(async () => {
    out = await loadLatestGraph(client, flowId);
  });
  assert.ok(out !== undefined);
  return out;
}

test("C-830797f7 alice, bob and mallory read graphs from the engine", async () => {
  const alice = await signedIn("alice");
  const bob = await signedIn("bob");
  const mallory = await signedIn("mallory");

  await postFlow(alice, { name: "demo-graph", ownerTeam: "finance" }, "k-create-1");
  await postFlow(alice, { name: "empty-graph", ownerTeam: "finance" }, "k-create-2");
  await saveVersion(alice, { flowId: "demo-graph", text: GRAPH_GOOD }, "k-good");
  await saveVersion(alice, { flowId: "demo-graph", text: GRAPH_BAD }, "k-bad");

  const result = await graphOf(alice, "demo-graph");
  assert.equal(result.saved, true);
  assert.equal(result.version, 2);

  const parsed = parseFlowText(GRAPH_BAD, "yaml");
  assert.ok(parsed.ok);
  const expected = layoutFlow(parsed.doc);
  assert.equal(expected.status, "ok");
  assert.deepEqual(layoutFlow(result.canonical), expected);
  assert.ok(expected.status === "ok");
  assert.equal(expected.layout.width, 384);
  assert.equal(expected.layout.height, 288);
  assert.equal(expected.layout.layers, 3);
  assert.equal(expected.layout.start, "fetch");

  const view = graphView(result.canonical, true);
  assert.equal(view.state, "ready");
  assert.equal(view.message, "Flow graph: 4 nodes, 3 edges, 3 layers.");
  assert.deepEqual(
    view.items.map((item) => item.id),
    ["fetch", "route", "done", "failed"],
  );
  assert.deepEqual(
    view.items.map((item) => item.summary),
    [
      "block · Start · Next: route",
      "switch · Next: done, failed",
      "end · Next: none",
      "end · Next: none",
    ],
  );

  const empty = await graphOf(alice, "empty-graph");
  assert.deepEqual(empty, { saved: false, version: null, canonical: null });
  assert.equal(graphView(empty.canonical, empty.saved).state, "unsaved");

  assert.deepEqual(await graphOf(bob, "demo-graph"), result);

  const hidden = await rejection(loadLatestGraph(mallory, "demo-graph"));
  assert.equal(hidden.status, 404);
  assert.equal(hidden.code, "NOT_FOUND");
  const ghost = await rejection(loadLatestGraph(alice, "ghost"));
  assert.equal(ghost.status, 404);
  assert.equal(ghost.code, "NOT_FOUND");

  const refused = await rejection(
    saveVersion(bob, { flowId: "demo-graph", text: GRAPH_GOOD }, "k-bob"),
  );
  assert.equal(refused.status, 403);
});
