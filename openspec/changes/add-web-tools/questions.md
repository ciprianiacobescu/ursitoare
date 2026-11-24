# Questions — add-web-tools

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | open | 2.2 | harness | Task 2.2: the pre-satisfied check could not decide |
<!-- l4:index:end -->

---

## Q-001: Task 2.2: the pre-satisfied check could not decide

- **Status:** open
- **Blocking tasks:** 2.2
- **Kind:** harness
- **Asked:** 2026-11-24T14:51Z by claude-sonnet, run r-20261124T1311Z-f4b6, task 2.2
- **Criteria:** C-0f038efb (web-tools › A server whose tools carry a call is parsed and listed › Servers of every adapter parse and list)

### Context
L4 could not run the pre-satisfied check of task 2.2, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and web/src/tools/servers-call.test.ts is not a Python file; the base run: every new test passes against the unit base code too
Runs: test-base-run
Kept real: nothing
Tests: web.src.tools.servers-call.test.ts::C-0f038efb cursorPageFetcher lists servers of every adapter, web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer reads a tool with a call and no http as http null, web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer refuses a present http that is not a method and path

Changes the replay applies (2 files):
    added web/src/tools/grant-node-bound.test.ts
    added web/src/tools/servers-call.test.ts

Source of the tests (redacted; at most 40 lines each):
web.src.tools.servers-call.test.ts::C-0f038efb cursorPageFetcher lists servers of every adapter:
    test("C-0f038efb cursorPageFetcher lists servers of every adapter", async () => {
      const client = {
        get: (): Promise<never> =>
          Promise.resolve({ items: [S_FIX, S_MCP, S_CODE], next_cursor: null } as never),
      };
      const fetchPage = cursorPageFetcher(client, "/tool-servers", { parseItem: parseToolServer });
      const page = await fetchPage({
        cursor: null,
        limit: 50,
        signal: new AbortController().signal,
      });
      assert.deepEqual(
        page.items.map((s) => s.id),
        ["acme", "crm", "snips"],
      );
      assert.equal(page.next_cursor, null);
    });
web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer reads a tool with a call and no http as http null:
    test("C-0f038efb parseToolServer reads a tool with a call and no http as http null", () => {
      const mcp = parseToolServer(S_MCP);
      assert.ok(mcp !== null);
      assert.deepEqual(mcp.tools, [
        {
          name: "find_vendor",
          effect: "write",
          ref: null,
          untrusted_result: true,
          unsafe_to_retry: true,
          http: null,
        },
      ]);
      assert.deepEqual(toolRows(mcp).map((r) => r.call), ["—"]);
      const code = parseToolServer(S_CODE);
      assert.ok(code !== null);
      assert.deepEqual(code.tools, [
        {
          name: "word_count",
          effect: "read",
          ref: null,
          untrusted_result: false,
          unsafe_to_retry: false,
          http: null,
        },
      ]);
      assert.deepEqual(toolRows(code).map((r) => r.call), ["—"]);
    });
web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer refuses a present http that is not a method and path:
    test("C-0f038efb parseToolServer refuses a present http that is not a method and path", () => {
      const bad = server(
        "crm",
        "mcp",
        "https://mcp.fake.test",
        { name: "find_vendor", effect: "write" },
        { tools: [mcpTool({ http: { method: "POST" } })] },
      );
      assert.equal(parseToolServer(bad), null);
    });

Diff of web/src/tools/grant-node-bound.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/web/src/tools/grant-node-bound.test.ts b/web/src/tools/grant-node-bound.test.ts
    new file mode 100644
    index 0000000..e163cdb
    --- /dev/null
    +++ b/web/src/tools/grant-node-bound.test.ts
    @@ -0,0 +1,61 @@
    +/// <reference types="node" />
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import { grantBody, parseGrant, type GrantDraft } from "./grants.ts";
    +
    +const ID128 = "a" + "b".repeat(127);
    +const ID129 = ID128 + "b";
    +const ID1024 = "a" + "b".repeat(1023);
    +
    +function rec(nodeId: string): Record<string, unknown> {
    +  return {
    +    grant: {
    +      id: "grant_1",
    +      subject: { kind: "role", role: "author" },
    +      tool: "acme.create_payment@1",
    +      scope: { kind: "node", flowId: "pay-run", nodeId },
    +      args: [],
    +    },
    +    status: "active",
    +  };
    +}
    +
    +function draft(nodeId: string): GrantDraft {
    +  return {
    +    subjectKind: "role",
    +    subject: "author",
    +    tool: "acme.create_payment@1",
    +    scopeKind: "node",
    +    flowId: "pay-run",
    +    nodeId,
    +  };
    +}
    +
    [cut: 27 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-tools/.l4/held/2.2-pre_satisfied.patch` on the unit branch]

Diff of web/src/tools/servers-call.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/web/src/tools/servers-call.test.ts b/web/src/tools/servers-call.test.ts
    new file mode 100644
    index 0000000..317a0da
    --- /dev/null
    +++ b/web/src/tools/servers-call.test.ts
    @@ -0,0 +1,141 @@
    +/// <reference types="node" />
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
    +import { parseToolServer, toolRows } from "./servers.ts";
    +
    +const IO = { type: "object" };
    +
    +function server(
    +  id: string,
    +  adapter: string,
    +  origin: string,
    +  tool: { name: string; effect: string },
    +  pendingSurface?: unknown,
    +): Record<string, unknown> {
    +  return {
    +    id,
    +    adapter,
    +    origin,
    +    local: false,
    +    state: "pending",
    +    registeredBy: "u_carol",
    +    registeredAt: "2026-11-09T10:00:00.000000Z",
    +    approvedDigest: null,
    +    pendingDigest: "sha256:" + "b".repeat(64),
    +    pendingSubmittedBy: "u_carol",
    +    tools: [{ name: tool.name, effect: tool.effect, ref: null }],
    +    approvedSurface: null,
    +    ...(pendingSurface === undefined ? {} : { pendingSurface }),
    +  };
    +}
    +
    +function mcpTool(extra: Record<string, unknown> = {}): Record<string, unknown> {
    [cut: 107 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-web-tools/.l4/held/2.2-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 2 files (the whole patch is in `openspec/changes/add-web-tools/.l4/held/2.2-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
