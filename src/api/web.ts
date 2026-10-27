import { constants } from "node:fs";
import { access, readFile, realpath, stat } from "node:fs/promises";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { ApiError } from "./errors.ts";
import { registerSecurityHeaders } from "./security-headers.ts";
import { cacheControlFor, classifyWebPath, contentTypeFor, isAssetName } from "./web-paths.ts";

export interface WebAppOptions {
  readonly distDir: string;
}

export type WebAppErrorCode = "WEB_DIST_INVALID" | "WEB_APP_DUPLICATE";

export class WebAppError extends Error {
  readonly code: WebAppErrorCode;
  constructor(code: WebAppErrorCode, message: string) {
    super(message);
    this.name = "WebAppError";
    this.code = code;
  }
}

export const DEFAULT_WEB_DIST: string = fileURLToPath(new URL("../../web/dist", import.meta.url));

const INDEX_HTML = "index.html";
const WEB_NOT_BUILT_HINT = "run pnpm run build or set URSITOARE_WEB_DIST";

function isInside(root: string, candidate: string): boolean {
  return candidate.startsWith(`${root}${sep}`);
}

async function readableFile(filePath: string): Promise<boolean> {
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      return false;
    }
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function isWebBuilt(distDir: string): Promise<boolean> {
  try {
    const root = await realpath(distDir);
    const indexPath = await realpath(join(root, INDEX_HTML));
    if (!isInside(root, indexPath)) {
      return false;
    }
    return await readableFile(indexPath);
  } catch {
    return false;
  }
}

async function resolveFile(root: string, segments: readonly string[]): Promise<string | undefined> {
  let resolved: string;
  try {
    resolved = await realpath(join(root, ...segments));
  } catch {
    return undefined;
  }
  if (!isInside(root, resolved)) {
    return undefined;
  }
  if (!(await readableFile(resolved))) {
    return undefined;
  }
  return resolved;
}

type LateRouteHandler = (request: FastifyRequest, reply: FastifyReply) => unknown;

const patched = new WeakSet<FastifyInstance>();

function alreadyStarted(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "FST_ERR_INSTANCE_ALREADY_LISTENING"
  );
}

function lastFunction(args: readonly unknown[]): LateRouteHandler | undefined {
  for (let index = args.length - 1; index >= 0; index -= 1) {
    const value = args[index];
    if (typeof value === "function") {
      return value as LateRouteHandler;
    }
  }
  return undefined;
}

function pathOf(url: string): string {
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}

// A route added after the instance has answered a request cannot reach Fastify's router (it refuses
// additions once started), so it is kept here and dispatched by the wildcard before classification.
function interceptLateRoutes(
  server: FastifyInstance,
  routes: Map<string, LateRouteHandler>,
): void {
  if (patched.has(server)) {
    return;
  }
  patched.add(server);

  const originalGet = server.get;
  server.get = function (this: FastifyInstance, url: string, ...args: unknown[]) {
    try {
      return Reflect.apply(originalGet, this, [url, ...args]);
    } catch (error) {
      if (alreadyStarted(error)) {
        const handler = lastFunction(args);
        if (handler !== undefined) {
          routes.set(url, handler);
          return this;
        }
      }
      throw error;
    }
  } as unknown as typeof server.get;
}

function notFound(): ApiError {
  return new ApiError(404, "NOT_FOUND", "Route not found");
}

function webNotBuilt(): ApiError {
  return new ApiError(503, "WEB_NOT_BUILT", "Web app is not built", {
    hint: WEB_NOT_BUILT_HINT,
  });
}

function send(reply: { header(name: string, value: string): unknown }, type: string, cache: string): void {
  reply.header("content-type", type);
  reply.header("cache-control", cache);
}

const webRegistered = new WeakSet<FastifyInstance>();

function assertValidDistDir(distDir: string): void {
  if (distDir.length === 0 || distDir.includes("\u0000")) {
    throw new WebAppError(
      "WEB_DIST_INVALID",
      "distDir must be a non-empty path without NUL characters",
    );
  }
}

export function registerWebApp(server: FastifyInstance, opts: WebAppOptions): void {
  const distDir = opts.distDir;
  assertValidDistDir(distDir);
  if (webRegistered.has(server)) {
    throw new WebAppError("WEB_APP_DUPLICATE", "the web app is already registered on this server");
  }
  webRegistered.add(server);
  registerSecurityHeaders(server);
  const lateRoutes = new Map<string, LateRouteHandler>();
  interceptLateRoutes(server, lateRoutes);

  server.get("/*", async (request, reply) => {
    const late = lateRoutes.get(pathOf(request.url));
    if (late !== undefined) {
      return late(request, reply);
    }

    const target = classifyWebPath(request.url);
    if (target.kind === "reserved" || target.kind === "refused") {
      throw notFound();
    }

    if (!(await isWebBuilt(distDir))) {
      throw webNotBuilt();
    }

    const root = await realpath(distDir);

    if (target.kind === "file") {
      const found = await resolveFile(root, target.segments);
      if (found !== undefined) {
        const name = target.segments[target.segments.length - 1] ?? "";
        const content = await readFile(found);
        send(reply, contentTypeFor(name), cacheControlFor(target.segments.join("/")));
        return content;
      }
      if (isAssetName(target.segments[target.segments.length - 1] ?? "")) {
        throw notFound();
      }
    }

    const index = await readFile(join(root, INDEX_HTML));
    send(reply, contentTypeFor(INDEX_HTML), cacheControlFor(INDEX_HTML));
    return index;
  });
}
