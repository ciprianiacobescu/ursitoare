/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { registerToolMessages } from "./messages.ts";
import {
  credentialBody,
  credentialErrors,
  credentialText,
  parseCredential,
  type CredentialDraft,
  type CredentialView,
} from "./credentials.ts";

registerToolMessages();

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

const HDR_T = "Enter a header name of 1 to 64 letters, digits and hyphens.";
const RESERVED = "That header name is reserved.";
const VAL_T = "Enter the secret value: 1 to 4096 printable ASCII characters, no spaces.";

const BASE: CredentialView = {
  id: "cred_1",
  toolServerId: "crm",
  authScheme: "BEARER_TOKEN",
  headerName: null,
  keyVersion: 1,
};

function CV(over: Partial<CredentialView> = {}): CredentialView {
  return { ...BASE, ...over };
}

function CREC(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...CV(),
    serviceId: "svc_1",
    targetOrigin: "https://mcp.fake.test",
    provisionedBy: "u_carol",
    provisionedAt: "2026-11-09T10:00:00.000000Z",
    rotatedAt: null,
    ...over,
  };
}

function withoutKeyVersion(): Record<string, unknown> {
  const record = CREC();
  delete record["keyVersion"];
  return record;
}

test("C-9153e19d parseCredential reads the five members and never a secret", () => {
  assert.deepEqual(call(() => parseCredential(CREC())), CV());
  assert.deepEqual(
    call(() => parseCredential(CREC({ authScheme: "API_KEY_HEADER", headerName: "x-api-key" }))),
    CV({ authScheme: "API_KEY_HEADER", headerName: "x-api-key" }),
  );

  const hostile = call(() => parseCredential(CREC({ value: "s3cr3t", secret: "s3cr3t" })));
  assert.deepEqual(hostile, CV());
  assert.ok(!JSON.stringify(hostile).includes("s3cr3t"), "the view does not hold the secret");
});

test("C-9153e19d parseCredential refuses the malformed records", () => {
  const malformed: [string, unknown][] = [
    ["not a record", null],
    ["bad id", CREC({ id: "a b" })],
    ["bad server id", CREC({ toolServerId: "Crm" })],
    ["unknown scheme", CREC({ authScheme: "BASIC" })],
    ["bad header name", CREC({ headerName: "a b" })],
    ["zero key version", CREC({ keyVersion: 0 })],
    ["string key version", CREC({ keyVersion: "1" })],
    ["no key version", withoutKeyVersion()],
  ];
  for (const [label, raw] of malformed) {
    assert.equal(call(() => parseCredential(raw)), null, label);
  }
});

test("C-9153e19d credentialBody builds the bearer and API key bodies", () => {
  const bearer: CredentialDraft = {
    authScheme: "BEARER_TOKEN",
    headerName: "ignored",
    value: "tok_123",
  };
  assert.deepEqual(call(() => credentialBody("crm", bearer)), {
    ok: true,
    body: { toolServerId: "crm", authScheme: "BEARER_TOKEN", value: "tok_123" },
  });

  const apiKey: CredentialDraft = {
    authScheme: "API_KEY_HEADER",
    headerName: " x-api-key ",
    value: "k-1",
  };
  assert.deepEqual(call(() => credentialBody("crm", apiKey)), {
    ok: true,
    body: {
      toolServerId: "crm",
      authScheme: "API_KEY_HEADER",
      headerName: "x-api-key",
      value: "k-1",
    },
  });
});

test("C-9153e19d credentialBody refuses the header before the value and a bad server id", () => {
  for (const headerName of ["", "x api"]) {
    assert.deepEqual(
      call(() => credentialBody("crm", { authScheme: "API_KEY_HEADER", headerName, value: "k-1" })),
      { ok: false, field: "headerName", message: HDR_T },
      headerName,
    );
  }
  assert.deepEqual(
    call(() =>
      credentialBody("crm", {
        authScheme: "API_KEY_HEADER",
        headerName: "Authorization",
        value: "k-1",
      }),
    ),
    { ok: false, field: "headerName", message: RESERVED },
  );

  for (const value of ["", "s3 cr3t", "x".repeat(4097)]) {
    const refused = call(() =>
      credentialBody("crm", { authScheme: "BEARER_TOKEN", headerName: "", value }),
    );
    assert.deepEqual(refused, { ok: false, field: "value", message: VAL_T });
    assert.ok(!JSON.stringify(refused).includes("s3"), "no message holds the value");
  }

  const longest = "x".repeat(4096);
  assert.deepEqual(
    call(() => credentialBody("crm", { authScheme: "BEARER_TOKEN", headerName: "", value: longest })),
    { ok: true, body: { toolServerId: "crm", authScheme: "BEARER_TOKEN", value: longest } },
  );

  assert.deepEqual(
    call(() => credentialBody("crm", { authScheme: "API_KEY_HEADER", headerName: "", value: "" })),
    { ok: false, field: "headerName", message: HDR_T },
    "the header fails before the value",
  );

  assert.throws(
    () => credentialBody("Crm", { authScheme: "BEARER_TOKEN", headerName: "", value: "k-1" }),
    RangeError,
  );
});

test("C-9153e19d credentialText says when a credential is missing or stored and a code block needs none", () => {
  assert.equal(call(() => credentialText(null, "mcp")), "No credential stored.");
  assert.equal(
    call(() => credentialText(CV(), "http_openapi")),
    "Credential stored (key version 1).",
  );
  assert.equal(
    call(() => credentialText(CV({ keyVersion: 2 }), "mcp")),
    "Credential stored (key version 2).",
  );
  assert.equal(
    call(() => credentialText(CV(), "code_block")),
    "Code blocks need no credential.",
  );
  assert.equal(
    call(() => credentialText(CV({ keyVersion: 2 }), "code_block")),
    "Code blocks need no credential.",
    "a code block needs no credential whatever is stored",
  );
});

function validation(fields: { field: string; message: string }[]): ApiRequestError {
  return new ApiRequestError(400, "VALIDATION_FAILED", "m", { details: { fields } });
}

test("C-9153e19d credentialErrors maps the conflict, the code-block refusal, the vault and the fields", () => {
  assert.deepEqual(
    call(() => credentialErrors(new ApiRequestError(409, "ALREADY_EXISTS", "m"))),
    { $form: "A credential is already stored for this server." },
  );
  assert.deepEqual(
    call(() =>
      credentialErrors(
        new ApiRequestError(422, "OPERATION_REFUSED", "m", {
          details: { reason: "no_credential_needed" },
        }),
      ),
    ),
    { $form: "Code blocks need no credential." },
  );
  assert.deepEqual(
    call(() => credentialErrors(new ApiRequestError(503, "EGRESS_UNAVAILABLE", "m"))),
    { $form: "The credential vault is unavailable. Try again in a moment." },
  );
  assert.deepEqual(
    call(() =>
      credentialErrors(
        validation([
          { field: "body/value", message: "m1" },
          { field: "body/headerName", message: "m2" },
        ]),
      ),
    ),
    { value: "m1", headerName: "m2" },
  );
  assert.deepEqual(
    call(() => credentialErrors(new ApiRequestError(500, "INTERNAL", "m"))),
    {
      $form:
        "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening.",
    },
    "any other answer keeps the tool error text",
  );
});
