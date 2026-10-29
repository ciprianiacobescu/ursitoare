/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ClipboardLike, ErrorPanelModel } from "./error-panel.ts";
import { copyNotice, copyText, errorPanelModel } from "./error-panel.ts";

assert.equal(typeof errorPanelModel, "function");

const NOT_SET = Symbol("not set");

const TEXTS = {
  FORBIDDEN:
    "You are not allowed to do this. If you think you should be, give the decision id to an administrator.",
  UNAUTHENTICATED: "You are not signed in, or your session has ended. Sign in and try again.",
  NOT_FOUND: "That item does not exist, or you cannot see it.",
  NETWORK_ERROR: "Cannot reach the engine. Check your connection and try again.",
  INTERNAL:
    "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening.",
  FALLBACK:
    "Something went wrong. Try again, and tell an administrator if it keeps happening.",
} as const;

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

async function callAsync<T>(run: () => Promise<T>): Promise<T> {
  let value: T | typeof NOT_SET = NOT_SET;
  await assert.doesNotReject(async () => {
    value = await run();
  }, "the call must not reject");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

function modelFor(error: unknown): ErrorPanelModel {
  return call(() => errorPanelModel(error));
}

function assertNoRawData(model: ErrorPanelModel): void {
  const rendered = JSON.stringify(model);
  for (const forbidden of ["raw", "SELECT", "secret", "sql", "/etc/passwd"]) {
    assert.ok(!rendered.includes(forbidden), `the model does not contain ${forbidden}`);
  }
}

test("C-c0db9325 the model by status", () => {
  const forbidden = modelFor(
    new ApiRequestError(403, "FORBIDDEN", "raw", {
      details: { decisionId: "dec_0123-ab" },
    }),
  );
  assert.deepEqual(forbidden, {
    code: "FORBIDDEN",
    status: 403,
    title: "Not allowed",
    message: TEXTS.FORBIDDEN,
    decisionId: "dec_0123-ab",
  });

  const unauthenticated = modelFor(
    new ApiRequestError(401, "UNAUTHENTICATED", "raw"),
  );
  assert.deepEqual(unauthenticated, {
    code: "UNAUTHENTICATED",
    status: 401,
    title: "Sign in required",
    message: TEXTS.UNAUTHENTICATED,
    decisionId: null,
  });

  const notFound = modelFor(new ApiRequestError(404, "NOT_FOUND", "raw"));
  assert.deepEqual(notFound, {
    code: "NOT_FOUND",
    status: 404,
    title: "Not found",
    message: TEXTS.NOT_FOUND,
    decisionId: null,
  });

  const network = modelFor(new ApiRequestError(0, "NETWORK_ERROR", "raw"));
  assert.deepEqual(network, {
    code: "NETWORK_ERROR",
    status: 0,
    title: "Cannot reach the engine",
    message: TEXTS.NETWORK_ERROR,
    decisionId: null,
  });

  const internal = modelFor(
    new ApiRequestError(500, "INTERNAL", "SELECT * FROM secret", {
      details: { sql: "x", path: "/etc/passwd" },
    }),
  );
  assert.deepEqual(internal, {
    code: "INTERNAL",
    status: 500,
    title: "Something went wrong",
    message: TEXTS.INTERNAL,
    decisionId: null,
  });

  const flowLocked = modelFor(new ApiRequestError(409, "FLOW_LOCKED", "raw"));
  assert.deepEqual(flowLocked, {
    code: "FLOW_LOCKED",
    status: 409,
    title: "Something went wrong",
    message: TEXTS.FALLBACK,
    decisionId: null,
  });

  const weirdCode = modelFor(new ApiRequestError(500, "weird code", "raw"));
  assert.deepEqual(weirdCode, {
    code: "UNKNOWN_ERROR",
    status: 500,
    title: "Something went wrong",
    message: TEXTS.FALLBACK,
    decisionId: null,
  });

  const unknown = modelFor(new Error("boom"));
  assert.deepEqual(unknown, {
    code: "UNKNOWN_ERROR",
    status: null,
    title: "Something went wrong",
    message: TEXTS.FALLBACK,
    decisionId: null,
  });

  for (const model of [
    forbidden,
    unauthenticated,
    notFound,
    network,
    internal,
    flowLocked,
    weirdCode,
    unknown,
  ]) {
    assertNoRawData(model);
  }
});

test("C-38740f97 a decision id is shown only when it is well formed", () => {
  const invalidDecisionIds = ["<img src=x>", "a".repeat(129), "", 7];
  for (const decisionId of invalidDecisionIds) {
    const model = modelFor(
      new ApiRequestError(403, "FORBIDDEN", "raw", { details: { decisionId } }),
    );
    assert.equal(model.decisionId, null, `${JSON.stringify(decisionId)} is not shown`);
  }

  const withoutDetails = modelFor(new ApiRequestError(403, "FORBIDDEN", "raw"));
  assert.equal(withoutDetails.decisionId, null);

  const notForbidden = modelFor(
    new ApiRequestError(500, "INTERNAL", "raw", {
      details: { decisionId: "dec_1" },
    }),
  );
  assert.equal(notForbidden.decisionId, null, "a decision id on a non-403 is not shown");
});

test("C-b735b791 copying", async () => {
  const writes: string[] = [];
  const resolving: ClipboardLike = {
    async writeText(text: string): Promise<void> {
      writes.push(text);
    },
  };
  const rejecting: ClipboardLike = {
    async writeText(): Promise<void> {
      throw new Error("denied");
    },
  };

  assert.equal(await callAsync(() => copyText("dec_1", resolving)), "copied");
  assert.deepEqual(writes, ["dec_1"], "the clipboard received dec_1");

  assert.equal(await callAsync(() => copyText("dec_1", rejecting)), "unavailable");
  assert.equal(await callAsync(() => copyText("dec_1")), "unavailable");

  const beforeEmpty = writes.length;
  assert.equal(await callAsync(() => copyText("", resolving)), "unavailable");
  assert.equal(writes.length, beforeEmpty, "an empty text writes nothing");

  assert.equal(call(() => copyNotice("copied")), "Decision id copied.");
  assert.equal(
    call(() => copyNotice("unavailable")),
    "Could not copy. Select the decision id and copy it by hand.",
  );
});
