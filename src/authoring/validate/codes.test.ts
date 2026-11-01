import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FLOW_ERROR_CODES,
  FLOW_RESERVED_CODES,
  FLOW_WARNING_CODES,
} from "./codes.ts";

const EXPECTED_ERROR_CODES: readonly string[] = [
  "L1_PARSE",
  "L1_REQUIRED",
  "L1_ADDITIONAL_PROPERTY",
  "L1_TYPE",
  "L1_CONST",
  "L1_ENUM",
  "L1_UNKNOWN_KIND",
  "L1_PATTERN",
  "L1_MIN_ITEMS",
  "L1_UNIQUE_ITEMS",
  "L1_RANGE",
  "L1_MIN_LENGTH",
  "L1_MIN_PROPERTIES",
  "L1_FOREACH_BODY",
  "L1_INVALID_JSON_SCHEMA",
  "L1_REF_SYNTAX",
  "L1_REF_NOT_ALLOWED",
  "L1_CODE_SYNTAX",
  "L1_CODE_NO_RETURN",
  "L2_UNKNOWN_BLOCK",
  "L2_WITH_MISSING_REQUIRED",
  "L2_WITH_UNKNOWN_PARAM",
  "L2_UNKNOWN_ROLE",
  "L2_UNKNOWN_DELEGATE_TARGET",
  "L2_UNKNOWN_DELEGATE_WORKFLOW",
  "L2_UNKNOWN_FLOW",
  "L2_UNKNOWN_MODEL_PROFILE",
  "L2_START_UNKNOWN",
  "L2_UNKNOWN_SUCCESSOR",
  "L2_MISSING_SUCCESSOR",
  "L2_UNREACHABLE_NODE",
  "L2_CYCLE",
  "L2_NO_END",
  "L2_DECIDE_CASE_MISSING",
  "L2_DECIDE_CASE_EXTRA",
  "L3_REF_UNKNOWN_NODE",
  "L3_REF_NOT_DOMINATING",
  "L3_REF_UNKNOWN_PATH",
  "L3_REF_NO_OUTPUT",
  "L3_REF_OUTCOME_NOT_DECIDE",
  "L3_ITEM_OUTSIDE_FOREACH",
  "L3_TYPE_MISMATCH",
  "L3_ENUM_VIOLATION",
  "L3_SWITCH_ON_TYPE",
  "L3_SWITCH_KEY_INCOMPATIBLE",
  "L3_TAINT_TO_CONSEQUENTIAL",
  "L3_TAINT_TO_AGENT_WITH_EFFECTS",
];

const EXPECTED_WARNING_CODES: readonly string[] = [
  "W_LETHAL_TRIFECTA",
  "W_TAINT_TO_OPAQUE_CALL",
  "W_OPTIONAL_REFERENCE",
  "W_SUSPICIOUS_INTERPOLATION",
  "W_CODE_FORBIDDEN_API",
];

const EXPECTED_RESERVED_CODES: readonly string[] = ["INTERNAL_ERROR"];

test("C-8919e1d9 The code lists are exact", () => {
  assert.equal(FLOW_ERROR_CODES.length, 47, "there are 47 error codes");
  assert.equal(new Set(FLOW_ERROR_CODES).size, 47, "error codes are distinct");

  const firstGroup = FLOW_ERROR_CODES.slice(0, 19);
  const secondGroup = FLOW_ERROR_CODES.slice(19, 35);
  const thirdGroup = FLOW_ERROR_CODES.slice(35);
  assert.equal(firstGroup.length, 19);
  assert.equal(secondGroup.length, 16);
  assert.equal(thirdGroup.length, 12);
  assert.ok(
    firstGroup.every((code) => code.startsWith("L1_")),
    "the first 19 codes are L1 codes",
  );
  assert.ok(
    secondGroup.every((code) => code.startsWith("L2_")),
    "the next 16 codes are L2 codes",
  );
  assert.ok(
    thirdGroup.every((code) => code.startsWith("L3_")),
    "the last 12 codes are L3 codes",
  );
  assert.deepEqual(
    [...FLOW_ERROR_CODES],
    [...EXPECTED_ERROR_CODES],
    "the error codes are exactly the codes of codes.md in order",
  );

  assert.deepEqual(
    [...FLOW_WARNING_CODES],
    [...EXPECTED_WARNING_CODES],
    "the warning codes are exactly the warning codes of codes.md in order",
  );

  assert.deepEqual(
    [...FLOW_RESERVED_CODES],
    [...EXPECTED_RESERVED_CODES],
    "the reserved code is INTERNAL_ERROR",
  );

  const allCodes = [
    ...FLOW_ERROR_CODES,
    ...FLOW_WARNING_CODES,
    ...FLOW_RESERVED_CODES,
  ];
  assert.equal(
    new Set(allCodes).size,
    allCodes.length,
    "no code appears in two lists",
  );
});
