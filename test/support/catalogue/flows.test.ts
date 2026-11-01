import assert from "node:assert/strict";
import { test } from "node:test";

import type { Flow } from "../../../src/authoring/index.ts";
import {
  contentHash,
  isContentHash,
  parseFlowText,
} from "../../../src/authoring/index.ts";
import { CatalogueDataError } from "./errors.ts";
import {
  TEST_FLOW_NAMES,
  loadTestFlow,
  parseCatalogueFlow,
  readTestFlowText,
  testFlowPath,
} from "./flows.ts";
import { canReach } from "./references.ts";

const FLOW_NAMES = ["rf-1-invoice-intake", "rf-1-core", "rf-1-core-approval"];

const ALL_NODE_IDS = [
  "approval",
  "archive",
  "classify",
  "done",
  "extract",
  "fetch_invoice",
  "lookup_vendor",
  "normalize",
  "notify_rejection",
  "pay",
  "rejected",
];

const CORE_NODE_IDS = ALL_NODE_IDS.filter(
  (id) => id !== "approval" && id !== "archive",
);

const APPROVAL_NODE_IDS = ALL_NODE_IDS.filter((id) => id !== "archive");

function flow(name: string): Flow {
  let result: Flow | undefined;
  assert.doesNotThrow(() => {
    result = loadTestFlow(name);
  });
  assert.ok(result !== undefined);
  return result;
}

function parsedFlow(text: string, label: string): Flow {
  let result: Flow | undefined;
  assert.doesNotThrow(() => {
    result = parseCatalogueFlow(text, label);
  });
  assert.ok(result !== undefined);
  return result;
}

function expectFlowParseError(text: string, label: string, prefix: string): void {
  assert.throws(
    () => parseCatalogueFlow(text, label),
    (error: unknown) => {
      assert.ok(
        error instanceof CatalogueDataError,
        `expected CatalogueDataError, got ${String(error)}`,
      );
      assert.equal(error.code, "CATALOGUE_FLOW_PARSE");
      assert.ok(
        error.message.startsWith(prefix),
        `message ${JSON.stringify(error.message)} starts with ${JSON.stringify(prefix)}`,
      );
      return true;
    },
  );
}

function expectUnknownFlow(call: () => unknown, label: string): void {
  assert.throws(
    call,
    (error: unknown) => {
      assert.ok(
        error instanceof CatalogueDataError,
        `${label}: expected CatalogueDataError, got ${String(error)}`,
      );
      assert.equal(error.code, "CATALOGUE_UNKNOWN_FLOW", label);
      return true;
    },
    label,
  );
}

function kindOf(node: unknown): unknown {
  return (node as { kind?: unknown }).kind;
}

test("C-89a07807 The three RF-1 flows have the shipped shape", () => {
  assert.deepEqual([...TEST_FLOW_NAMES], FLOW_NAMES);

  const expectedFlowIds = ["invoice-intake", "rf-1-core", "rf-1-core-approval"];
  const expectedNodeIds = [ALL_NODE_IDS, CORE_NODE_IDS, APPROVAL_NODE_IDS];
  const expectedCases = [
    {
      auto_approve: "pay",
      needs_review: "approval",
      reject: "notify_rejection",
    },
    {
      auto_approve: "pay",
      needs_review: "notify_rejection",
      reject: "notify_rejection",
    },
    {
      auto_approve: "approval",
      needs_review: "approval",
      reject: "notify_rejection",
    },
  ];
  const expectedPayNext = ["archive", "done", "done"];

  FLOW_NAMES.forEach((name, index) => {
    const loaded = flow(name);

    assert.equal(loaded.ursitoare, "0.1", name);
    assert.equal(loaded.version, "1.0.0", name);
    assert.equal(loaded.start, "fetch_invoice", name);
    assert.equal(loaded.flow, expectedFlowIds[index], name);

    const pay = loaded.nodes["pay"];
    assert.ok(pay, `${name} has a pay node`);
    assert.equal((pay as { uses?: string }).uses, "erp.create_payment@1", name);
    assert.equal((pay as { next?: string }).next, expectedPayNext[index], name);

    assert.deepEqual(Object.keys(loaded.nodes).sort(), expectedNodeIds[index], name);

    const classify = loaded.nodes["classify"];
    assert.ok(classify, `${name} has a classify node`);
    assert.deepEqual(
      (classify as { cases?: unknown }).cases,
      expectedCases[index],
      name,
    );
  });

  const intake = flow("rf-1-invoice-intake");
  const intakeApproval = intake.nodes["approval"];
  assert.ok(intakeApproval, "rf-1-invoice-intake has an approval node");
  assert.equal(
    (intakeApproval as { assignee_role?: string }).assignee_role,
    "approver",
  );

  const intakeArchive = intake.nodes["archive"];
  assert.ok(intakeArchive, "rf-1-invoice-intake has an archive node");
  assert.equal(kindOf(intakeArchive), "delegate");
  assert.equal((intakeArchive as { target?: string }).target, "n8n");
  assert.equal((intakeArchive as { workflow?: string }).workflow, "archive-invoice");

  const approvalVariant = flow("rf-1-core-approval");
  const approval = approvalVariant.nodes["approval"];
  assert.ok(approval, "rf-1-core-approval has an approval node");
  assert.equal((approval as { assignee_role?: string }).assignee_role, "approver");

  for (const variant of ["rf-1-core", "rf-1-core-approval"]) {
    for (const [id, node] of Object.entries(flow(variant).nodes)) {
      assert.notEqual(kindOf(node), "delegate", `${variant} ${id}`);
    }
  }
});

test("C-5f9214ef Only the approval variant forces approval before pay", () => {
  for (const name of FLOW_NAMES) {
    assert.equal(canReach(flow(name), "pay"), true, name);
  }

  assert.equal(canReach(flow("rf-1-invoice-intake"), "pay", "approval"), true);
  assert.equal(canReach(flow("rf-1-core"), "pay", "approval"), true);
  assert.equal(canReach(flow("rf-1-core-approval"), "pay", "approval"), false);
});

test("C-93a6f521 Flow text is parsed or refused and only shipped names are read", () => {
  assert.deepEqual(parsedFlow('ursitoare: "0.1"\nflow: t\n', "t"), {
    ursitoare: "0.1",
    flow: "t",
  });

  expectFlowParseError("a: [\n", "bad", "bad: FORMAT_YAML_SYNTAX: ");
  expectFlowParseError("- 1\n", "list", "list: ");
  expectFlowParseError("", "empty", "empty: ");

  const badNames = ["ghost", "", "rf-1-core.yaml", "../flows/rf-1-core", "__proto__"];
  for (const name of badNames) {
    expectUnknownFlow(() => testFlowPath(name), `testFlowPath ${name}`);
    expectUnknownFlow(() => readTestFlowText(name), `readTestFlowText ${name}`);
    expectUnknownFlow(() => loadTestFlow(name), `loadTestFlow ${name}`);
  }

  let path: string | undefined;
  assert.doesNotThrow(() => {
    path = testFlowPath("rf-1-core");
  });
  assert.ok(path !== undefined);
  assert.equal(path.startsWith("/"), true, path);
  assert.equal(path.endsWith("/test/support/catalogue/flows/rf-1-core.yaml"), true, path);

  let text: string | undefined;
  assert.doesNotThrow(() => {
    text = readTestFlowText("rf-1-core");
  });
  assert.ok(text !== undefined);
  assert.ok(text.startsWith('ursitoare: "0.1"'), text.slice(0, 40));
});

test("C-f837a8fc Content hashes are stable and distinct", () => {
  const hashes = new Map<string, string>();
  for (const name of FLOW_NAMES) {
    const first = contentHash(flow(name));
    const second = contentHash(flow(name));
    assert.equal(first, second, name);
    assert.equal(isContentHash(first), true, name);
    hashes.set(name, first);
  }

  assert.equal(new Set(hashes.values()).size, FLOW_NAMES.length);

  const yamlFlow = flow("rf-1-core");
  let jsonDoc: unknown;
  assert.doesNotThrow(() => {
    const parsed = parseFlowText(JSON.stringify(yamlFlow), "json");
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      jsonDoc = parsed.doc;
    }
  });

  const yamlHash = hashes.get("rf-1-core");
  assert.ok(yamlHash !== undefined);
  assert.equal(contentHash(jsonDoc), yamlHash);
});
