/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  codeRegistration,
  codeReplacement,
  mcpRegistration,
  openApiRegistration,
  openApiReplacement,
  previewRequest,
  type CodeDraft,
  type McpDraft,
  type OpenApiDraft,
} from "./register.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

const ID =
  "Enter a server id: lowercase letters, digits and underscores, starting with a letter, up to 32 characters.";
const URL_T = "Enter a full URL, such as https://mcp.example.com/mcp.";
const SCHEME = 'Use https, or tick "Local network server" for an http address.';
const ORIGIN_T = "Enter a full origin, such as https://tools.example.com.";
const DOC_T = "Paste the OpenAPI document as a JSON object.";
const INPUT_T = "Enter the input schema as a JSON object.";
const OUTPUT_T = "Enter the output schema as a JSON object.";
const NO_EFFECT = "Choose an effect for at least one operation.";

const DOC_TEXT = '{"openapi":"3.0.3","paths":{}}';
const DOC = { openapi: "3.0.3", paths: {} };
const IN_TEXT = '{"type":"object"}';
const IO = { type: "object" };
const SOURCE = "return { words: 1 };";

function refuse(field: string, message: string): unknown {
  return { ok: false, field, message };
}

function unchanged<T>(draft: T, run: () => unknown): void {
  const before = JSON.stringify(draft);
  run();
  assert.equal(JSON.stringify(draft), before, "the draft is not changed");
}

const MCP: McpDraft = { id: "crm", url: "https://mcp.fake.test/mcp", local: false };

test("C-3ad08589 mcpRegistration builds the trimmed MCP body and refuses the id before the url", () => {
  const padded: McpDraft = { id: " crm ", url: " https://mcp.fake.test/mcp ", local: false };
  const before = JSON.stringify(padded);
  assert.deepEqual(call(() => mcpRegistration(padded)), {
    ok: true,
    path: "/tool-registrations/mcp",
    body: { id: "crm", url: "https://mcp.fake.test/mcp", local: false },
  });
  assert.equal(JSON.stringify(padded), before, "the padded draft is not changed");

  for (const id of ["Crm", ""]) {
    unchanged({ ...MCP, id }, () =>
      assert.deepEqual(call(() => mcpRegistration({ ...MCP, id })), refuse("id", ID), id),
    );
  }
  for (const url of ["", "not a url"]) {
    assert.deepEqual(call(() => mcpRegistration({ ...MCP, url })), refuse("url", URL_T), url);
  }
  for (const url of ["http://mcp.fake.test/mcp", "ftp://mcp.fake.test/mcp"]) {
    assert.deepEqual(
      call(() => mcpRegistration({ ...MCP, url, local: true })),
      refuse("url", SCHEME),
      url,
    );
  }
});

test("C-3ad08589 mcpRegistration keeps a local http address as typed", () => {
  const draft: McpDraft = { id: "crm", url: "http://127.0.0.1:8080/mcp", local: true };
  assert.deepEqual(call(() => mcpRegistration(draft)), {
    ok: true,
    path: "/tool-registrations/mcp",
    body: { id: "crm", url: "http://127.0.0.1:8080/mcp", local: true },
  });
});

const OPENAPI: OpenApiDraft = {
  id: "ledger",
  origin: "https://tools.fake.test",
  local: false,
  documentText: DOC_TEXT,
  effects: { createPayment: "pay", listVendors: "", "get-vendor.v1": "read" },
};

test("C-3ad08589 previewRequest sends the origin it parses and the document, refusing origin first", () => {
  const draft: OpenApiDraft = { ...OPENAPI, origin: "https://Tools.Fake.Test/" };
  assert.deepEqual(call(() => previewRequest(draft)), {
    ok: true,
    path: "/tool-registrations/openapi/preview",
    body: { origin: "https://tools.fake.test", local: false, document: DOC },
  });

  for (const origin of ["", "tools"]) {
    assert.deepEqual(
      call(() => previewRequest({ ...OPENAPI, origin })),
      refuse("origin", ORIGIN_T),
      origin,
    );
  }
  assert.deepEqual(
    call(() => previewRequest({ ...OPENAPI, origin: "http://tools.fake.test" })),
    refuse("origin", SCHEME),
  );
  for (const documentText of ["  ", "{", "[1]"]) {
    assert.deepEqual(
      call(() => previewRequest({ ...OPENAPI, documentText })),
      refuse("document", DOC_T),
      documentText,
    );
  }
  assert.deepEqual(
    call(() => previewRequest({ ...OPENAPI, origin: "", documentText: "{" })),
    refuse("origin", ORIGIN_T),
    "the origin fails before the document",
  );
});

test("C-3ad08589 openApiRegistration builds the overlay of the chosen effects and refuses the first failing field", () => {
  const draft: OpenApiDraft = { ...OPENAPI, origin: "https://Tools.Fake.Test/" };
  const before = JSON.stringify(draft);
  assert.deepEqual(call(() => openApiRegistration(draft)), {
    ok: true,
    path: "/tool-registrations/openapi",
    body: {
      id: "ledger",
      origin: "https://tools.fake.test",
      local: false,
      document: DOC,
      overlay: {
        operations: {
          createPayment: { effect: "pay" },
          "get-vendor.v1": { effect: "read" },
        },
      },
    },
  });
  assert.equal(JSON.stringify(draft), before, "the draft is not changed");

  for (const effects of [{ createPayment: "" }, {}] as const) {
    assert.deepEqual(
      call(() => openApiRegistration({ ...OPENAPI, effects })),
      refuse("document", NO_EFFECT),
    );
  }
  assert.deepEqual(
    call(() => openApiRegistration({ ...OPENAPI, id: "", origin: "", effects: {} })),
    refuse("id", ID),
    "the id fails first",
  );
});

const CODE: CodeDraft = {
  id: "snips",
  name: "word_count",
  description: "",
  inputText: IN_TEXT,
  outputText: IN_TEXT,
  source: SOURCE,
};

test("C-3ad08589 codeRegistration builds one tool without a description and one with it", () => {
  const before = JSON.stringify(CODE);
  assert.deepEqual(call(() => codeRegistration(CODE)), {
    ok: true,
    path: "/tool-registrations/code",
    body: {
      id: "snips",
      tools: [{ name: "word_count", input: IO, output: IO, source: SOURCE }],
    },
  });
  assert.equal(JSON.stringify(CODE), before, "the draft is not changed");

  const described: CodeDraft = { ...CODE, description: " Counts words. " };
  assert.deepEqual(call(() => codeRegistration(described)), {
    ok: true,
    path: "/tool-registrations/code",
    body: {
      id: "snips",
      tools: [
        {
          name: "word_count",
          description: "Counts words.",
          input: IO,
          output: IO,
          source: SOURCE,
        },
      ],
    },
  });
});

test("C-3ad08589 codeRegistration refuses the input before the output schema", () => {
  for (const inputText of ["[]", ""]) {
    assert.deepEqual(
      call(() => codeRegistration({ ...CODE, inputText })),
      refuse("input", INPUT_T),
      inputText,
    );
  }
  for (const outputText of ["{", "5"]) {
    assert.deepEqual(
      call(() => codeRegistration({ ...CODE, outputText })),
      refuse("output", OUTPUT_T),
      outputText,
    );
  }
});

const C3: CodeDraft = { ...CODE, description: " Counts words. " };

test("C-3ad08589 the replacement builders build the PUT bodies and refuse a bad server id", () => {
  assert.deepEqual(call(() => openApiReplacement("ledger", OPENAPI)), {
    ok: true,
    path: "/tool-servers/ledger/openapi",
    body: {
      document: DOC,
      overlay: {
        operations: {
          createPayment: { effect: "pay" },
          "get-vendor.v1": { effect: "read" },
        },
      },
    },
  });
  assert.deepEqual(call(() => codeReplacement("snips", C3)), {
    ok: true,
    path: "/tool-servers/snips/code",
    body: {
      tools: [
        {
          name: "word_count",
          description: "Counts words.",
          input: IO,
          output: IO,
          source: SOURCE,
        },
      ],
    },
  });
});

test("C-3ad08589 openApiReplacement checks the document and overlay and ignores the origin", () => {
  assert.deepEqual(
    call(() => openApiReplacement("ledger", { ...OPENAPI, effects: {} })),
    refuse("document", NO_EFFECT),
  );
  assert.deepEqual(
    call(() => openApiReplacement("ledger", { ...OPENAPI, documentText: "{" })),
    refuse("document", DOC_T),
  );
  assert.deepEqual(call(() => openApiReplacement("ledger", { ...OPENAPI, origin: "" })), {
    ok: true,
    path: "/tool-servers/ledger/openapi",
    body: {
      document: DOC,
      overlay: {
        operations: {
          createPayment: { effect: "pay" },
          "get-vendor.v1": { effect: "read" },
        },
      },
    },
  });
  assert.throws(() => openApiReplacement("Ledger", OPENAPI), RangeError);
});

test("C-3ad08589 codeReplacement checks the schemas and refuses a server id off the pattern", () => {
  assert.deepEqual(
    call(() => codeReplacement("snips", { ...C3, inputText: "[]" })),
    refuse("input", INPUT_T),
  );
  assert.throws(() => codeReplacement("a/b", C3), RangeError);
});

test("C-3ad08589 no builder changes the draft it is given", () => {
  const mcp: McpDraft = { id: " crm ", url: " https://mcp.fake.test/mcp ", local: false };
  const openapi: OpenApiDraft = { ...OPENAPI, origin: "https://Tools.Fake.Test/" };
  const code: CodeDraft = { ...CODE, description: " Counts words. " };
  const drafts: [object, () => unknown][] = [
    [mcp, () => mcpRegistration(mcp)],
    [mcp, () => mcpRegistration({ ...mcp, id: "Crm" })],
    [openapi, () => previewRequest(openapi)],
    [openapi, () => previewRequest({ ...openapi, documentText: "{" })],
    [openapi, () => openApiRegistration(openapi)],
    [openapi, () => openApiRegistration({ ...openapi, effects: {} })],
    [openapi, () => openApiReplacement("ledger", openapi)],
    [openapi, () => openApiReplacement("ledger", { ...openapi, documentText: "{" })],
    [code, () => codeRegistration(code)],
    [code, () => codeRegistration({ ...code, inputText: "[]" })],
    [code, () => codeReplacement("snips", code)],
    [code, () => codeReplacement("snips", { ...code, outputText: "5" })],
  ];
  for (const [draft, run] of drafts) {
    unchanged(draft, run);
  }
});
