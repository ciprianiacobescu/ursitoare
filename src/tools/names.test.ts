import assert from "node:assert/strict";
import { test } from "node:test";

import { toolNameOf } from "./names.ts";

interface NameCase {
  readonly input: string;
  readonly expected: string | null;
}

const CASES: readonly NameCase[] = [
  { input: "createPayment", expected: "create_payment" },
  { input: "admin.tools.list", expected: "admin_tools_list" },
  { input: "getHTTPStatus", expected: "get_httpstatus" },
  { input: "9lives", expected: "t_9lives" },
  { input: "naïve.tool", expected: "na_ve_tool" },
  { input: "a".repeat(70), expected: "a".repeat(64) },
  { input: "9".repeat(70), expected: `t_${"9".repeat(62)}` },
  { input: "--", expected: null },
  { input: "", expected: null },
];

test("C-8d392fff toolNameOf maps an external tool name to a tool name", () => {
  for (const { input, expected } of CASES) {
    assert.doesNotThrow(
      () => assert.equal(toolNameOf(input), expected),
      `toolNameOf(${JSON.stringify(input)})`,
    );
  }
});
