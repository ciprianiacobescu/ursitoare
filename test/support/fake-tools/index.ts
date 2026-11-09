import { createHash } from "node:crypto";
import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Socket } from "node:net";

import { Ajv2020 } from "ajv/dist/2020.js";

import type { Effect } from "../../../src/authoring/index.ts";
import { readCatalogueDocument } from "../catalogue/document.ts";
import { CatalogueDataError } from "../catalogue/errors.ts";
import { FIXTURE_REFS, fixtureFor } from "./fixtures.ts";

export const FAKE_TOOLS_HOST: string = "tools.fake.test";

export const FAKE_TOOLS_ORIGIN: string = "https://tools.fake.test";

export const FAKE_TOOLS_KEY_HEADER: string = "x-fake-tools-key";

const BLOCKS_PREFIX = "/blocks/";

export function fakeToolPath(ref: string): string {
  return `${BLOCKS_PREFIX}${ref}`;
}

export interface FakeToolCall {
  seq: number;
  ref: string;
  effect: "read" | "write" | "send" | "pay";
  method: string;
  path: string;
  host: string;
  callHeader: string | null;
  idempotencyKey: string | null;
  keyHeaderSeen: boolean;
  input: unknown;
  bodySha256: string;
  status: number;
  duplicate: boolean;
}

export interface FakeToolsOptions {
  strict?: boolean;
  catalogue?: string;
}

export interface FakeTools {
  readonly origin: string;
  calls(filter?: { ref?: string; callHeader?: string }): FakeToolCall[];
  setDelay(ref: string, ms: number): void;
  failNext(ref: string, status: number, times?: number): void;
  reset(): void;
  close(): Promise<void>;
}

function loadBlocks(cataloguePath?: string): Map<string, Effect> {
  const document = readCatalogueDocument(cataloguePath);
  const ajv = new Ajv2020({ allErrors: false, strict: false, validateFormats: false });
  const blocks = new Map<string, Effect>();
  for (const ref of FIXTURE_REFS) {
    const block = document.blocks[ref];
    if (!Object.hasOwn(document.blocks, ref) || block === undefined) {
      throw new CatalogueDataError("CATALOGUE_INVALID", `${ref}: missing`);
    }
    try {
      ajv.compile(block.input);
      ajv.compile(block.output);
    } catch {
      throw new CatalogueDataError("CATALOGUE_INVALID", `${ref}: schema does not compile`);
    }
    blocks.set(ref, block.effect);
  }
  return blocks;
}

function rawHeader(req: IncomingMessage, name: string): string | null {
  const value = req.headers[name];
  if (value === undefined) {
    return null;
  }
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function pathOf(url: string): string {
  const query = url.indexOf("?");
  return query === -1 ? url : url.slice(0, query);
}

function decodeRef(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function respond(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": String(Buffer.byteLength(text)),
    ...headers,
  });
  res.end(text);
}

function readBody(req: IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (body: Buffer | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(body);
    };
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => finish(Buffer.concat(chunks)));
    req.on("aborted", () => finish(null));
    req.on("error", () => finish(null));
    req.on("close", () => {
      if (!req.complete) {
        finish(null);
      }
    });
  });
}

export async function startFakeTools(opts: FakeToolsOptions = {}): Promise<FakeTools> {
  const blocks = loadBlocks(opts.catalogue);

  const records: FakeToolCall[] = [];
  const effects = new Map<string, unknown>();
  let seq = 0;
  let port = 0;
  const sockets = new Set<Socket>();

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const host = (rawHeader(req, "host") ?? "").toLowerCase();
    if (host !== FAKE_TOOLS_HOST && host !== `127.0.0.1:${port}`) {
      req.resume();
      respond(res, 421, { error: "misdirected_request" });
      return;
    }

    const path = pathOf(req.url ?? "/");
    if (!path.startsWith(BLOCKS_PREFIX)) {
      req.resume();
      respond(res, 404, { error: "not_found" });
      return;
    }

    if (req.method !== "POST") {
      req.resume();
      respond(res, 405, { error: "method_not_allowed" }, { allow: "POST" });
      return;
    }

    const rawRef = path.slice(BLOCKS_PREFIX.length);
    const ref = decodeRef(rawRef);
    const effect = blocks.get(ref);
    if (effect === undefined) {
      req.resume();
      respond(res, 404, { error: "unknown_block", block: ref });
      return;
    }

    const body = await readBody(req);
    if (body === null) {
      return;
    }

    const text = body.toString("utf8");
    let input: unknown;
    if (text.trim() === "") {
      input = {};
    } else {
      try {
        input = JSON.parse(text);
      } catch {
        input = {};
      }
    }

    const idempotencyKey = rawHeader(req, "idempotency-key");
    const keyHeader = rawHeader(req, FAKE_TOOLS_KEY_HEADER);
    const isEffect = effect !== "read";

    let status: number;
    let answer: unknown;
    let duplicate = false;

    if (isEffect && (idempotencyKey === null || idempotencyKey === "")) {
      status = 400;
      answer = {
        error: "missing_idempotency_key",
        message: `${ref} has effect=${effect}; send an Idempotency-Key header`,
      };
    } else {
      const memoryKey = isEffect ? `${ref}|${idempotencyKey ?? ""}` : null;
      if (memoryKey !== null && effects.has(memoryKey)) {
        status = 200;
        answer = effects.get(memoryKey);
        duplicate = true;
      } else {
        const result = fixtureFor(ref, input as Record<string, unknown>, isEffect ? (idempotencyKey ?? "") : "");
        status = result.status;
        if (result.status === 200) {
          answer = result.output;
          if (memoryKey !== null) {
            effects.set(memoryKey, result.output);
          }
        } else {
          answer = result.body;
        }
      }
    }

    seq += 1;
    const record: FakeToolCall = {
      seq,
      ref,
      effect,
      method: req.method ?? "",
      path,
      host,
      callHeader: rawHeader(req, "x-ursitoare-call"),
      idempotencyKey,
      keyHeaderSeen: keyHeader !== null && keyHeader !== "",
      input,
      bodySha256: createHash("sha256").update(body).digest("hex"),
      status,
      duplicate,
    };
    records.push(record);

    if (status === 200) {
      respond(res, 200, answer, { "x-fake-tools-duplicate": String(duplicate) });
    } else {
      respond(res, status, answer);
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(() => {
      if (!res.headersSent) {
        respond(res, 500, { error: "internal" });
      } else {
        res.destroy();
      }
    });
  });
  server.on("connection", (socket: Socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("fake tools listener has no port");
  }
  port = address.port;

  let closing: Promise<void> | undefined;
  return {
    origin: `http://127.0.0.1:${port}`,
    calls(filter: { ref?: string; callHeader?: string } = {}): FakeToolCall[] {
      return structuredClone(
        records.filter(
          (record) =>
            (filter.ref === undefined || record.ref === filter.ref) &&
            (filter.callHeader === undefined || record.callHeader === filter.callHeader),
        ),
      );
    },
    setDelay(_ref: string, _ms: number): void {},
    failNext(_ref: string, _status: number, _times?: number): void {},
    reset(): void {},
    close(): Promise<void> {
      closing ??= new Promise<void>((resolve) => {
        server.close(() => resolve());
        for (const socket of sockets) {
          socket.destroy();
        }
      });
      return closing;
    },
  };
}
