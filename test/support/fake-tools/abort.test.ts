import assert from "node:assert/strict";
import { test } from "node:test";

import type { FakeTools } from "./index.ts";
import { startFakeTools } from "./index.ts";

const DOCS_U = {
  content:
    "Fetched document for u. Quarterly policy: payments above 10000 require two approvers.",
  content_type: "text/plain",
};

const HEADERS = { "content-type": "application/json" };

function post(base: string, ref: string, signal?: AbortSignal): Promise<Response> {
  const init: RequestInit = { method: "POST", headers: HEADERS, body: JSON.stringify({ url: "u" }) };
  if (signal !== undefined) {
    init.signal = signal;
  }
  return fetch(`${base}/blocks/${ref}`, init);
}

async function pollForRecord(fake: FakeTools): Promise<void> {
  const started = performance.now();
  while (fake.calls().length === 0) {
    if (performance.now() - started >= 5000) {
      assert.fail("a record was not appended within 5000 ms");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("C-f25a2efd a client that aborts during a delay leaves its record and the next call is answered", async () => {
  let started: FakeTools | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeTools();
  });
  assert.ok(started !== undefined, "the fake started");
  const fake: FakeTools = started;
  try {
    assert.doesNotThrow(() => fake.setDelay("docs.fetch@1", 1000));

    await assert.rejects(
      post(fake.origin, "docs.fetch@1", AbortSignal.timeout(50)),
      (error: unknown) => {
        assert.ok(error instanceof DOMException, String(error));
        assert.equal(error.name, "TimeoutError");
        return true;
      },
    );

    await pollForRecord(fake);
    const first = fake.calls();
    assert.equal(first.length, 1, "the aborted request keeps its record");
    assert.equal(first[0]?.seq, 1);
    assert.equal(first[0]?.ref, "docs.fetch@1");
    assert.equal(first[0]?.status, 200);
    assert.equal(first[0]?.duplicate, false);
    assert.deepEqual(first[0]?.input, { url: "u" });

    assert.doesNotThrow(() => fake.setDelay("docs.fetch@1", 0));
    const second = await post(fake.origin, "docs.fetch@1");
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), DOCS_U);

    const records = fake.calls();
    assert.equal(records.length, 2, "the next call is recorded");
    assert.deepEqual(
      records.map((record) => record.seq),
      [1, 2],
    );
  } finally {
    await fake.close();
  }
});
