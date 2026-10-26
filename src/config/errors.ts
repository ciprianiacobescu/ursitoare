export type ConfigErrorCode = "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY";

export class ConfigError extends Error {
  readonly code: ConfigErrorCode;
  readonly variable: string;

  constructor(code: ConfigErrorCode, variable: string, reason: string) {
    super(`${variable}: ${reason}`);
    this.name = "ConfigError";
    this.code = code;
    this.variable = variable;
  }
}
