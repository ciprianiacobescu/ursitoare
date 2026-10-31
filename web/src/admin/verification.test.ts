/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import { adminErrorMessage } from "./messages.ts";
import { loadVerification, parseVerification, verificationView } from "./audit.ts";
import type { Verification } from "./audit.ts";

assert.equal(typeof verificationView, "function");

const VERIFY_PATH = "/audit/verify";

const VERIFICATION_BODY: Readonly<Record<string, unknown>> = {
  ok: true,
  checked: 42,
  firstBadSeq: null,
  reason: null,
  fromSeq: "1",
  anchorsChecked: true,
  anchorsVerified: 2,
  checkedAt: "2026-10-25T09:00:00.000000Z",
};

const VERIFICATION: Verification = {
  ok: true,
  checked: 42,
  firstBadSeq: null,
  reason: null,
  anchorsChecked: true,
  anchorsVerified: 2,
  checkedAt: "2026-10-25T09:00:00.000000Z",
};

const BROKEN_RESULT: Verification = {
  ok: false,
  checked: 42,
  firstBadSeq: "17",
  reason: "hash",
  anchorsChecked: false,
  anchorsVerified: 0,
  checkedAt: "2026-10-25T09:00:00.000000Z",
};

const EMPTY_RESULT: Verification = {
  ok: true,
  checked: 0,
  firstBadSeq: null,
  reason: null,
  anchorsChecked: false,
  anchorsVerified: 0,
  checkedAt: "2026-10-25T09:00:00.000000Z",
};

const SINGLE_RESULT: Verification = {
  ...VERIFICATION,
  checked: 1,
  anchorsVerified: 1,
};

const SINGLE_CHAIN_RESULT: Verification = {
  ...VERIFICATION,
  checked: 1,
  anchorsVerified: 0,
  anchorsChecked: false,
};

const TIME_TEXT = "2026-10-25 09:00:00 UTC";

interface GetCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

interface RecordingGetClient {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: GetCall[];
}

function recordingGetClient(responses: readonly unknown[]): RecordingGetClient {
  const calls: GetCall[] = [];
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      const response = responses[calls.length - 1];
      assert.ok(response !== undefined, "the caller asked for a response that is not there");
      return response as T;
    },
  };
  return { client, calls };
}

function parsed(raw: unknown, label: string): Verification {
  let result: Verification | null | undefined;
  assert.doesNotThrow(() => {
    result = parseVerification(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== null && result !== undefined, `${label} parses to a verification`);
  return result as Verification;
}

function refused(raw: unknown, label: string): void {
  let result: Verification | null | undefined;
  assert.doesNotThrow(() => {
    result = parseVerification(raw);
  }, `${label} parses without throwing`);
  assert.equal(result, null, `${label} is refused`);
}

function viewed(state: unknown, label: string): ReturnType<typeof verificationView> {
  let result: ReturnType<typeof verificationView> | undefined;
  assert.doesNotThrow(() => {
    result = verificationView(state as Parameters<typeof verificationView>[0]);
  }, `${label} builds a view without throwing`);
  assert.ok(result !== undefined, `${label} produced a view`);
  return result as ReturnType<typeof verificationView>;
}

test("C-1d816fd1 parseVerification keeps a valid verification and refuses malformed bodies", () => {
  assert.deepEqual(
    parsed(VERIFICATION_BODY, "the verification"),
    VERIFICATION,
    "the verification is kept without the fromSeq field",
  );

  refused({ ...VERIFICATION_BODY, firstBadSeq: "17" }, "a signed body with firstBadSeq set");
  refused({ ...VERIFICATION_BODY, anchorsVerified: -1 }, "a negative anchor count");
  refused({ ...VERIFICATION_BODY, checked: -1 }, "a negative checked count");
  refused({ ...VERIFICATION_BODY, anchorsVerified: 0 }, "anchorsChecked without anchors");
  const noCheckedAt: Record<string, unknown> = { ...VERIFICATION_BODY };
  delete noCheckedAt["checkedAt"];
  refused(noCheckedAt, "a body without checkedAt");
});

test("C-1d816fd1 loadVerification asks the verify path and refuses an unreadable answer", async () => {
  const recording = recordingGetClient([VERIFICATION_BODY]);
  const signal = new AbortController().signal;

  let result: Verification | undefined;
  await assert.doesNotReject(async () => {
    result = await loadVerification(recording.client, signal);
  }, "the load with a signal resolves");
  assert.ok(result !== undefined, "the load returned a verification");
  assert.deepEqual(result, VERIFICATION, "the loaded verification is parsed");
  assert.equal(recording.calls.length, 1, "the client got one call");
  const withSignal = recording.calls[0];
  assert.ok(withSignal !== undefined, "the first call was recorded");
  assert.equal(withSignal.path, VERIFY_PATH, "the verification is read on the verify path");
  assert.deepEqual(withSignal.opts, { signal });

  const plain = recordingGetClient([VERIFICATION_BODY]);
  let again: Verification | undefined;
  await assert.doesNotReject(async () => {
    again = await loadVerification(plain.client);
  }, "the load without a signal resolves");
  assert.ok(again !== undefined, "the second load returned a verification");
  const withoutSignal = plain.calls[0];
  assert.ok(withoutSignal !== undefined, "the second call was recorded");
  assert.deepEqual(withoutSignal.opts, {});

  const bad = recordingGetClient([{ ok: "yes" }]);
  await assert.rejects(
    loadVerification(bad.client),
    (error: unknown) => error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "an unreadable answer rejects with an invalid response",
  );
});

test("C-d2fc8f38 verificationView names the checking and verified statuses", () => {
  const checking = viewed({ status: "checking" }, "the checking state");
  assert.equal(checking.tone, "checking", "a check in progress has the checking tone");
  assert.equal(checking.headline, "Checking the audit chain");
  assert.equal(checking.detail, "This can take a moment for a long log.");

  const full = viewed({ status: "done", result: VERIFICATION }, "the verified state");
  assert.equal(full.tone, "ok", "a verified chain is reported as ok");
  assert.equal(full.headline, "Audit chain verified");
  assert.equal(
    full.detail,
    `42 events checked, 2 signed head anchors matched. Checked at ${TIME_TEXT}.`,
  );

  const chainOnly = viewed({ status: "done", result: { ...VERIFICATION, anchorsVerified: 0 } }, "the chain only state");
  assert.equal(chainOnly.tone, "ok", "a verified chain without anchors is still ok");
  assert.equal(chainOnly.headline, "Audit chain verified");
  assert.equal(
    chainOnly.detail,
    `42 events checked. No signed head anchor exists yet, so only the hash chain was checked. Checked at ${TIME_TEXT}.`,
  );

  const empty = viewed({ status: "done", result: EMPTY_RESULT }, "the empty state");
  assert.equal(empty.tone, "ok", "a check of nothing is ok");
  assert.equal(empty.headline, "Audit chain verified");
  assert.equal(empty.detail, `No events to check yet. Checked at ${TIME_TEXT}.`);

  const singleEvent = viewed({ status: "done", result: SINGLE_CHAIN_RESULT }, "the single event state");
  assert.equal(
    singleEvent.detail,
    `1 event checked. No signed head anchor exists yet, so only the hash chain was checked. Checked at ${TIME_TEXT}.`,
    "a single event is named in the singular",
  );
  const singleAnchor = viewed({ status: "done", result: SINGLE_RESULT }, "the single anchor state");
  assert.equal(
    singleAnchor.detail,
    `1 event checked, 1 signed head anchor matched. Checked at ${TIME_TEXT}.`,
    "a single anchor is named in the singular",
  );
});

test("C-d2fc8f38 verificationView names the broken chain and the unavailable check", () => {
  const broken = viewed({ status: "done", result: BROKEN_RESULT }, "the broken state");
  assert.equal(broken.tone, "broken", "a broken chain is reported as broken");
  assert.equal(broken.headline, "Audit chain broken");
  assert.equal(
    broken.detail,
    "The first problem is at event 17: its hash does not match its content. Do not trust events from that number on until an operator has found the cause.",
  );

  const gap = viewed(
    { status: "done", result: { ...BROKEN_RESULT, reason: "gap" } },
    "the broken state with a gap",
  );
  assert.equal(gap.tone, "broken", "a gap keeps the broken tone");
  assert.equal(
    gap.detail,
    "The first problem is at event 17: an event is missing from the sequence. Do not trust events from that number on until an operator has found the cause.",
  );

  const anchor = viewed(
    { status: "done", result: { ...BROKEN_RESULT, reason: "anchor" } },
    "the broken state with an anchor mismatch",
  );
  assert.equal(anchor.tone, "broken", "an anchor mismatch keeps the broken tone");
  assert.equal(
    anchor.detail,
    "The first problem is at event 17: a signed anchor does not match the chain. Do not trust events from that number on until an operator has found the cause.",
  );

  const refusedError = new ApiRequestError(403, "FORBIDDEN", "x", {
    details: { decisionId: "d-9" },
  });
  const failed = viewed({ status: "failed", error: refusedError }, "the failed state");
  assert.equal(failed.tone, "unavailable", "a refused check is unavailable");
  assert.equal(failed.headline, "Verification unavailable");
  assert.equal(failed.detail, adminErrorMessage(refusedError));
  assert.ok(
    failed.detail.endsWith(" Decision id: d-9"),
    "the unavailable detail carries the decision id",
  );
});
