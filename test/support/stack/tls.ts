// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface TestCertificate {
  certPem: string;
  keyPem: string;
}

export const FAKE_HOSTS: readonly string[] = [];

export function createTestCa(_now: Date): TestCertificate {
  throw new Error("not implemented");
}

export function issueServerCertificate(
  _ca: TestCertificate,
  _hosts: readonly string[],
  _now: Date,
): TestCertificate {
  throw new Error("not implemented");
}
