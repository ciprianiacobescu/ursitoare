// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type SecretReader = (path: string) => string;

export class Secret {
  constructor(_value: string) {
    throw new Error("not implemented");
  }
  reveal(): string {
    throw new Error("not implemented");
  }
  toJSON(): string {
    throw new Error("not implemented");
  }
  toString(): string {
    throw new Error("not implemented");
  }
}

export function readSecretValue(_variable: string, _path: string, _readSecret: SecretReader): Secret {
  throw new Error("not implemented");
}
