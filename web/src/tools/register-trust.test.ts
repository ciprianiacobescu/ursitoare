/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { openApiRegistration, type OpenApiDraft } from "./register.ts";
import type { Carried, DataClass, ToolTrust } from "./trust.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

type TrustDraft = OpenApiDraft & {
  trust?: Readonly<Record<string, ToolTrust>>;
  carried?: Readonly<Record<string, Carried>>;
};

const DOC_TEXT = '{"a":1}';
const DOC = { a: 1 };

const BASE: OpenApiDraft = {
  id: "ledger",
  origin: "https://Tools.Fake.Test/",
  local: false,
  documentText: DOC_TEXT,
  effects: { createPayment: "pay", "get-vendor.v1": "read", x: "" },
};

function trust(trusted: boolean, dataClass: DataClass | null): ToolTrust {
  return { trusted, dataClass };
}

test("C-7b68e67c openApiRegistration builds the overlay from trust and carried fields (RG0, RG1)", () => {
  const draft: TrustDraft = {
    ...BASE,
    effects: {
      createPayment: "pay",
      getVendor: "read",
      listVendors: "",
      toString: "read",
    } as const,
    trust: {
      createPayment: trust(true, "private"),
      getVendor: trust(false, "public"),
      listVendors: trust(true, null),
    },
    carried: {
      createPayment: { unsafe_to_retry: false },
      getVendor: { name: "get_it" },
    },
  };
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
          createPayment: {
            effect: "pay",
            untrusted_result: false,
            unsafe_to_retry: false,
            data_class: "private",
          },
          getVendor: { effect: "read", name: "get_it", data_class: "public" },
          toString: { effect: "read" },
        },
      },
    },
  });

  assert.deepEqual(call(() => openApiRegistration(BASE)), {
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
});

test("C-7b68e67c openApiRegistration throws RangeError for a data class off the list (RG2)", () => {
  const draft: TrustDraft = {
    ...BASE,
    trust: {
      createPayment: {
        trusted: false,
        dataClass: "secret" as unknown as DataClass,
      },
    },
  };
  assert.throws(() => openApiRegistration(draft), RangeError);
});
