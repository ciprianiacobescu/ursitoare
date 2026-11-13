/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { dryRunFormErrors, startDryRun } from "./dry-run.ts";
import { registerRunMessages } from "./messages.ts";
import type { RunView } from "./types.ts";

const D = (c: string): string => c.repeat(64);
const HASH = `sha256:${D("a")}`;

const RUN: RunView = {
  id: "run_1",
  flowId: "demo-grants",
  flowHash: HASH,
  mode: "stub",
  trigger: "test",
  state: "completed",
  ownerTeam: "finance",
  principal: { userId: "u_alice", kind: "human" },
  terminalNode: "done",
  error: null,
  inputRef: D("b"),
  outputRef: D("c"),
  createdAt: "2026-11-02T10:00:00.000000Z",
  startedAt: "2026-11-02T10:00:01.000000Z",
  endedAt: "2026-11-02T10:00:02.000000Z",
};

const INPUT = { vendor_name: "Acme GmbH", amount: 12.5 };
const FAKES = { pay: [{ output: { payment_id: "P-1" } }] };

type Record3 = [string, unknown, RequestOptions | undefined];

function client(answer: unknown, failure?: unknown): { api: ApiClient; records: Record3[] } {
  const records: Record3[] = [];
  const refuse = (): never => {
    throw new Error("unexpected call");
  };
  const api = {
    get: refuse,
    put: refuse,
    delete: refuse,
    patch: refuse,
    post: (path: string, body?: unknown, opts?: RequestOptions): Promise<unknown> => {
      records.push([path, body, opts]);
      return failure === undefined ? Promise.resolve(answer) : Promise.reject(failure);
    },
  } as unknown as ApiClient;
  return { api, records };
}

async function rangeError(
  flowId: string,
  hash: string,
  key: string,
  message: string,
): Promise<void> {
  const { api, records } = client({ run: RUN });
  await assert.rejects(
    startDryRun(api, flowId, hash, INPUT, FAKES, key),
    (error: unknown) => error instanceof RangeError && error.message === message,
  );
  assert.deepEqual(records, [], "no request was made");
}

async function invalid(answer: unknown): Promise<void> {
  const { api } = client(answer);
  await assert.rejects(
    startDryRun(api, "demo-grants", HASH, INPUT, FAKES, "k-1"),
    (error: unknown) =>
      error instanceof ApiRequestError &&
      error.status === 200 &&
      error.code === "INVALID_RESPONSE" &&
      error.message === "Invalid dry run answer",
  );
}

test("C-a0fe5421: startDryRun posts the exact request and returns the run", async () => {
  const { api, records } = client({ run: RUN });
  let run: RunView | undefined;
  await assert.doesNotReject(async () => {
    run = await startDryRun(api, "demo-grants", HASH, INPUT, FAKES, "k-1");
  });
  assert.deepEqual(records, [
    [
      `/flows/demo-grants/versions/sha256%3A${D("a")}/dry-run`,
      { input: INPUT, fakes: FAKES },
      { headers: { "Idempotency-Key": "k-1" } },
    ],
  ]);
  assert.equal(run?.id, "run_1");
});

test("C-a0fe5421: startDryRun refuses a bad flow id, hash or key before any request", async () => {
  await rangeError("Demo", HASH, "k-1", "flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  await rangeError("demo-grants", "sha256:abc", "k-1", "hash must match ^sha256:[0-9a-f]{64}$");
  await rangeError("demo-grants", HASH, "", "key must not be empty");
});

test("C-a0fe5421: startDryRun reports an unreadable answer and rethrows the post's error", async () => {
  await invalid({ run: { id: 5 } });
  await invalid({});
  const own = new ApiRequestError(400, "VALIDATION_FAILED", "m");
  const { api } = client(undefined, own);
  await assert.rejects(
    startDryRun(api, "demo-grants", HASH, INPUT, FAKES, "k-1"),
    (error: unknown) => error === own,
  );
});

function fields(list: [string, string][]): ApiRequestError {
  return new ApiRequestError(400, "VALIDATION_FAILED", "m", {
    details: { fields: list.map(([field, message]) => ({ field, message })) },
  });
}

function mapped(error: unknown): FormErrors {
  let result: FormErrors | undefined;
  assert.doesNotThrow(() => {
    result = dryRunFormErrors(error);
  });
  assert.ok(result !== undefined, "dryRunFormErrors answered");
  return result;
}

test("C-a0fe5421: dryRunFormErrors keeps the fakes key and index and maps input", () => {
  registerRunMessages();
  assert.deepEqual(mapped(fields([["body/fakes/pay", "missing: no fake entry"]])), {
    fakes: "pay: missing: no fake entry",
  });
  assert.deepEqual(
    mapped(
      fields([
        ["body/fakes/pay/0", "schema: / required"],
        ["body/fakes/flag", "not_an_effect: reads run live"],
      ]),
    ),
    { fakes: "pay/0: schema: / required; flag: not_an_effect: reads run live" },
  );
  assert.deepEqual(mapped(fields([["body/input/amount", "must be number"]])), {
    input: "must be number",
  });
  assert.deepEqual(
    mapped(fields([["body/fakes/k1", "m"], ["body/fakes/k2", "m"], ["body/fakes/k3", "m"], ["body/fakes/k4", "m"]])),
    { fakes: "k1: m; k2: m; k3: m" },
  );
});

test("C-a0fe5421: dryRunFormErrors sends other fields and errors to the form text", () => {
  registerRunMessages();
  assert.deepEqual(
    mapped(fields([["body/run_as", "must NOT have additional properties"]])),
    {
      $form:
        "Some of the information is not valid. Check it and try again. body/run_as: must NOT have additional properties",
    },
  );
  assert.deepEqual(mapped(new ApiRequestError(503, "RUNS_UNAVAILABLE", "m")), {
    $form: "Runs are unavailable right now. Try again in a moment.",
  });
  assert.deepEqual(
    mapped(new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "dec_9" } })),
    {
      $form:
        "You are not allowed to do this. If you think you should be, give the decision id to an administrator. Decision id: dec_9",
    },
  );
  assert.deepEqual(mapped(new Error("x")), {
    $form: "Something went wrong. Try again, and tell an administrator if it keeps happening.",
  });
});
