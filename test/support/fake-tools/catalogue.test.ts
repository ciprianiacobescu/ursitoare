import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { readCatalogueDocument, TEST_CATALOGUE_PATH } from "../catalogue/document.ts";
import { CatalogueDataError } from "../catalogue/errors.ts";
import type { FakeTools } from "./index.ts";
import { startFakeTools } from "./index.ts";

interface MutableBlock {
  effect?: unknown;
  input?: unknown;
  output?: unknown;
}

interface MutableDocument {
  blocks: Record<string, MutableBlock>;
}

function tcpServers(): number {
  return process.getActiveResourcesInfo().filter((resource) => resource === "TCPServerWrap")
    .length;
}

function catalogueCopy(): MutableDocument {
  return structuredClone(readCatalogueDocument(TEST_CATALOGUE_PATH)) as unknown as MutableDocument;
}

function blockOf(document: MutableDocument, ref: string): MutableBlock {
  const block = document.blocks[ref];
  assert.ok(block !== undefined, `${ref} is in the catalogue`);
  return block;
}

function writeCopy(dir: string, name: string, document: MutableDocument): string {
  const path = join(dir, name);
  writeFileSync(path, JSON.stringify(document));
  return path;
}

async function expectRefusal(
  cataloguePath: string,
  code: "CATALOGUE_INVALID" | "CATALOGUE_READ",
  check: (message: string) => boolean,
): Promise<void> {
  const before = tcpServers();
  let error: unknown;
  await assert.doesNotReject(async () => {
    try {
      await startFakeTools({ catalogue: cataloguePath });
    } catch (caught) {
      error = caught;
    }
  });
  assert.ok(
    error instanceof CatalogueDataError,
    `expected a CatalogueDataError, got ${String(error)}`,
  );
  assert.equal(error.code, code);
  assert.equal(Object.hasOwn(error, "details"), false);
  assert.ok(check(error.message), `unexpected message ${JSON.stringify(error.message)}`);
  assert.equal(tcpServers(), before, "no listener opened");
}

interface Reply {
  status: number;
  body: string;
}

function post(base: string, path: string, headers: http.OutgoingHttpHeaders, body: string): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method: "POST", path, headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

test("C-0131e867 a catalogue that cannot be read rejects the start and opens no listener", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fake-tools-catalogue-"));
  try {
    writeFileSync(join(dir, "bad.json"), "{");
    const missing = join(dir, "missing.json");

    const nomail = catalogueCopy();
    delete nomail.blocks["mail.send@1"];
    const nomailPath = writeCopy(dir, "nomail.json", nomail);

    const badschema = catalogueCopy();
    blockOf(badschema, "erp.lookup_vendor@1").input = { type: 5 };
    const badschemaPath = writeCopy(dir, "badschema.json", badschema);

    const badout = catalogueCopy();
    blockOf(badout, "erp.lookup_vendor@1").output = { type: 5 };
    const badoutPath = writeCopy(dir, "badout.json", badout);

    const nooutput = catalogueCopy();
    delete blockOf(nooutput, "mail.send@1").output;
    const nooutputPath = writeCopy(dir, "nooutput.json", nooutput);

    await expectRefusal(join(dir, "bad.json"), "CATALOGUE_INVALID", (message) =>
      message.startsWith("invalid JSON: "),
    );
    await expectRefusal(missing, "CATALOGUE_READ", (message) =>
      message === `cannot read ${missing}: ENOENT: no such file or directory, open '${missing}'`,
    );
    await expectRefusal(nomailPath, "CATALOGUE_INVALID", (message) =>
      message === "mail.send@1: missing",
    );
    await expectRefusal(badschemaPath, "CATALOGUE_INVALID", (message) =>
      message === "erp.lookup_vendor@1: schema does not compile",
    );
    await expectRefusal(nooutputPath, "CATALOGUE_INVALID", (message) =>
      message === "/blocks/mail.send@1/output: expected an object schema",
    );
    await expectRefusal(badoutPath, "CATALOGUE_INVALID", (message) =>
      message === "erp.lookup_vendor@1: schema does not compile",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("C-0131e867 an accepted catalogue opens one listener", async () => {
  for (const options of [{ catalogue: TEST_CATALOGUE_PATH }, undefined] as const) {
    const before = tcpServers();
    let started: FakeTools | undefined;
    await assert.doesNotReject(async () => {
      started = options === undefined ? await startFakeTools() : await startFakeTools(options);
    });
    assert.ok(started !== undefined, "the fake started");
    const fake: FakeTools = started;
    try {
      assert.equal(tcpServers(), before + 1, "the counter sees a listener while the fake is open");
    } finally {
      await fake.close();
    }
  }
});

test("C-0131e867 a catalogue with an extra block opens a listener and ignores it", async () => {
  const dir = mkdtempSync(join(tmpdir(), "fake-tools-catalogue-"));
  try {
    const extra = catalogueCopy();
    extra.blocks["extra.thing@1"] = {
      effect: "read",
      input: { type: "object" },
      output: { type: "object" },
    };
    const extraPath = writeCopy(dir, "extra.json", extra);

    const before = tcpServers();
    let started: FakeTools | undefined;
    await assert.doesNotReject(async () => {
      started = await startFakeTools({ catalogue: extraPath });
    });
    assert.ok(started !== undefined, "the fake started");
    const fake: FakeTools = started;
    try {
      assert.equal(tcpServers(), before + 1);
      const reply = await post(
        fake.origin,
        "/blocks/extra.thing@1",
        { host: "tools.fake.test", "content-type": "application/json" },
        "{}",
      );
      assert.equal(reply.status, 404);
      assert.deepEqual(JSON.parse(reply.body), {
        error: "unknown_block",
        block: "extra.thing@1",
      });
    } finally {
      await fake.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
