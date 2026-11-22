import assert from "node:assert/strict";
import http from "node:http";

import type { ContractCheck } from "../fake-oidc/index.ts";

type ContractOpts = { host: string; path: string; key: { name: string; value: string } | null };

interface Answer {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: unknown;
}

const VERSION = "2026-07-28";
const META_KEY = "io.modelcontextprotocol/protocolVersion";
const MAX_PAGES = 20;

function fail(name: string, message: string): never {
  throw new assert.AssertionError({ message: `${name}: ${message}` });
}

function expect(name: string, condition: boolean, message: string): void {
  if (!condition) {
    fail(name, message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function modernBody(method: string, params: Record<string, unknown>, version: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method,
    params: { ...params, _meta: { [META_KEY]: version, "io.modelcontextprotocol/clientCapabilities": {} } },
  });
}

function send(
  name: string,
  baseUrl: string,
  opts: ContractOpts,
  headers: Record<string, string>,
  body: string,
  withKey = true,
): Promise<Answer> {
  return new Promise<Answer>((resolve, reject) => {
    const target = new URL(baseUrl);
    const all: Record<string, string> = {
      host: opts.host,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    };
    if (withKey && opts.key !== null) {
      all[opts.key.name] = opts.key.value;
    }
    const unreachable = (error: unknown): void => {
      const detail = error instanceof Error ? error.message : String(error);
      reject(new assert.AssertionError({ message: `${name}: ${baseUrl} is unreachable (${detail})` }));
    };
    const request = http.request(
      {
        host: target.hostname,
        port: target.port,
        method: "POST",
        path: opts.path,
        headers: all,
        agent: false,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("error", unreachable);
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }
          resolve({ status: response.statusCode ?? 0, headers: response.headers, body: parsed });
        });
      },
    );
    request.on("error", unreachable);
    request.end(body);
  });
}

function modernHeaders(method: string, version: string, mcpName?: string): Record<string, string> {
  const headers: Record<string, string> = { "mcp-protocol-version": version, "mcp-method": method };
  if (mcpName !== undefined) {
    headers["mcp-name"] = mcpName;
  }
  return headers;
}

function resultOf(name: string, answer: Answer, status: number): Record<string, unknown> {
  expect(name, answer.status === status, `answered ${String(answer.status)}, expected ${String(status)}`);
  expect(name, isRecord(answer.body), "the body is not a JSON object");
  const body = answer.body as Record<string, unknown>;
  const result = body["result"];
  expect(name, isRecord(result), "the answer holds no result");
  return result as Record<string, unknown>;
}

function errorOf(name: string, answer: Answer, status: number, code: number): Record<string, unknown> {
  expect(name, answer.status === status, `answered ${String(answer.status)}, expected ${String(status)}`);
  const body = isRecord(answer.body) ? answer.body : {};
  const error = body["error"];
  expect(name, isRecord(error), "the answer holds no error");
  const record = error as Record<string, unknown>;
  expect(name, record["code"] === code, `error code ${String(record["code"])}, expected ${String(code)}`);
  return record;
}

export function fakeMcpContract(baseUrl: string, opts: ContractOpts): ContractCheck[] {
  const modern = (name: string, method: string, params: Record<string, unknown>, mcpName?: string): Promise<Answer> =>
    send(name, baseUrl, opts, modernHeaders(method, VERSION, mcpName), modernBody(method, params, VERSION));

  const checks: ContractCheck[] = [
    {
      name: "server/discover answers its versions",
      async run(): Promise<void> {
        const name = this.name;
        const result = resultOf(name, await modern(name, "server/discover", {}), 200);
        expect(name, Array.isArray(result["supportedVersions"]), "supportedVersions is not a list");
        expect(
          name,
          (result["supportedVersions"] as unknown[]).includes(VERSION),
          `supportedVersions does not hold ${VERSION}`,
        );
        expect(name, typeof result["ttlMs"] === "number", "ttlMs is not a number");
        expect(
          name,
          result["cacheScope"] === "public" || result["cacheScope"] === "private",
          "cacheScope is neither public nor private",
        );
      },
    },
    {
      name: "tools/list answers the tools",
      async run(): Promise<void> {
        const name = this.name;
        const names: string[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < MAX_PAGES; page += 1) {
          const params: Record<string, unknown> = cursor === undefined ? {} : { cursor };
          const result = resultOf(name, await modern(name, "tools/list", params), 200);
          const tools = result["tools"];
          expect(name, Array.isArray(tools), "tools is not a list");
          for (const tool of tools as unknown[]) {
            expect(name, isRecord(tool) && typeof tool["name"] === "string", "a tool has no name");
            names.push((tool as Record<string, unknown>)["name"] as string);
          }
          expect(name, typeof result["ttlMs"] === "number", "ttlMs is not a number");
          expect(
            name,
            result["cacheScope"] === "public" || result["cacheScope"] === "private",
            "cacheScope is neither public nor private",
          );
          const next = result["nextCursor"];
          if (typeof next !== "string") {
            break;
          }
          cursor = next;
        }
        expect(name, names.includes("find_vendor"), "find_vendor is not listed");
        expect(name, names.includes("log_note"), "log_note is not listed");
      },
    },
    {
      name: "tools/call answers find_vendor",
      async run(): Promise<void> {
        const name = this.name;
        const result = resultOf(
          name,
          await modern(name, "tools/call", { name: "find_vendor", arguments: { vendor_name: "Acme GmbH" } }, "find_vendor"),
          200,
        );
        const structured = result["structuredContent"];
        expect(name, isRecord(structured), "structuredContent is missing");
        expect(
          name,
          (structured as Record<string, unknown>)["vendor_id"] === "V-ACME",
          "vendor_id is not V-ACME",
        );
        expect(name, Array.isArray(result["content"]), "content is not a list");
      },
    },
    {
      name: "a header mismatch is refused with -32020",
      async run(): Promise<void> {
        const name = this.name;
        const answer = await modern(
          name,
          "tools/call",
          { name: "find_vendor", arguments: { vendor_name: "Acme GmbH" } },
          "log_note",
        );
        errorOf(name, answer, 400, -32020);
      },
    },
    {
      name: "an unsupported version is refused with -32022",
      async run(): Promise<void> {
        const name = this.name;
        const answer = await send(
          name,
          baseUrl,
          opts,
          modernHeaders("server/discover", "1999-01-01"),
          modernBody("server/discover", {}, "1999-01-01"),
        );
        const error = errorOf(name, answer, 400, -32022);
        const data = error["data"];
        expect(name, isRecord(data), "the error holds no data");
        const record = data as Record<string, unknown>;
        expect(name, record["requested"] === "1999-01-01", "data.requested is not 1999-01-01");
        expect(
          name,
          Array.isArray(record["supported"]) && (record["supported"] as unknown[]).includes(VERSION),
          `data.supported does not hold ${VERSION}`,
        );
      },
    },
    {
      name: "an unknown method is refused with -32601",
      async run(): Promise<void> {
        const name = this.name;
        errorOf(name, await modern(name, "nope/unknown", {}), 404, -32601);
      },
    },
  ];

  if (opts.key !== null) {
    checks.push({
      name: "a missing key is refused",
      async run(): Promise<void> {
        const name = this.name;
        const answer = await send(
          name,
          baseUrl,
          opts,
          modernHeaders("server/discover", VERSION),
          modernBody("server/discover", {}, VERSION),
          false,
        );
        expect(name, answer.status === 401, `answered ${String(answer.status)}, expected 401`);
      },
    });
  }

  checks.push({
    name: "a legacy initialize answers its handshake",
    async run(): Promise<void> {
      const name = this.name;
      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "c", version: "1" } },
      });
      const result = resultOf(name, await send(name, baseUrl, opts, {}, body), 200);
      expect(name, result["protocolVersion"] === "2025-11-25", "protocolVersion is not 2025-11-25");
      expect(name, isRecord(result["capabilities"]), "capabilities is not an object");
      const info = result["serverInfo"];
      expect(name, isRecord(info) && typeof info["name"] === "string", "serverInfo.name is not a string");
    },
  });

  return checks.map((check) => ({ name: check.name, run: () => check.run.call(check) }));
}
