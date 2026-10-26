export type DbErrorDetails = Record<string, string | number | string[]>;

export class DbError extends Error {
  code: string;
  details: DbErrorDetails;

  constructor(code: string, message: string, details: DbErrorDetails = {}) {
    super(message);
    this.name = "DbError";
    this.code = code;
    this.details = details;
  }
}
