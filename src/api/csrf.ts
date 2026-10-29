import type { FastifyRequest } from "fastify";

import { verifyCsrfToken } from "../identity/index.ts";
import type { SessionContext } from "../identity/index.ts";
import type { PepDeps } from "./pep.ts";

export type CsrfOutcome = "ok" | "origin" | "token";

function singleTokenHeader(request: FastifyRequest): string | undefined {
  const raw = request.raw.rawHeaders;
  let count = 0;
  for (let index = 0; index < raw.length; index += 2) {
    if (raw[index]?.toLowerCase() === "x-csrf-token") {
      count += 1;
    }
  }
  if (count !== 1) {
    return undefined;
  }
  const value = request.headers["x-csrf-token"];
  return typeof value === "string" ? value : undefined;
}

function expectedOrigin(publicBaseUrl: string): string | undefined {
  try {
    return new URL(publicBaseUrl).origin;
  } catch {
    return undefined;
  }
}

export async function checkCsrf(
  request: FastifyRequest,
  deps: PepDeps,
  session: SessionContext,
): Promise<CsrfOutcome> {
  const origin = request.headers.origin;
  if (origin !== undefined) {
    if (typeof origin !== "string" || origin !== expectedOrigin(deps.publicBaseUrl)) {
      return "origin";
    }
  }

  if (deps.pool === null) {
    return "token";
  }
  const token = singleTokenHeader(request);
  const valid = await verifyCsrfToken(deps.pool, session, token);
  return valid ? "ok" : "token";
}
