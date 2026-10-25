// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { FastifyInstance } from "fastify";

export interface WebAppOptions {
  readonly distDir: string;
}

export type WebAppErrorCode = "WEB_DIST_INVALID" | "WEB_APP_DUPLICATE";

export class WebAppError extends Error {
  readonly code: WebAppErrorCode;
  constructor(_code: WebAppErrorCode, _message: string) {
    super();
    throw new Error("not implemented");
  }
}

export const DEFAULT_WEB_DIST: string = "";

export function registerWebApp(_server: FastifyInstance, _opts: WebAppOptions): void {
  throw new Error("not implemented");
}

export function isWebBuilt(_distDir: string): Promise<boolean> {
  throw new Error("not implemented");
}
