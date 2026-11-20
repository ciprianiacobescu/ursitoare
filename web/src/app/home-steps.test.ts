/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { FlowRow } from "../flows/flows.ts";
import type { VersionRow } from "../flows/versions.ts";
import type { RunView } from "../runs/types.ts";
import { nextSteps, type HomeFacts, type NextStep } from "./home.ts";

const HASH = "sha256:" + "ab".repeat(32);

const AUTHOR: ReadonlySet<string> = new Set([
  "read_self",
  "read_flow",
  "read_run",
  "read_registry",
  "test_flow",
  "dry_run_flow",
]);

function run(id: string, flowId: string, state: RunView["state"]): RunView {
  return {
    id,
    flowId,
    flowHash: HASH,
    mode: "mock",
    trigger: "test",
    state,
    ownerTeam: "finance",
    principal: { userId: "usr_me", kind: "human" },
    terminalNode: null,
    error: null,
    inputRef: null,
    outputRef: null,
    createdAt: "2026-11-18T09:54:50Z",
    startedAt: "2026-11-18T09:55:00Z",
    endedAt: null,
  };
}

function version(
  flowId: string,
  number: number,
  state: VersionRow["state"],
  validationOk: boolean | null,
  createdAt: string,
): VersionRow {
  return {
    flowId,
    number,
    hash: HASH,
    state,
    surface: "yaml",
    author: "usr_me",
    requestedBy: null,
    createdAt,
    validatedAt: null,
    validationOk,
  };
}

function flow(flowId: string, createdAt: string, latest: FlowRow["latest"]): FlowRow {
  return {
    flowId,
    ownerTeam: "finance",
    createdBy: "usr_me",
    createdAt,
    versionCount: latest === null ? 0 : latest.number,
    latest,
  };
}

const PAY = flow("demo-pay", "2026-11-14T08:00:00Z", version("demo-pay", 2, "validated", true, "2026-11-18T11:00:00Z"));
const DRAFT = flow("demo-draft", "2026-11-18T11:55:00Z", null);
const ERR = flow("alpha-flow", "2026-11-14T12:00:00Z", version("alpha-flow", 1, "draft", false, "2026-11-14T12:00:00Z"));

const OK = run("run_01a1eb72-3179-7000-a94d-6c6eaf5d03ac", "demo-pay", "completed");
const FAILED = run("run_01a1eb70-0000-7000-8000-00000000be11", "demo-grants", "failed");

function knownFlows(items: readonly FlowRow[], complete = true): HomeFacts["flows"] {
  return { kind: "known", value: { items, complete } };
}

function knownRuns(items: readonly RunView[]): HomeFacts["runs"] {
  return { kind: "known", value: items };
}

function facts(over: Partial<HomeFacts>): HomeFacts {
  return {
    runs: { kind: "unknown" },
    flows: { kind: "unknown" },
    servers: { kind: "unknown" },
    policy: { kind: "unknown" },
    unassigned: { kind: "unknown" },
    ...over,
  };
}

function steps(capabilities: ReadonlySet<string>, homeFacts: HomeFacts): { steps: NextStep[]; settled: boolean } {
  let result: { steps: NextStep[]; settled: boolean } | undefined;
  assert.doesNotThrow(() => {
    result = nextSteps(capabilities, homeFacts);
  }, "nextSteps must return a result");
  assert.ok(result !== undefined, "nextSteps returned a result");
  return result;
}

test("C-d54270f7 an author's steps follow the flows and runs the API shows", () => {
  assert.equal(typeof nextSteps, "function");

  const n1 = steps(AUTHOR, facts({ flows: knownFlows([]), runs: knownRuns([]) }));
  assert.deepEqual(n1.steps, [
    {
      id: "create-first-flow",
      label: "Create your first flow",
      href: "/flows",
      description: "No flow of your teams exists yet. Name one, write it in YAML and validate it.",
      badge: null,
    },
  ]);
  assert.equal(n1.settled, true);

  const n2 = steps(AUTHOR, facts({ flows: knownFlows([PAY]), runs: knownRuns([OK]) }));
  assert.deepEqual(n2.steps, [
    {
      id: "start-test-run",
      label: "Start a test run",
      href: "/flows/demo-pay",
      description: "demo-pay has a validated version 2. Run it with mocked tools.",
      badge: null,
    },
  ]);

  const n3 = steps(AUTHOR, facts({ flows: knownFlows([ERR, DRAFT]), runs: knownRuns([]) }));
  assert.deepEqual(n3.steps, [
    {
      id: "open-a-flow",
      label: "Open a flow",
      href: "/flows/demo-draft",
      description: "None of your flows has a validated version yet. Open demo-draft to write and validate one.",
      badge: null,
    },
  ]);

  const n4 = steps(AUTHOR, facts({ flows: knownFlows([DRAFT, PAY]), runs: knownRuns([]) }));
  assert.deepEqual(n4.steps, [
    {
      id: "start-test-run",
      label: "Start a test run",
      href: "/flows/demo-pay",
      description: "demo-pay has a validated version 2. Run it with mocked tools.",
      badge: null,
    },
  ]);

  const n5 = steps(AUTHOR, facts({ flows: knownFlows([]), runs: knownRuns([OK, FAILED]) }));
  assert.deepEqual(n5.steps, [
    {
      id: "create-first-flow",
      label: "Create your first flow",
      href: "/flows",
      description: "No flow of your teams exists yet. Name one, write it in YAML and validate it.",
      badge: null,
    },
    {
      id: "review-failed-run",
      label: "Review a failed run",
      href: "/runs/run_01a1eb70-0000-7000-8000-00000000be11",
      description: "Run 0000be11 of demo-grants failed. Open it to see which step stopped and why.",
      badge: null,
    },
  ]);

  const n5b = steps(AUTHOR, facts({ flows: knownFlows([PAY], false), runs: knownRuns([]) }));
  assert.deepEqual(n5b.steps, [
    {
      id: "start-test-run",
      label: "Start a test run",
      href: "/flows/demo-pay",
      description: "demo-pay has a validated version 2. Run it with mocked tools.",
      badge: null,
    },
  ]);
});
