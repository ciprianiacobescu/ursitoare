import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError, toErrorResponse } from "./errors.ts";

interface ValidationIssue {
  readonly instancePath: string;
  readonly keyword: string;
  readonly message: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

type Mapped = ReturnType<typeof toErrorResponse>;

function map(error: unknown): Mapped {
  let result: Mapped | undefined;
  assert.doesNotThrow(() => {
    result = toErrorResponse(error);
  }, "toErrorResponse must not throw");
  assert.ok(result, "toErrorResponse must return a result");
  return result;
}

function apiError(status: number, code: string, message: string, details?: unknown): ApiError {
  let created: ApiError | undefined;
  assert.doesNotThrow(() => {
    created = new ApiError(status, code, message, details);
  }, `ApiError(${status}, ${code}) must be accepted`);
  assert.ok(created instanceof ApiError);
  return created;
}

function validationFailure(context: string, issue: ValidationIssue): Error {
  return Object.assign(new Error(`validation failed for ${issue.keyword}`), {
    statusCode: 400,
    code: "FST_ERR_VALIDATION",
    validationContext: context,
    validation: [issue],
  });
}

function errorWith(fields: Record<string, unknown>): Error {
  return Object.assign(new Error("boom"), fields);
}

test("C-3284ea9e toErrorResponse maps an ApiError with and without details", () => {
  const withDetails = apiError(409, "FLOW_EXISTS", "Already exists", { id: "f1" });

  assert.equal(withDetails.status, 409);
  assert.equal(withDetails.code, "FLOW_EXISTS");
  assert.equal(withDetails.message, "Already exists");
  assert.deepEqual(withDetails.details, { id: "f1" });
  assert.deepEqual(map(withDetails), {
    status: 409,
    body: {
      error: { code: "FLOW_EXISTS", message: "Already exists", details: { id: "f1" } },
    },
  });

  const withoutDetails = apiError(404, "MISSING", "Not here");
  const withoutMapped = map(withoutDetails);
  assert.equal(withoutMapped.status, 404);
  assert.deepEqual(withoutMapped.body, { error: { code: "MISSING", message: "Not here" } });
  assert.ok(!("details" in withoutMapped.body.error));
});

test("C-3284ea9e ApiError refuses a status outside 400 to 599 or a malformed code", () => {
  assert.throws(() => new ApiError(200, "X", "m"), RangeError);
  assert.throws(() => new ApiError(399, "X", "m"), RangeError);
  assert.throws(() => new ApiError(600, "X", "m"), RangeError);
  assert.throws(() => new ApiError(400, "lower", "m"), RangeError);
  assert.throws(() => new ApiError(400, "BAD-CODE", "m"), RangeError);
  assert.throws(() => new ApiError(400, "", "m"), RangeError);
});

test("C-240590ab toErrorResponse maps body schema failures to field details", () => {
  const wrongType = map(
    validationFailure("body", {
      instancePath: "/a",
      keyword: "type",
      message: "must be integer",
    }),
  );
  assert.deepEqual(wrongType, {
    status: 400,
    body: {
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: { fields: [{ field: "body/a", message: "must be integer" }] },
      },
    },
  });

  const missing = map(
    validationFailure("body", {
      instancePath: "",
      keyword: "required",
      message: "must have required property 'b'",
      params: { missingProperty: "b" },
    }),
  );
  assert.deepEqual(missing.body.error.details, {
    fields: [{ field: "body/b", message: "must have required property 'b'" }],
  });

  const additional = map(
    validationFailure("body", {
      instancePath: "",
      keyword: "additionalProperties",
      message: "must NOT have additional properties",
      params: { additionalProperty: "z" },
    }),
  );
  assert.deepEqual(additional.body.error.details, {
    fields: [{ field: "body/z", message: "must NOT have additional properties" }],
  });
});

test("C-240590ab toErrorResponse reports query and path parameter fields", () => {
  const query = map(
    validationFailure("querystring", {
      instancePath: "/n",
      keyword: "type",
      message: "must be integer",
    }),
  );
  assert.deepEqual(query.body.error.details, {
    fields: [{ field: "querystring/n", message: "must be integer" }],
  });

  const path = map(
    validationFailure("params", {
      instancePath: "/id",
      keyword: "type",
      message: "must be string",
    }),
  );
  assert.deepEqual(path.body.error.details, {
    fields: [{ field: "params/id", message: "must be string" }],
  });
});

test("C-d145c766 toErrorResponse maps malformed JSON oversized and wrongly typed bodies", () => {
  const malformed = map(
    errorWith({ statusCode: 400, code: "FST_ERR_CTP_INVALID_JSON_BODY" }),
  );
  assert.deepEqual(malformed, {
    status: 400,
    body: {
      error: {
        code: "VALIDATION_FAILED",
        message: "Request validation failed",
        details: { fields: [{ field: "body", message: "malformed JSON" }] },
      },
    },
  });

  const tooLarge = map(errorWith({ statusCode: 413, code: "FST_ERR_CTP_BODY_TOO_LARGE" }));
  assert.deepEqual(tooLarge, {
    status: 413,
    body: { error: { code: "PAYLOAD_TOO_LARGE", message: "Payload too large" } },
  });

  const unsupported = map(
    errorWith({ statusCode: 415, code: "FST_ERR_CTP_INVALID_MEDIA_TYPE" }),
  );
  assert.deepEqual(unsupported, {
    status: 415,
    body: { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported media type" } },
  });
});

test("C-d145c766 toErrorResponse keeps another 4xx status as BAD_REQUEST", () => {
  const tooManyRequests = map(errorWith({ statusCode: 429 }));

  assert.deepEqual(tooManyRequests, {
    status: 429,
    body: { error: { code: "BAD_REQUEST", message: "Bad request" } },
  });
});

test("C-aea19ec5 toErrorResponse hides an unknown error behind INTERNAL", () => {
  const plain = map(new Error("db password=hunter2"));
  assert.deepEqual(plain, {
    status: 500,
    body: { error: { code: "INTERNAL", message: "Internal server error" } },
  });
  assert.ok(!JSON.stringify(plain).includes("hunter2"));

  const dependency = map(
    errorWith({ detail: "Failing row contains (hunter2)", code: "23505" }),
  );
  assert.deepEqual(dependency, {
    status: 500,
    body: { error: { code: "INTERNAL", message: "Internal server error" } },
  });
  assert.ok(!JSON.stringify(dependency).includes("hunter2"));
});
