// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { FastifyInstance } from "fastify";

export const CONTENT_SECURITY_POLICY: string = "";

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {};

export function registerSecurityHeaders(_server: FastifyInstance): void {
  throw new Error("not implemented");
}
