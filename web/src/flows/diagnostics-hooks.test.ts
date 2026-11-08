/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  diagnosticHref,
  diagnosticRows,
  diagnosticsSummary,
  parseValidation,
} from "./diagnostics.ts";

const DOCS_BASE = "https://github.com/ciprianiacobescu/ursitoare/blob/main/";
const DOCS_PATH = "docs/authoring/diagnostics.md";

const V = {
  ok: false,
  errors: [
    {
      layer: "H",
      code: "H_ROUTE_EFFECT",
      node: "classify",
      path: "/nodes/classify/post/0/routes/0",
      message: "hook rush may route to pay",
    },
  ],
  warnings: [
    {
      layer: "H",
      code: "W_NO_MATCH",
      node: null,
      path: "/hooks/0",
      message: "rule matches no node",
    },
  ],
  layers_run: ["L1", "L2", "L3", "H"],
};

test("C-822061e0 parseValidation accepts layer H and refuses other layers", () => {
  const result = parseValidation(V);
  assert.ok(result !== null, "an H validation result is parsed");
  assert.deepEqual(result, V, "the H result is kept whole");

  assert.equal(
    parseValidation({ ...V, layers_run: ["L9"] }),
    null,
    "an unknown layer in layers_run is refused",
  );
  assert.equal(
    parseValidation({
      ...V,
      errors: [
        {
          layer: "L9",
          code: "H_ROUTE_EFFECT",
          node: "classify",
          path: "/nodes/classify/post/0/routes/0",
          message: "hook rush may route to pay",
        },
      ],
    }),
    null,
    "an issue with an unknown layer is refused",
  );
  assert.equal(
    parseValidation({ ...V, layers_run: ["h"] }),
    null,
    "a lower-case layer name is refused",
  );
});

test("C-822061e0 diagnostic rows and summary show an H issue", () => {
  const result = parseValidation(V);
  assert.ok(result !== null, "an H validation result is parsed");

  assert.deepEqual(diagnosticRows(result), [
    {
      key: "error:0",
      severity: "error",
      code: "H_ROUTE_EFFECT",
      message: "hook rush may route to pay",
      where: "Node classify · /nodes/classify/post/0/routes/0",
      href: `${DOCS_BASE}${DOCS_PATH}#h_route_effect`,
      linkText: "Guide for H_ROUTE_EFFECT (opens in a new tab)",
      path: "/nodes/classify/post/0/routes/0",
      position: null,
    },
    {
      key: "warning:0",
      severity: "warning",
      code: "W_NO_MATCH",
      message: "rule matches no node",
      where: "/hooks/0",
      href: `${DOCS_BASE}${DOCS_PATH}#w_no_match`,
      linkText: "Guide for W_NO_MATCH (opens in a new tab)",
      path: "/hooks/0",
      position: null,
    },
  ]);

  assert.equal(
    diagnosticsSummary(result, null),
    "Not valid. 1 error, 1 warning. Layers run: L1, L2, L3, H.",
  );
});

test("C-822061e0 diagnosticHref links hook codes and refuses other shapes", () => {
  assert.equal(diagnosticHref("H_ROUTE_EFFECT"), `${DOCS_BASE}${DOCS_PATH}#h_route_effect`);
  assert.equal(diagnosticHref("H_CYCLE"), `${DOCS_BASE}${DOCS_PATH}#h_cycle`);
  assert.equal(diagnosticHref("W_NO_MATCH"), `${DOCS_BASE}${DOCS_PATH}#w_no_match`);
  assert.equal(diagnosticHref("H_"), null, "an empty H code is refused");
  assert.equal(diagnosticHref("H_lower"), null, "a lower-case H code is refused");
  assert.equal(diagnosticHref("HOOK_X"), null, "a code without the H_ prefix is refused");
  assert.equal(diagnosticHref("X_ROUTE"), null, "an unknown prefix is refused");
});
