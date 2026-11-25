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
| Q-001 | answered | 2.2 | harness | Task 2.2: the pre-satisfied check could not decide |
| Q-002 | answered | none | verdict | Criterion C-a7a348b2 (web-runs › A stale validation has its own text in the test-run and dry-run panels › A stale version reads as one message in both panels): accept as satisfied? |
| Q-003 | answered | none | verdict | Criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix): accept as satisf |
| Q-004 | answered | none | verdict | Criterion C-a4971512 (web-tools › A preview is read strictly, the calls use their routes and a refusal lands on the form › Previews, calls and refusals): accept as satisfied? |
| Q-005 | answered | none | verdict | Criterion C-9153e19d (web-tools › A credential is read without its secret, and its body, texts and refusals are fixed › A credential view never carries a secret and its body, texts and refusals are fi |
| Q-006 | answered | none | verdict | Criterion C-29e43442 (web-tools › The credential calls page the list and send the secret only in the body › The credential calls page the list and send the secret only in the body): accept as satisfie |
| Q-007 | answered | none | verdict | Criterion C-a714f000 (web-tools › A step id of the grant form is at most 128 characters › A step id of 128 characters is accepted and one of 129 is refused): accept as satisfied? |
| Q-008 | answered | none | verdict | Criterion C-0f038efb (web-tools › A server whose tools carry a call is parsed and listed › Servers of every adapter parse and list): accept as satisfied? |
| Q-009 | answered | none | verdict | Criterion C-2ec0cc21 (web-tools › The registration page carries fixed names, one feature file and kit components only › The registration page carries fixed names and its own feature file): accept as s |
| Q-010 | open | none | verdict | Criterion C-e3ab2add (web-tools › The registration and credential pages show the states of the API's answers › An MCP server is registered and a code-block server shows no credential form): accept as  |
| Q-011 | open | none | verdict | Criterion C-0a8c70b3 (web-tools › The registration and credential pages show the states of the API's answers › An OpenAPI document is previewed, given effects and registered): accept as satisfied? |
| Q-012 | answered | none | verdict | Criterion C-62f4785e (web-tools › The registration and credential pages show the states of the API's answers › A credential is stored and rotated and its secret never shows): accept as satisfied? |
| Q-013 | answered | none | verdict | Criterion C-c3420a43 (web-tools › The registration and credential pages show the states of the API's answers › A document and a code block are replaced from the server detail): accept as satisfied? |
| Q-014 | answered | none | verdict | Criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages): accept as satisfied? |
| Q-015 | open | none | verdict | Criterion C-5d82c84b (web-tools › The calls use the right routes and headers and refuse unreadable answers › The tool list is read for up to 100 pages and says when it is cut off): accept as satisfied |
| Q-016 | open | none | verdict | Hold H-ecf0d557: UI criterion C-0f038efb has no end-to-end test; see the generated UI tests table |
| Q-017 | open | none | verdict | Hold H-5a58c421: UI criterion C-e3ab2add has no end-to-end test; see the generated UI tests table |
| Q-018 | open | none | verdict | Hold H-4adb729f: UI criterion C-0a8c70b3 has no end-to-end test; see the generated UI tests table |
| Q-019 | open | none | verdict | Hold H-b2d28b5d: UI criterion C-62f4785e has no end-to-end test; see the generated UI tests table |
| Q-020 | open | none | verdict | Hold H-6a1a6ad5: UI criterion C-c3420a43 has no end-to-end test; see the generated UI tests table |
| Q-021 | open | none | verdict | Hold H-21f75d66: UI criterion C-5d82c84b has no end-to-end test; see the generated UI tests table |
| Q-022 | open | none | verdict | Hold H-bfb6e7a2: the judge's reply was discarded (part 1 of 2, timeout: no answer within 600s) |
<!-- l4:index:end -->

---

## Q-001: Task 2.2: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
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
accept: The three servers-call tests pin behaviour the base parser already has, which is what the unit intends: design decision 2 says the servers parser needs no change because parseHttp(undefined) is null and unknown members such as call are ignored, and task 2.2 says servers-call.test.ts is green on arrival and that the resulting pre_satisfied question for C-0f038efb is to be accepted once the tests assert the rows. They do: the two parseToolServer tests build S_MCP and S_CODE as test-plan.md § Servers gives them, assert the exact tool records with http null and their own flags, the "—" Call of toolRows, and null for the surface tool whose http is { method: "POST" }; the cursorPageFetcher test reads the page [S_FIX, S_MCP, S_CODE] and asserts the ids acme, crm, snips with next_cursor null. The other test file of the patch, grant-node-bound.test.ts, is not held because grants.ts still carries the two 1024 limits, so its tests fail against the base as the task requires. Count these on the evidence of the real run.

---

## Q-002: Criterion C-a7a348b2 (web-runs › A stale validation has its own text in the test-run and dry-run panels › A stale version reads as one message in both panels): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-a7a348b2 (web-runs › A stale validation has its own text in the test-run and dry-run panels › A stale version reads as one message in both panels)

### Context
Criterion C-a7a348b2 (web-runs › A stale validation has its own text in the test-run and dry-run panels › A stale version reads as one message in both panels) is needs human after round 2.

Scenario:
\- **WHEN** `staleVersionText`, `testRunFormErrors` and `dryRunFormErrors` run on the rows of test-plan.md § Stale
\- **THEN** the stale details give the text and the other values `null`; both form-error functions give `{ $form: STALE }` for the stale refusal and the existing blocks text for the `block_missing` one

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.runs.stale.test.ts::C-a7a348b2 dryRunFormErrors reads a stale refusal as one message (passed, red_assertion); web.src.runs.stale.test.ts::C-a7a348b2 staleVersionText gives the text for a stale version and null otherwise (passed, red_assertion); web.src.runs.stale.test.ts::C-a7a348b2 testRunFormErrors reads a stale refusal as one message (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. staleVersionText returns the stale text only when reason is version_not_runnable and cause is validation_stale and null otherwise; refusedTest in test-run.ts calls it before the block_missing branch and returns { $form: text }; dryRunFormErrors hands every non-400 error to testRunFormErrors. The three tracing tests assert exactly the rows of test-plan.md § Stale: the text and three nulls, and { $form: STALE } and the existing blocks text from both form-error functions for a 422 OPERATION_REFUSED. All passed by assertion. The judge simply gave no verdict; nothing is missing.
---

## Q-003: Criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix): accept as satisf

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix)

### Context
Criterion C-3ad08589 (web-tools › A registration draft becomes the API request or names the field to fix › The three drafts become the registration requests or name the field to fix) is needs human after round 2.

Scenario:
\- **WHEN** the rows M1 to M3, P1 to P3, O1, O2, C1 to C3, R1 and R2 of test-plan.md § Drafts run
\- **THEN** M1 gives its body from a padded draft, P1 the origin `https://tools.fake.test` from `https://Tools.Fake.Test/`, O1 an overlay of two entries from three effects, C1 one tool without `description` and C3 with it; R1 and R2 the bodies of the PUT routes; every other row gives its `field` and text; the first failing field wins (P3, O2); no draft is changed

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.register.test.ts::C-3ad08589 codeRegistration builds one tool without a description and one with it (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 codeRegistration refuses the input before the output schema (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 codeReplacement checks the schemas and refuses a server id off the pattern (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 mcpRegistration builds the trimmed MCP body and refuses the id before the url (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 mcpRegistration keeps a local http address as typed (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 no builder changes the draft it is given (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 openApiRegistration builds the overlay of the chosen effects and refuses the first failing field (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 openApiReplacement checks the document and overlay and ignores the origin (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 previewRequest sends the origin it parses and the document, refusing origin first (passed, red_assertion); web.src.tools.register.test.ts::C-3ad08589 the replacement builders build the PUT bodies and refuse a bad server id (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. register.test.ts runs every row of test-plan.md § Drafts: M1 from the padded draft, M2 and M3, P1 with the lowercased origin, P2 and P3 with the origin failing before the document, O1 with the two-entry overlay, O2 with the id failing first, C1 without description and C3 with it, C2, R1 and R2 with the PUT paths and bodies, the RangeError for Ledger and a/b, and a final test that no builder changes any draft. The implementation checks the fields in the design's order with its texts, drops effects that are empty, omits a blank description and throws RangeError for a replacement id off the pattern. All ten tests passed by assertion.
---

## Q-004: Criterion C-a4971512 (web-tools › A preview is read strictly, the calls use their routes and a refusal lands on the form › Previews, calls and refusals): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-a4971512 (web-tools › A preview is read strictly, the calls use their routes and a refusal lands on the form › Previews, calls and refusals)

### Context
Criterion C-a4971512 (web-tools › A preview is read strictly, the calls use their routes and a refusal lands on the form › Previews, calls and refusals) is needs human after round 2.

Scenario:
\- **WHEN** `parsePreview` gets `PV` and the 8 malformed values, and rows K1 to K6 and E1 to E4 of test-plan.md § Preview, calls and answers run
\- **THEN** `PV` gives three rows with their `name`, without `version`, and stays unchanged, each malformed value `null`; K1 to K6 give the plan's records, ids (K2 `{ id: "crm" }` from the MCP answer's `server`), effects, drafts, `RangeError`s and `INVALID_RESPONSE` rejections; E1 to E4 give the plan's form errors (E2 `source` and `name` from `body/tools/<i>/<k>`, E4 the sentence of each of the 14 reasons, an unknown one unchanged, the 413 text)

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.register-calls.test.ts::C-a4971512 codeDraftOf reads one code tool and refuses any other surface (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 loadCodeDraft reads the server and prefers the pending surface (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 parsePreview reads the operations without the version and refuses malformed previews (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 prefillEffects maps each non-excluded operation to its tool effect (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 previewOperations posts the preview and refuses another path and an unreadable answer (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 registerServer posts under the key and reads the id from the server for MCP (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 registerServer refuses unreadable answers a blank key and another path (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 registrationFormErrors maps the conflict and the named validation fields (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 registrationFormErrors puts an unknown field and a forbidden answer on the form (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 registrationFormErrors reads every engine reason and the payload text (passed, red_assertion); web.src.tools.register-calls.test.ts::C-a4971512 replaceServer puts a replacement and refuses an unreadable answer and a registration request (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. register-calls.test.ts parses PV into three rows with their names and no version, checks PV unchanged and the nine malformed values null; runs K1 to K6 with a recording fake and asserts the records, the id crm read from the MCP answer's server, the INVALID_RESPONSE and RangeError rejections with no records, the prefilled effects and the code drafts with the pending surface preferred; and runs E1 to E4, including the source and name fields read from body/tools/<i>/<k>, all 14 REGISTER_REASONS sentences, the unknown reason ipv6 unchanged and the 413 text. The implementation matches each of these. All eleven tests passed by assertion.
---

## Q-005: Criterion C-9153e19d (web-tools › A credential is read without its secret, and its body, texts and refusals are fixed › A credential view never carries a secret and its body, texts and refusals are fi

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-9153e19d (web-tools › A credential is read without its secret, and its body, texts and refusals are fixed › A credential view never carries a secret and its body, texts and refusals are fixed)

### Context
Criterion C-9153e19d (web-tools › A credential is read without its secret, and its body, texts and refusals are fixed › A credential view never carries a secret and its body, texts and refusals are fixed) is needs human after round 2.

Scenario:
\- **WHEN** `parseCredential` gets `CREC()`, the hostile record with `value` and `secret` and the 8 malformed values, and rows B1, B2, T1 and T2 of test-plan.md § Credentials run
\- **THEN** the views are `CV()`, `CV()` (its `JSON.stringify` has no `s3cr3t`) and `null`; B1 and B2 give the plan's bodies, refusals (`VAL_T` never holding `s3`) and `RangeError`; T1 and T2 give the plan's texts, among them "Code blocks need no credential." for a code-block server whatever is stored

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.credentials.test.ts::C-9153e19d credentialBody builds the bearer and API key bodies (passed, red_assertion); web.src.tools.credentials.test.ts::C-9153e19d credentialBody refuses the header before the value and a bad server id (passed, red_assertion); web.src.tools.credentials.test.ts::C-9153e19d credentialErrors maps the conflict, the code-block refusal, the vault and the fields (passed, red_assertion); web.src.tools.credentials.test.ts::C-9153e19d credentialText says when a credential is missing or stored and a code block needs none (passed, red_assertion); web.src.tools.credentials.test.ts::C-9153e19d parseCredential reads the five members and never a secret (passed, red_assertion); web.src.tools.credentials.test.ts::C-9153e19d parseCredential refuses the malformed records (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. credentials.test.ts asserts parseCredential gives CV() for CREC(), gives CV() for the hostile record with value and secret and that its JSON.stringify holds no s3cr3t, and gives null for the eight malformed values; credentialBody gives the B1 bodies, refuses the header before the value with HDR_T and the reserved text, refuses the three bad values with VAL_T holding no s3, accepts 4096 characters and throws RangeError for Crm; credentialText gives the four T1 texts including the code-block text whatever is stored; credentialErrors gives the T2 form errors. The implementation reads only the five members, checks the header for an API key only, omits headerName for a bearer token and never puts the value in a message. All six tests passed by assertion.
---

## Q-006: Criterion C-29e43442 (web-tools › The credential calls page the list and send the secret only in the body › The credential calls page the list and send the secret only in the body): accept as satisfie

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-29e43442 (web-tools › The credential calls page the list and send the secret only in the body › The credential calls page the list and send the secret only in the body)

### Context
Criterion C-29e43442 (web-tools › The credential calls page the list and send the secret only in the body › The credential calls page the list and send the secret only in the body) is needs human after round 2.

Scenario:
\- **WHEN** rows L1, L2, S1 and S2 of test-plan.md § Credentials run against a recording fake (S2 rotates with the scheme)
\- **THEN** L1 resolves `CV()` over two requests; L2, S1 and S2 give the plan's results, records and rejections (`INVALID_RESPONSE` also after exactly 50 requests); no record or message holds a secret except the bodies of S1 and S2

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.credentials-calls.test.ts::C-29e43442 loadServerCredential pages the list and resolves the first credential of the server (passed, red_assertion); web.src.tools.credentials-calls.test.ts::C-29e43442 loadServerCredential resolves null and refuses unreadable pages, a forbidden list and a bad id (passed, red_assertion); web.src.tools.credentials-calls.test.ts::C-29e43442 rotateServerCredential sends the value and scheme and refuses a bad id, a bad value and an unreadable answer (passed, red_assertion); web.src.tools.credentials-calls.test.ts::C-29e43442 storeCredential posts the body under the key and refuses a blank key, a non-object body and an unreadable answer (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. credentials-calls.test.ts runs L1, L2, S1 and S2 against a recording fake: L1 resolves CV() over two GET /credentials requests with limit 200 and then the cursor c1, and asserts neither the view nor the records hold s3cr3t; L2 resolves null after one request, rejects INVALID_RESPONSE for an unreadable item and after exactly 50 requests of an endless list, rethrows the 403 and rejects a bad id with RangeError and no records; S1 posts the body under Idempotency-Key k-1, rejects a blank key and a non-object body before a call and an unreadable answer with INVALID_RESPONSE; S2 rotates with the value, scheme and header name and no header option, omits headerName for a bearer token, rejects a bad id, a reserved header and bad values with RangeError whose message holds no value, and rejects an unreadable answer. The implementation matches each assertion. All four tests passed by assertion.
---

## Q-007: Criterion C-a714f000 (web-tools › A step id of the grant form is at most 128 characters › A step id of 128 characters is accepted and one of 129 is refused): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-a714f000 (web-tools › A step id of the grant form is at most 128 characters › A step id of 128 characters is accepted and one of 129 is refused)

### Context
Criterion C-a714f000 (web-tools › A step id of the grant form is at most 128 characters › A step id of 128 characters is accepted and one of 129 is refused) is needs human after round 2.

Scenario:
\- **WHEN** `parseGrant` and `grantBody` run on the rows of test-plan.md § Step ids
\- **THEN** `ID128` gives its scope and body (also with spaces around it); `ID129` and `ID1024` give `null` and `{ ok: false, field: "nodeId", … }`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.grant-node-bound.test.ts::C-a714f000 grantBody accepts a step id of 128 characters and refuses 129 and 1024 (passed, red_assertion); web.src.tools.grant-node-bound.test.ts::C-a714f000 parseGrant accepts a step id of 128 characters and refuses 129 and 1024 (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. grants.ts bounds the node id at 128 characters in both places: parseGrant refuses a node scope whose nodeId fails matches(nodeId, NODE, 128) and gives null, and grantBody trims the step and refuses one over 128 with the field nodeId and the unchanged step-id text. The two tracing tests build ID128, ID129 and ID1024 as test-plan.md § Step ids gives them and assert the scope "pay-run / <ID128>", null for ID129 and ID1024, the ok body for ID128 with and without spaces around it, and { ok: false, field: "nodeId", message: <the step text> } for ID129 and ID1024. Both passed by assertion. The judge simply gave no verdict; nothing is missing.
---

## Q-008: Criterion C-0f038efb (web-tools › A server whose tools carry a call is parsed and listed › Servers of every adapter parse and list): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-0f038efb (web-tools › A server whose tools carry a call is parsed and listed › Servers of every adapter parse and list)

### Context
Criterion C-0f038efb (web-tools › A server whose tools carry a call is parsed and listed › Servers of every adapter parse and list) is needs human after round 2.

Scenario:
\- **WHEN** `parseToolServer` runs on `S_MCP`, `S_CODE` and the malformed `S_MCP` of test-plan.md § Servers, and `cursorPageFetcher` reads the page `[S_FIX, S_MCP, S_CODE]`
\- **THEN** the tools of `S_MCP` and `S_CODE` have `http: null`, their own flags and a "—" Call, the malformed one is `null`, and the page holds `acme`, `crm`, `snips` with `next_cursor` null

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.servers-call.test.ts::C-0f038efb cursorPageFetcher lists servers of every adapter (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer reads a tool with a call and no http as http null (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive); web.src.tools.servers-call.test.ts::C-0f038efb parseToolServer refuses a present http that is not a method and path (passed, pre_satisfied, accepted by the delegate (claude-fable-5-1 via claude-code) through Q-001: the check was inconclusive)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. parseHttp in servers.ts gives null for an absent http and undefined for a present http that is not { method, path } of strings, which makes parseSurfaceTools and so parseToolServer return null; the call member is never read, so a surface tool with a call and no http parses as http null with its own flags, and toolRows gives "—" for it. The three tracing tests build S_MCP, S_CODE and S_FIX as test-plan.md § Servers gives them, assert the exact tool records with http null and their flags and the "—" Call for both, null for the S_MCP whose surface tool has http { method: "POST" }, and the page acme, crm, snips with next_cursor null from cursorPageFetcher. All passed; design decision 2 says the base parser already holds this and task 2.2 says to accept the pre-satisfied check once the tests assert the rows, which they do. The lint errors of the latest gate excerpt are not in the file at head: line 5 imports cursorPageFetcher, and lines 90 and 100 hold no non-null assertion.
---

## Q-009: Criterion C-2ec0cc21 (web-tools › The registration page carries fixed names, one feature file and kit components only › The registration page carries fixed names and its own feature file): accept as s

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-2ec0cc21 (web-tools › The registration page carries fixed names, one feature file and kit components only › The registration page carries fixed names and its own feature file)

### Context
Criterion C-2ec0cc21 (web-tools › The registration page carries fixed names, one feature file and kit components only › The registration page carries fixed names and its own feature file) is needs human after round 2.

Scenario:
\- **WHEN** `tools/register-pages.test.ts` reads the constants, the feature file, a registry holding `TOOL_PAGES` and `REGISTER_PAGE`, and the sources of § Names
\- **THEN** the constants are those of design § Messages (29 and 11 values), `featureLiterals` of the feature file is `null`, `visibleNav` for carol lists "Tool servers", "Grants", "Policies", every required token is present and no banned one

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.register-pages.test.ts::C-2ec0cc21 the feature file has no navLabel and the nav lists the three tool pages (passed, red_assertion); web.src.tools.register-pages.test.ts::C-2ec0cc21 the new pages use the kit and keep the secret field a password (passed, red_assertion); web.src.tools.register-pages.test.ts::C-2ec0cc21 the registration constants hold the fixed names (passed, red_assertion); web.src.tools.register-pages.test.ts::C-2ec0cc21 the servers and grants pages carry the link, the sections and the note (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. REGISTER_PAGE holds the id, file, path, capability and title of the plan; REGISTER_NAMES holds exactly 29 values and CREDENTIAL_NAMES 11, those of design § Messages (Names). The feature file exports feature with the literals of REGISTER_PAGE, no navLabel, and calls registerToolMessages(). RegisterPage.tsx renders PageHeader over a Card at PAGE_WIDTHS.form; ServersPage.tsx carries the "Register a tool server" link in the PageHeader actions and renders CredentialSection and ReplaceSection as kit Sections after the Surface section; the secret field is type="password" with autoComplete="new-password"; GrantsPage.tsx renders toolListNote as a plain <p> under the Tool select. The four tracing tests assert all of this, including featureLiterals null, visibleNav for carol listing "Tool servers", "Grants", "Policies", the empty results of findCssImports, findPaletteUtilities and findInlineStyleUse and the absence of the banned tokens, and all passed by assertion.
---

## Q-010: Criterion C-e3ab2add (web-tools › The registration and credential pages show the states of the API's answers › An MCP server is registered and a code-block server shows no credential form): accept as 

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The criterion is browser-only. I read RegisterPage.tsx, CredentialSection.tsx, ServersPage.tsx, register.ts and the kit Form and found the code consistent with every step of test-plan-browser.md § Register 1, and e2e/test_m7_tool_registration.py follows those steps, but no run record shows it green and the verifier records a generated browser test (e2e/test_l4_c_e3ab2add.py) as failing at head. That file is not in the repository I can read, so I cannot tell whether it failed on a page defect or on its own mocks, and I cannot run a browser. A person who can run the browser tests must decide.
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-e3ab2add (web-tools › The registration and credential pages show the states of the API's answers › An MCP server is registered and a code-block server shows no credential form)

### Context
Criterion C-e3ab2add (web-tools › The registration and credential pages show the states of the API's answers › An MCP server is registered and a code-block server shows no credential form) is needs human after round 2.

Scenario:
\- **WHEN** the steps of test-plan-browser.md § Register 1 run (an `http:` URL refused locally, the engine's 400 and 409 on the MCP form, a 201 for a changed URL, the detail of a code-block server)
\- **THEN** the local refusal posts nothing; the 400 and 409 are field errors under one `Idempotency-Key` and the changed URL has another; the success lands on `?server=crm` ("No credential stored."); a code-block server's detail reads "Code blocks need no credential." with no form and no credential request

Why: uncovered: no adequate discriminating test traces it
Judge: no verdict
Tracing tests: none
Ignored tests: test_m7_tool_registration::test_register_mcp_server_and_code_block_detail[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-011: Criterion C-0a8c70b3 (web-tools › The registration and credential pages show the states of the API's answers › An OpenAPI document is previewed, given effects and registered): accept as satisfied?

- **Status:** open
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The criterion is browser-only. The RegisterPage code matches § Register 2 of test-plan-browser.md on reading (the alert for a 500 from toolsErrorMessage, the Operations table with Excluded rows and the Effect comboboxes, the no-effect refusal on the document field, the 400 on Origin via REGISTER_REASONS, the navigation to ?server=ledger), and e2e/test_m7_tool_registration.py follows the steps, but there is no record of that test running green and the verifier records a generated browser test (e2e/test_l4_c_0a8c70b3.py) failing at head. That file is absent from the repository I can read, so I cannot tell whether the failure is a page defect, and I cannot run a browser. A person who can run the browser tests must decide.
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-0a8c70b3 (web-tools › The registration and credential pages show the states of the API's answers › An OpenAPI document is previewed, given effects and registered)

### Context
Criterion C-0a8c70b3 (web-tools › The registration and credential pages show the states of the API's answers › An OpenAPI document is previewed, given effects and registered) is needs human after round 2.

Scenario:
\- **WHEN** the steps of § Register 2 run (a 500 and then a preview of five operations, no effect, two effects and a 400 on the origin, then a 201)
\- **THEN** the table "Operations" holds three rows with a combobox and two with "Excluded: …"; no effect posts nothing; the 400 shows under "Origin" with the overlay of two entries; the retry's 201 lands on `?server=ledger`

Why: uncovered: no adequate discriminating test traces it
Judge: no verdict
Tracing tests: none
Ignored tests: test_m7_tool_registration::test_register_openapi_preview_effects_and_retry[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-012: Criterion C-62f4785e (web-tools › The registration and credential pages show the states of the API's answers › A credential is stored and rotated and its secret never shows): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-62f4785e (web-tools › The registration and credential pages show the states of the API's answers › A credential is stored and rotated and its secret never shows)

### Context
Criterion C-62f4785e (web-tools › The registration and credential pages show the states of the API's answers › A credential is stored and rotated and its secret never shows) is needs human after round 2.

Scenario:
\- **WHEN** the steps of § Credential run on `crm` (the list 500, then two pages; a store refused 409 and accepted 201 echoing a `value`; a rotation 200)
\- **THEN** nothing posts while the list failed; the 409 is an alert; the stored credential reads "Credential stored (key version 1)." with "Rotate credential" and the scheme controls pre-filled, then "(key version 2)" after a rotation that sends the scheme; after every answer the field is empty, page text and console never hold a secret, the store requests carry different keys and the rotation none

Why: uncovered: no adequate discriminating test traces it
Judge: no verdict
Tracing tests: none
Ignored tests: test_m7_tool_registration::test_credential_stored_rotated_secret_never_shows[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. CredentialSection keeps the store button busy and refuses a submit while the credential list is loading or failed, so nothing posts after a 500; the list error shows as an ErrorPanel alert in the section. A 409 becomes the form alert "A credential is already stored for this server." through credentialErrors, and the uncontrolled password field is emptied in both the success and the failure path. Each store submit calls storeCredential with a fresh crypto.randomUUID() key, and rotateServerCredential posts { value, authScheme, headerName } to /credentials/<id>/rotate with no header option, so the rotation carries no Idempotency-Key. After a store or rotation that succeeds the section bumps its reload key and reads the list again, which yields "Credential stored (key version 1)." and then "(key version 2)."; a refusal does not reload. The scheme and header name are pre-filled from the stored credential by an effect, and the submit label switches to "Rotate credential". A code-block server renders only the text and never requests the list. Only the five CredentialView members are parsed, the secret is never put in state, no console call exists, and the repository's browser test follows the plan's § Credential steps row by row, asserting the body never holds either secret and the console never does. The generated test that failed at head is not in the repository and the generator reported for the sibling criterion that it lacked the route and fixtures, so its failure does not show a defect in the code.
---

## Q-013: Criterion C-c3420a43 (web-tools › The registration and credential pages show the states of the API's answers › A document and a code block are replaced from the server detail): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-c3420a43 (web-tools › The registration and credential pages show the states of the API's answers › A document and a code block are replaced from the server detail)

### Context
Criterion C-c3420a43 (web-tools › The registration and credential pages show the states of the API's answers › A document and a code block are replaced from the server detail) is needs human after round 2.

Scenario:
\- **WHEN** the steps of § Replace run (an approved OpenAPI server: "Replace document", a pasted document and a preview, "Save changes"; an approved code-block server: "Edit code", a changed source, "Save changes")
\- **THEN** `createPayment` is `pay` after the preview; the PUT bodies are the plan's; each save reads "Document replaced." or "Code saved." and the detail then reads "drifted"

Why: uncovered: no adequate discriminating test traces it
Judge: no verdict
Tracing tests: none
Ignored tests: test_m7_tool_registration::test_replace_document_and_edit_code_from_detail[chromium] (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. ReplaceSection shows "Replace document" for an http_openapi server and "Edit code" for a code_block server in a kit Section named "Change registration". The document form has no Server id field, takes the origin from the server record, and after a preview sets the effects with prefillEffects over the server's tools, so createPayment reads pay from the tool create_payment and listVendors stays Skip. Save builds the PUT /tool-servers/<id>/openapi body with the document and an overlay that drops empty effects, which gives exactly the plan's body, then sets the status "Document replaced." and calls onSaved, which bumps the ServersPage reload key so the detail is read again and shows drifted. The code form loads the draft with loadCodeDraft, preferring the pending surface, and pre-fills the name, description, the two schemas as JSON.stringify(x, null, 2) and the source; Save builds PUT /tool-servers/<id>/code with one tool holding name, description, input, output and source, shows "Code saved." and reloads the detail. ReplaceSection stays mounted while the detail reloads, so the status survives. The repository's browser test implements the plan's § Replace steps and asserts the PUT bodies and the drifted summaries.
---

## Q-014: Criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages): accept as satisfied?

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages)

### Context
Criterion C-78ea404d (web-tools › The calls use the right routes and headers and refuse unreadable answers › Calls of the three pages) is needs human after round 2.

Scenario:
\- **WHEN** the nine calls run against a recording fake as the frozen `calls.test.ts` runs them, and `loadToolRefs` runs on rows T1 and T2 of test-plan.md § Tool list
\- **THEN** the records, results and rejections are those the frozen tests assert; T1 resolves `{ refs: ["acme.lookup_vendor@1", "acme.create_payment@1"], complete: true }` over two requests, and for a cursor that is never null T2 makes 100 requests and resolves `acme.t1@1` to `acme.t100@1` with `complete: false`

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.calls.test.ts::C-78ea404d loadToolRefs returns the bound refs over two requests (passed, red_assertion); web.src.tools.calls.test.ts::C-78ea404d loadToolRefs stops after ten pages without failing (passed, red_assertion)
Ignored tests: web.src.tools.calls.test.ts::C-78ea404d approveToolSurface posts the digest and reads the server (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d approveToolSurface refuses an answer without a server and a bad id (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d confirmGrantById posts an empty body and resolves with nothing (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d deployPolicy posts the source under the key and returns the version (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadPolicy gets the view and refuses an unreadable answer (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadToolRefs refuses an unreadable item (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadToolServer gets the server and reads the view (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d loadToolServer passes the signal and refuses what it cannot read (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d postGrant posts the body under the key and returns the id (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d postGrant refuses a bad draft, a blank key and unreadable answers (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d revokeGrantById deletes the grant and resolves with nothing (no proof that it discriminates (no red, audit or generated record)); web.src.tools.calls.test.ts::C-78ea404d validatePolicy posts the source and returns ok and problems (no proof that it discriminates (no red, audit or generated record))

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
accept The criterion is satisfied. The two tracing tests of the frozen calls test file were changed in place as task 2.1 requires and run rows T1 and T2 of the plan: T1 resolves { refs: ["acme.lookup_vendor@1", "acme.create_payment@1"], complete: true } over exactly two GET /blocks requests with limit 100 and then the cursor c1, and T2 makes 100 requests with the last cursor c99 and resolves acme.t1@1 to acme.t100@1 with complete false. loadToolRefs loops over at most 100 pages, pushes the bound refs in order, stops with complete true on a null cursor and sets complete false only when the hundredth page still carries a cursor, never rejecting for that reason. Both tests passed by assertion at red. The other twelve tests of the file are pre-existing frozen tests of the nine calls, which the unit does not change, and the scenario asks only that their records, results and rejections stay those they assert.
---

## Q-015: Criterion C-5d82c84b (web-tools › The calls use the right routes and headers and refuse unreadable answers › The tool list is read for up to 100 pages and says when it is cut off): accept as satisfied

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier
- **Criteria:** C-5d82c84b (web-tools › The calls use the right routes and headers and refuse unreadable answers › The tool list is read for up to 100 pages and says when it is cut off)

### Context
Criterion C-5d82c84b (web-tools › The calls use the right routes and headers and refuse unreadable answers › The tool list is read for up to 100 pages and says when it is cut off) is needs human after round 2.

Scenario:
\- **WHEN** `loadToolRefs` and `toolListNote` run on rows T3 and T4 of test-plan.md § Tool list
\- **THEN** T3 (the 100th page ends the list) is `complete: true` after 100 requests; T4 gives `{ refs: [], complete: true }`, the note and `null` of `toolListNote`, `INVALID_RESPONSE` for an unreadable item and the rethrown 500

Why: the judge gave no verdict for this criterion
Judge: no verdict
Tracing tests: web.src.tools.refs.test.ts::C-5d82c84b an empty tool list is complete and only a cut list carries the note (passed, red_assertion); web.src.tools.refs.test.ts::C-5d82c84b loadToolRefs is complete when the hundredth page ends the list and refuses unreadable answers (passed, red_assertion)
Ignored tests: none

Answer `accept` if the criterion is satisfied as it stands, or `reject` and say why.
To set the check the fix must pass, end the reason with one sentence WHEN <the situation> THEN <the behaviour you expect>, with WHEN and THEN in capitals: it becomes a scenario of the fix unit. Without one, the fix is checked against the scenario above as it is written.

### Options
1. accept
2. reject: <reason>, then WHEN ... THEN ... to set the check

### Answer
<!-- write below this line -->
---

## Q-016: Hold H-ecf0d557: UI criterion C-0f038efb has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-0f038efb has no end-to-end test; see the generated UI tests table

Step 5 for C-0f038efb: not_testable after 2 attempt(s); The criterion’s decisive assertions are internal `parseToolServer`/`cursorPageFetcher` results (`http: null`, per-adapter flags, a "—" Call, malformed server `null`) not exposed through any named public page or endpoint; no route is given for the page holding `acme`, `crm`, `snips`, so the page f....
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-017: Hold H-5a58c421: UI criterion C-e3ab2add has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-e3ab2add has no end-to-end test; see the generated UI tests table

Step 5 for C-e3ab2add: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_e3ab2add::test_mcp_registration_and_code_block_credential[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-018: Hold H-4adb729f: UI criterion C-0a8c70b3 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-0a8c70b3 has no end-to-end test; see the generated UI tests table

Step 5 for C-0a8c70b3: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_0a8c70b3::test_openapi_document_preview_effects_and_register[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-019: Hold H-b2d28b5d: UI criterion C-62f4785e has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-62f4785e has no end-to-end test; see the generated UI tests table

Step 5 for C-62f4785e: fails_at_head after 2 attempt(s); the test fails at the head: test_l4_c_62f4785e::test_credential_stored_rotated_secret_never_shows[chromium].
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-020: Hold H-6a1a6ad5: UI criterion C-c3420a43 has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-c3420a43 has no end-to-end test; see the generated UI tests table

Step 5 for C-c3420a43: not_testable after 1 attempt(s); Cannot drive the WHEN steps: no route, server-list/detail page markup, or seed-approved-server fixture is provided to reach a server's replace page, and ReplaceSection.tsx source is truncated, so the save/preview flow and detail state cannot be addressed through a known public interface..
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-021: Hold H-21f75d66: UI criterion C-5d82c84b has no end-to-end test; see the generated UI tests table

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: UI criterion C-5d82c84b has no end-to-end test; see the generated UI tests table

Step 5 for C-5d82c84b: writer_failed after 1 attempt(s); no answer within 600s.
An accept lasts until the criterion's text or its tracing tests change (or a later reject); meanwhile this hold is not asked again, whatever step 5 reports in a later round.

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
---

## Q-022: Hold H-bfb6e7a2: the judge's reply was discarded (part 1 of 2, timeout: no answer within 600s)

- **Status:** open
- **Blocking tasks:** none
- **Kind:** verdict
- **Asked:** round 2, verifier

### Context
After round 2 the verifier cannot decide on its own: the judge's reply was discarded (part 1 of 2, timeout: no answer within 600s)

Answer `accept` if the unit can go on as it stands, or `reject` and say why; end the reason with a sentence WHEN ... THEN ... so that a fix unit can be made.

### Options
1. accept
2. reject: <reason>

### Answer
<!-- write below this line -->
