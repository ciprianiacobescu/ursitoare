// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { OpenApiOverlay } from "../../src/tools/index.ts";

export const SHOP_ORIGIN: string = "";

export const SHOP_DOC: Readonly<Record<string, unknown>> = {};

export const SHOP_OVERLAY: OpenApiOverlay = { operations: {} };

export function docOf(
  _path: string,
  _method: string,
  _op: Record<string, unknown>,
  _extra?: Record<string, unknown>,
  _version?: string,
): Record<string, unknown> {
  throw new Error("not implemented");
}
