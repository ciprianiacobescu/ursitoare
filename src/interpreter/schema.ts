import { Ajv2020 } from "ajv/dist/2020.js";

import type { JsonValue } from "../authoring/index.ts";

const ajv = new Ajv2020({ allErrors: false, strict: false, validateFormats: false });

export type SchemaCheck = { ok: true } | { ok: false; path: string; keyword: string };

export function checkSchema(schema: unknown, data: JsonValue): SchemaCheck {
  try {
    const validate = ajv.compile(schema as object);
    if (validate(data)) return { ok: true };
    const first = validate.errors?.[0];
    return {
      ok: false,
      path: first?.instancePath === undefined || first.instancePath === "" ? "/" : first.instancePath,
      keyword: first?.keyword ?? "schema",
    };
  } catch {
    return { ok: false, path: "/", keyword: "schema" };
  }
}
