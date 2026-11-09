import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import type { IncomingHttpHeaders } from "node:http";

import type { ContractCheck } from "../fake-oidc/index.ts";

const LOOKUP_PATH = "/blocks/erp.lookup_vendor@1";
const UNKNOWN_PATH = "/blocks/nope@1";
const SEND_PATH = "/blocks/mail.send@1";
const LOOKUP_BODY = JSON.stringify({ vendor_name: "Acme GmbH" });
const MAIL_BODY = JSON.stringify({ to: "a@x.test", subject: "s", body: "b" });

type Answer = Readonly<{ status: number; headers: IncomingHttpHeaders; text: string }>;

interface SendOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function failure(name: string, message: string): assert.AssertionError {
  return new assert.AssertionError({ message: `${name}: ${message}` });
}

function send(name: string, baseUrl: string, path: string, opts: SendOptions = {}): Promise<Answer> {
  return new Promise<Answer>((resolve, reject) => {
    let target: URL;
    try {
      target = new URL(path, baseUrl);
    } catch {
      reject(failure(name, `${baseUrl} is unreachable (invalid URL)`));
      return;
    }
    const request = http.request(
      target,
      {
        method: opts.method ?? "POST",
        headers: opts.headers ?? {},
        agent: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            headers: response.headers,
            text: Buffer.concat(chunks).toString("utf8"),
          });
        });
        response.on("error", (cause) => {
          reject(failure(name, `${baseUrl} is unreachable (${String(cause)})`));
        });
      },
    );
    request.on("error", (cause) => {
      reject(failure(name, `${baseUrl} is unreachable (${String(cause)})`));
    });
    if (opts.body !== undefined) {
      request.write(opts.body);
    }
    request.end();
  });
}

function jsonOf(name: string, answer: Answer): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.text);
  } catch {
    assert.fail(`${name}: the body is not JSON (${answer.text.slice(0, 120)})`);
  }
  assert.ok(isRecord(parsed), `${name}: the body is not a JSON object`);
  return parsed;
}

function check(name: string, body: () => Promise<void>): ContractCheck {
  return {
    name,
    run: async () => {
      try {
        await body();
      } catch (error: unknown) {
        if (error instanceof assert.AssertionError && error.message.startsWith(`${name}:`)) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw failure(name, message);
      }
    },
  };
}

export function fakeToolsContract(baseUrl: string, opts: { host: string }): ContractCheck[] {
  const host = opts.host;

  return [
    check("a read answers its fixture", async () => {
      const answer = await send("a read answers its fixture", baseUrl, LOOKUP_PATH, {
        headers: { host },
        body: LOOKUP_BODY,
      });
      assert.equal(answer.status, 200, "the read did not answer 200");
      const contentType = answer.headers["content-type"];
      assert.ok(
        typeof contentType === "string" && contentType.startsWith("application/json"),
        `the content-type is ${String(contentType)}`,
      );
      assert.deepEqual(jsonOf("a read answers its fixture", answer), {
        vendor_id: "V-ACME",
        status: "active",
        payment_terms_days: 30,
      });
    }),
    check("an unknown block is refused", async () => {
      const answer = await send("an unknown block is refused", baseUrl, UNKNOWN_PATH, {
        headers: { host },
        body: "{}",
      });
      assert.equal(answer.status, 404, `the unknown block answered ${answer.status}`);
      assert.deepEqual(jsonOf("an unknown block is refused", answer), {
        error: "unknown_block",
        block: "nope@1",
      });
    }),
    check("a foreign Host is refused", async () => {
      const answer = await send("a foreign Host is refused", baseUrl, LOOKUP_PATH, {
        headers: { host: `not-${host}` },
        body: LOOKUP_BODY,
      });
      assert.equal(answer.status, 421, `the foreign Host answered ${answer.status}`);
      assert.deepEqual(jsonOf("a foreign Host is refused", answer), {
        error: "misdirected_request",
      });
    }),
    check("an invalid input is refused with details", async () => {
      const answer = await send("an invalid input is refused with details", baseUrl, LOOKUP_PATH, {
        headers: { host },
        body: "{}",
      });
      assert.equal(answer.status, 400, `the invalid input answered ${answer.status}`);
      assert.deepEqual(jsonOf("an invalid input is refused with details", answer), {
        error: "invalid_input",
        block: "erp.lookup_vendor@1",
        details: [{ path: "/", keyword: "required" }],
      });
    }),
    check("an effect needs an idempotency key", async () => {
      const answer = await send("an effect needs an idempotency key", baseUrl, SEND_PATH, {
        headers: { host },
        body: MAIL_BODY,
      });
      assert.equal(answer.status, 400, `the keyless effect answered ${answer.status}`);
      const body = jsonOf("an effect needs an idempotency key", answer);
      assert.equal(body["error"], "missing_idempotency_key", "the refusal is not missing_idempotency_key");
    }),
    check("an effect replays under the same key", async () => {
      const key = `contract-${randomUUID()}`;
      const headers = { host, "idempotency-key": key };
      const first = await send("an effect replays under the same key", baseUrl, SEND_PATH, {
        headers,
        body: MAIL_BODY,
      });
      const second = await send("an effect replays under the same key", baseUrl, SEND_PATH, {
        headers,
        body: MAIL_BODY,
      });
      assert.equal(first.status, 200, `the first effect answered ${first.status}`);
      assert.equal(second.status, 200, `the replay answered ${second.status}`);
      assert.deepEqual(
        jsonOf("an effect replays under the same key", second),
        jsonOf("an effect replays under the same key", first),
        "the replay body differs from the first answer",
      );
      assert.equal(first.headers["x-fake-tools-duplicate"], "false", "the first answer is marked a duplicate");
      assert.equal(second.headers["x-fake-tools-duplicate"], "true", "the replay is not marked a duplicate");
    }),
    check("only POST is allowed", async () => {
      const answer = await send("only POST is allowed", baseUrl, LOOKUP_PATH, {
        method: "GET",
        headers: { host },
      });
      assert.equal(answer.status, 405, `GET answered ${answer.status}`);
      assert.equal(answer.headers["allow"], "POST", `the 405 allows ${String(answer.headers["allow"])}`);
    }),
  ];
}
