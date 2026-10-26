import { inspect } from "node:util";

import { ConfigError } from "./errors.ts";

export type SecretReader = (path: string) => string;

const REDACTED = "[REDACTED]";
const SECRET_EMPTY_REASON = "file is missing, unreadable or empty";

export class Secret {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  reveal(): string {
    return this.#value;
  }

  toJSON(): string {
    return REDACTED;
  }

  toString(): string {
    return REDACTED;
  }

  [inspect.custom](): string {
    return REDACTED;
  }
}

function stripOneTrailingNewline(value: string): string {
  if (value.endsWith("\r\n")) return value.slice(0, -2);
  if (value.endsWith("\n")) return value.slice(0, -1);
  return value;
}

export function readSecretValue(variable: string, path: string, readSecret: SecretReader): Secret {
  let contents: string;
  try {
    contents = readSecret(path);
  } catch {
    throw new ConfigError("CONFIG_SECRET_EMPTY", variable, SECRET_EMPTY_REASON);
  }

  const value = stripOneTrailingNewline(contents);
  if (value.trim() === "") {
    throw new ConfigError("CONFIG_SECRET_EMPTY", variable, SECRET_EMPTY_REASON);
  }

  return new Secret(value);
}
