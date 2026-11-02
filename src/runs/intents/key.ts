// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export function idemKey(
  _tenantId: string,
  _lineageId: string,
  _nodeId: string,
  _effectSeq: number,
  _generation?: number,
): string {
  throw new Error("not implemented");
}

export function lineageOf(_run: { runId: string; lineageId: string }): string {
  throw new Error("not implemented");
}
