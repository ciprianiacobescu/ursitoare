const API_ERROR_STATUS_MIN = 400;
const API_ERROR_STATUS_MAX = 599;
const API_ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

const VALIDATION_FAILED_MESSAGE = "Request validation failed";
const PAYLOAD_TOO_LARGE_MESSAGE = "Payload too large";
const UNSUPPORTED_MEDIA_TYPE_MESSAGE = "Unsupported media type";
const BAD_REQUEST_MESSAGE = "Bad request";
const INTERNAL_MESSAGE = "Internal server error";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    if (
      !Number.isInteger(status) ||
      status < API_ERROR_STATUS_MIN ||
      status > API_ERROR_STATUS_MAX
    ) {
      throw new RangeError("ApiError status must be an integer from 400 to 599");
    }
    if (!API_ERROR_CODE_PATTERN.test(code)) {
      throw new RangeError("ApiError code must match /^[A-Z][A-Z0-9_]*$/");
    }

    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : undefined;
}

function stringField(record: UnknownRecord | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(record: UnknownRecord | undefined, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === "number" ? value : undefined;
}

function validationField(context: string, issue: UnknownRecord | undefined): string {
  const instancePath = stringField(issue, "instancePath") ?? "";
  const keyword = stringField(issue, "keyword");
  const params = asRecord(issue?.params);

  let suffix = "";
  if (keyword === "required") {
    const missing = stringField(params, "missingProperty");
    if (missing !== undefined) suffix = `/${missing}`;
  } else if (keyword === "additionalProperties") {
    const additional = stringField(params, "additionalProperty");
    if (additional !== undefined) suffix = `/${additional}`;
  }

  return `${context}${instancePath}${suffix}`;
}

function envelope(code: string, message: string, details?: unknown): ErrorEnvelope {
  if (details === undefined) {
    return { error: { code, message } };
  }
  return { error: { code, message, details } };
}

export function toErrorResponse(error: unknown): { status: number; body: ErrorEnvelope } {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: envelope(error.code, error.message, error.details),
    };
  }

  const record = asRecord(error);
  const validation = record?.validation;
  if (Array.isArray(validation) && validation.length > 0) {
    const context = stringField(record, "validationContext") ?? "";
    const fields = validation.map((issue) => {
      const issueRecord = asRecord(issue);
      return {
        field: validationField(context, issueRecord),
        message: stringField(issueRecord, "message") ?? "is invalid",
      };
    });
    return {
      status: 400,
      body: envelope("VALIDATION_FAILED", VALIDATION_FAILED_MESSAGE, { fields }),
    };
  }

  const statusCode = numberField(record, "statusCode");
  const code = stringField(record, "code");

  if (statusCode === 400 && code !== undefined && code.startsWith("FST_ERR_CTP")) {
    return {
      status: 400,
      body: envelope("VALIDATION_FAILED", VALIDATION_FAILED_MESSAGE, {
        fields: [{ field: "body", message: "malformed JSON" }],
      }),
    };
  }

  if (statusCode === 413) {
    return { status: 413, body: envelope("PAYLOAD_TOO_LARGE", PAYLOAD_TOO_LARGE_MESSAGE) };
  }

  if (statusCode === 415) {
    return {
      status: 415,
      body: envelope("UNSUPPORTED_MEDIA_TYPE", UNSUPPORTED_MEDIA_TYPE_MESSAGE),
    };
  }

  if (statusCode !== undefined && statusCode >= 400 && statusCode <= 499) {
    return { status: statusCode, body: envelope("BAD_REQUEST", BAD_REQUEST_MESSAGE) };
  }

  return { status: 500, body: envelope("INTERNAL", INTERNAL_MESSAGE) };
}
