/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ADMIN_PAGES } from "../admin/pages.ts";
import type { FlowRow } from "../flows/flows.ts";
import { FLOW_PAGES } from "../flows/pages.ts";
import type { VersionRow } from "../flows/versions.ts";
import { RUN_PAGES } from "../runs/pages.ts";
import type { RunView } from "../runs/types.ts";
import { TOOL_PAGES } from "../tools/pages.ts";
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

const READER: ReadonlySet<string> = new Set([
  "read_self",
  "read_flow",
  "read_run",
  "read_registry",
]);

const ADMIN: ReadonlySet<string> = new Set([
  "read_self",
  "read_flow",
  "read_run",
  "read_registry",
  "manage_users_roles",
  "read_audit",
  "register_tool_server",
  "approve_tool_surface",
  "deploy_policy",
  "manage_credentials",
  "manage_tenant",
]);

const NONE: ReadonlySet<string> = new Set(["read_self"]);

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

function knownCounted(count: number, complete: boolean): HomeFacts["servers"] {
  return { kind: "known", value: { count, complete } };
}

function knownPolicy(deployed: boolean, pendingGrants: number): HomeFacts["policy"] {
  return { kind: "known", value: { deployed, pendingGrants } };
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

const PAGE_PATTERNS: readonly RegExp[] = [
  ...ADMIN_PAGES.map((page) => page.path),
  ...TOOL_PAGES.map((page) => page.path),
  ...FLOW_PAGES.map((page) => page.path),
  ...RUN_PAGES.map((page) => page.path),
].map(
  (path) =>
    new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:[^/]+/g, "[^/]+")}$`),
);

const PAGE_LABELS: readonly (string | null)[] = [
  ...ADMIN_PAGES.map((page) => page.navLabel),
  ...TOOL_PAGES.map((page) => page.navLabel),
  ...FLOW_PAGES.map((page) => page.navLabel),
  ...RUN_PAGES.map((page) => page.navLabel),
];

const NAV_LABELS: readonly string[] = [
  "Home",
  ...PAGE_LABELS.filter((label): label is string => label !== null),
];

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

test("C-1818ac9b an administrator's steps are the three setup counts the API shows", () => {
  assert.equal(typeof nextSteps, "function");

  const n10 = steps(
    ADMIN,
    facts({
      runs: knownRuns([]),
      unassigned: knownCounted(1, true),
      servers: knownCounted(2, true),
      policy: knownPolicy(false, 2),
    }),
  );
  assert.deepEqual(n10.steps, [
    {
      id: "assign-roles",
      label: "Give people a role",
      href: "/admin/users",
      description:
        "1 active person has no role yet. Assign a role, or map an identity-provider group.",
      badge: "1",
    },
    {
      id: "review-pending-tool-servers",
      label: "Review pending tool servers",
      href: "/admin/tool-servers",
      description:
        "2 tool servers wait for their surfaces to be approved before flows can call their tools.",
      badge: "2",
    },
    {
      id: "deploy-grant-changes",
      label: "Deploy grant changes",
      href: "/admin/policies",
      description: "2 grant changes are not deployed, so they are not in force yet.",
      badge: "2",
    },
  ]);
  assert.equal(n10.settled, true);

  const n11 = steps(
    ADMIN,
    facts({
      runs: knownRuns([]),
      unassigned: knownCounted(200, false),
      servers: knownCounted(1, true),
      policy: knownPolicy(true, 1),
    }),
  );
  assert.deepEqual(
    n11.steps.map((step) => [step.id, step.badge, step.description]),
    [
      [
        "assign-roles",
        "200+",
        "At least 200 active people have no role yet. Assign a role, or map an identity-provider group.",
      ],
      [
        "review-pending-tool-servers",
        "1",
        "1 tool server waits for its surface to be approved before flows can call their tools.",
      ],
      ["deploy-grant-changes", "1", "1 grant change is not deployed, so it is not in force yet."],
    ],
  );
  assert.equal(n11.settled, true);

  const n12 = steps(
    ADMIN,
    facts({
      runs: knownRuns([]),
      unassigned: knownCounted(0, true),
      servers: knownCounted(0, true),
      policy: knownPolicy(false, 0),
    }),
  );
  assert.deepEqual(n12, { steps: [], settled: true });

  const n13 = steps(
    ADMIN,
    facts({
      runs: knownRuns([]),
      unassigned: { kind: "unknown" },
      servers: knownCounted(3, false),
      policy: { kind: "unknown" },
    }),
  );
  assert.deepEqual(n13.steps, [
    {
      id: "review-pending-tool-servers",
      label: "Review pending tool servers",
      href: "/admin/tool-servers",
      description:
        "At least 3 tool servers wait for their surfaces to be approved before flows can call their tools.",
      badge: "3+",
    },
  ]);
  assert.equal(n13.settled, false);

  const n14 = steps(new Set(["deploy_policy"]), facts({ policy: knownPolicy(true, 1) }));
  assert.deepEqual(n14.steps, [
    {
      id: "deploy-grant-changes",
      label: "Deploy grant changes",
      href: "/admin/policies",
      description: "1 grant change is not deployed, so it is not in force yet.",
      badge: "1",
    },
  ]);
  assert.equal(n14.settled, true);

  const n15 = steps(
    ADMIN,
    facts({
      runs: knownRuns([]),
      servers: knownCounted(1, false),
      unassigned: knownCounted(0, true),
      policy: knownPolicy(true, 0),
    }),
  );
  assert.deepEqual(n15.steps, [
    {
      id: "review-pending-tool-servers",
      label: "Review pending tool servers",
      href: "/admin/tool-servers",
      description:
        "At least 1 tool server waits for its surface to be approved before flows can call their tools.",
      badge: "1+",
    },
  ]);
  assert.equal(n15.settled, true);
});

test("C-9de28eec nothing is claimed when no fact is known or the role has no setup", () => {
  assert.equal(typeof nextSteps, "function");

  const n6 = steps(READER, facts({ flows: knownFlows([]), runs: knownRuns([OK]) }));
  assert.deepEqual(n6, { steps: [], settled: true });

  const n7 = steps(READER, facts({ flows: knownFlows([]), runs: knownRuns([FAILED]) }));
  assert.deepEqual(
    n7.steps.map((step) => [step.id, step.href]),
    [["review-failed-run", "/runs/run_01a1eb70-0000-7000-8000-00000000be11"]],
  );
  assert.equal(n7.settled, true);

  const n8 = steps(READER, facts({ runs: knownRuns([OK, OK, OK, OK, OK, FAILED]) }));
  assert.deepEqual(n8, { steps: [], settled: true });

  const n9 = steps(READER, facts({ flows: knownFlows([]), runs: { kind: "unknown" } }));
  assert.deepEqual(n9, { steps: [], settled: false });

  const n13 = steps(
    ADMIN,
    facts({
      runs: knownRuns([]),
      unassigned: { kind: "unknown" },
      servers: knownCounted(3, false),
      policy: { kind: "unknown" },
    }),
  );
  assert.deepEqual(
    n13.steps.map((step) => [step.id, step.badge]),
    [["review-pending-tool-servers", "3+"]],
  );
  assert.equal(n13.settled, false);

  const n16 = steps(
    NONE,
    facts({
      flows: knownFlows([]),
      runs: knownRuns([FAILED]),
      servers: knownCounted(1, true),
    }),
  );
  assert.deepEqual(n16, { steps: [], settled: false });

  const n17 = steps(AUTHOR, facts({}));
  assert.deepEqual(n17, { steps: [], settled: false });

  const n18 = steps(ADMIN, facts({ runs: knownRuns([FAILED]) }));
  assert.deepEqual(
    n18.steps.map((step) => step.id),
    ["review-failed-run"],
  );
  assert.equal(n18.settled, false);
});

test("C-942b137c every next step links to a page that exists and names no navigation entry", () => {
  assert.equal(typeof nextSteps, "function");

  const administrator = steps(
    new Set([...ADMIN, "test_flow"]),
    facts({
      flows: knownFlows([]),
      runs: knownRuns([FAILED]),
      unassigned: knownCounted(2, true),
      servers: knownCounted(2, true),
      policy: knownPolicy(true, 3),
    }),
  );
  assert.equal(administrator.steps.length, 5);

  const validated = steps(AUTHOR, facts({ flows: knownFlows([PAY]), runs: knownRuns([OK]) }));
  const draft = steps(AUTHOR, facts({ flows: knownFlows([ERR, DRAFT]), runs: knownRuns([]) }));
  const all = [...administrator.steps, ...validated.steps, ...draft.steps];

  assert.deepEqual(
    all.map((step) => step.id).sort(),
    [
      "assign-roles",
      "create-first-flow",
      "deploy-grant-changes",
      "open-a-flow",
      "review-failed-run",
      "review-pending-tool-servers",
      "start-test-run",
    ],
  );
  assert.deepEqual(Object.fromEntries(all.map((step) => [step.id, step.href])), {
    "assign-roles": "/admin/users",
    "create-first-flow": "/flows",
    "deploy-grant-changes": "/admin/policies",
    "open-a-flow": "/flows/demo-draft",
    "review-failed-run": "/runs/run_01a1eb70-0000-7000-8000-00000000be11",
    "review-pending-tool-servers": "/admin/tool-servers",
    "start-test-run": "/flows/demo-pay",
  });

  for (const step of all) {
    assert.ok(
      PAGE_PATTERNS.some((pattern) => pattern.test(step.href)),
      `${step.href} matches a registered page`,
    );
    assert.ok(!NAV_LABELS.includes(step.label), `${step.label} is not a navigation label`);
    assert.ok(!step.label.includes("Ursitoare"), `${step.label} names no product`);
  }
  assert.equal(new Set(all.map((step) => step.label)).size, 7);
});
