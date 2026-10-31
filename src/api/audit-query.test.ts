import assert from "node:assert/strict";
import { test } from "node:test";

import { parseAuditQuery, parseDecisionQuery, parseVerifyQuery } from "./audit-query.ts";
import { ApiError } from "./errors.ts";

assert.equal(typeof parseAuditQuery, "function");
assert.equal(typeof parseDecisionQuery, "function");
assert.equal(typeof parseVerifyQuery, "function");

const UTC_EXAMPLE = "must be a UTC time such as 2026-10-25T09:00:00Z";

interface Field {
  field?: string;
  message?: string;
}

function parseAudit(query: unknown): unknown {
  let result: unknown;
  assert.doesNotThrow(() => {
    result = parseAuditQuery(query);
  }, `parseAuditQuery accepts ${JSON.stringify(query)}`);
  return result;
}

function parseDecision(query: unknown): unknown {
  let result: unknown;
  assert.doesNotThrow(() => {
    result = parseDecisionQuery(query);
  }, `parseDecisionQuery accepts ${JSON.stringify(query)}`);
  return result;
}

function parseVerify(query: unknown): { fromSeq: bigint } {
  let result: { fromSeq: bigint } | undefined;
  assert.doesNotThrow(() => {
    result = parseVerifyQuery(query);
  }, `parseVerifyQuery accepts ${JSON.stringify(query)}`);
  return result as { fromSeq: bigint };
}

function refuses(parse: () => unknown, field: string, message?: string): void {
  assert.throws(
    parse,
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(error.status, 400, `refuses ${field} with 400`);
      assert.equal(error.code, "VALIDATION_FAILED", `refuses ${field} with VALIDATION_FAILED`);
      const fields = (error.details as { fields?: Field[] } | undefined)?.fields ?? [];
      assert.equal(fields[0]?.field, field, `refuses with field ${field}`);
      if (message !== undefined) {
        assert.equal(fields[0]?.message, message, `refuses ${field} with the expected message`);
      }
      return true;
    },
    `refuses ${field}`,
  );
}

test("C-d87feac3 the audit query parser answers defaults and parses filters", () => {
  assert.deepEqual(parseAudit({}), {
    page: { limit: 50, cursor: null },
    order: "desc",
    filter: {},
  });
  assert.deepEqual(
    parseAudit({ limit: "25", event_type: "role.granted", from: "2026-10-25T09:00:00Z" }),
    {
      page: { limit: 25, cursor: null },
      order: "desc",
      filter: { eventType: "role.granted", from: "2026-10-25T09:00:00Z" },
    },
  );
  assert.deepEqual(parseAudit({ order: "asc", cursor: "abc", after_seq: "0" }), {
    page: { limit: 50, cursor: "abc" },
    order: "asc",
    filter: { afterSeq: "0" },
  });
  assert.deepEqual(
    parseAudit({ from: "2026-10-25T09:00:00Z", to: "2026-10-25T09:00:00.000001Z" }),
    {
      page: { limit: 50, cursor: null },
      order: "desc",
      filter: { from: "2026-10-25T09:00:00Z", to: "2026-10-25T09:00:00.000001Z" },
    },
  );
});

test("C-d87feac3 the audit query parser refuses bad options", () => {
  refuses(
    () => parseAuditQuery({ to: "2026-10-25T09:00:00Z", from: "2026-10-25T09:00:00Z" }),
    "querystring/to",
    "must be after from",
  );
  refuses(
    () => parseAuditQuery({ from: "2026-10-25T09:00:00.1Z" }),
    "querystring/from",
    UTC_EXAMPLE,
  );
  refuses(() => parseAuditQuery({ nope: "1" }), "querystring/nope", "is not allowed");
  refuses(() => parseAuditQuery({ order: ["asc"] }), "querystring/order", "is invalid");
});

test("C-061beb81 the policy decision query parser parses its filters", () => {
  assert.deepEqual(
    parseDecision({ decision: "deny", principal: "p", run_id: "r", decision_id: "d" }),
    {
      page: { limit: 50, cursor: null },
      order: "desc",
      filter: { decision: "deny", principal: "p", runId: "r", decisionId: "d" },
    },
  );
});

test("C-061beb81 the policy decision query parser refuses an empty run id", () => {
  refuses(() => parseDecisionQuery({ run_id: "" }), "querystring/run_id");
});

test("C-bfe35eee the verify query parser defaults and parses from_seq", () => {
  assert.deepEqual(parseVerify({}), { fromSeq: 1n });
  assert.deepEqual(parseVerify({ from_seq: "7" }), { fromSeq: 7n });
});
