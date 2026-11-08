// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const FIXTURE_REFS: readonly string[] = [];

export function digestHex(_value: unknown, _length: number): string {
  throw new Error("not implemented");
}

export function lookupVendor(_name: unknown): {
  vendor_id: string;
  name: string;
  status: "active" | "blocked";
  payment_terms_days: number;
} {
  throw new Error("not implemented");
}

export type FixtureResult = { status: 200; output: unknown } | { status: 404; body: unknown };

export function fixtureFor(
  _ref: string,
  _input: Record<string, unknown>,
  _key: string,
): FixtureResult {
  throw new Error("not implemented");
}
