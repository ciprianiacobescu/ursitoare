import { isFieldName } from "./field.ts";

export const MAX_SCHEMA_PROPERTIES: number = 100;

const MAX_NAME_LENGTH = 64;
const MAX_LABEL_LENGTH = 80;
const MAX_HINT_LENGTH = 300;
const MAX_ERROR_LENGTH = 500;
const MAX_QUOTED_LENGTH = 40;
const MAX_TITLE_LENGTH = 80;
const MAX_LENGTH_KEYWORD = 10000;
const MAX_PATTERN_LENGTH = 200;
const MAX_ENUM_OPTIONS = 100;
const MAX_ENUM_TEXT_LENGTH = 200;
const MAX_REQUIRED_GHOSTS = 20;

const ALLOWED_TYPES: ReadonlySet<string> = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "array",
]);

const ROOT_KEYWORDS: ReadonlySet<string> = new Set([
  "$schema",
  "type",
  "title",
  "description",
  "properties",
  "required",
  "additionalProperties",
]);

const STRING_KEYWORDS: ReadonlySet<string> = new Set([
  "type",
  "title",
  "description",
  "minLength",
  "maxLength",
  "pattern",
]);

const NUMBER_KEYWORDS: ReadonlySet<string> = new Set([
  "type",
  "title",
  "description",
  "minimum",
  "maximum",
]);

const BOOLEAN_KEYWORDS: ReadonlySet<string> = new Set(["type", "title", "description"]);

const ENUM_KEYWORDS: ReadonlySet<string> = new Set(["type", "title", "description", "enum"]);

const ARRAY_KEYWORDS: ReadonlySet<string> = new Set(["type", "title", "description", "items"]);

const ITEM_KEYWORDS: ReadonlySet<string> = new Set([
  "type",
  "minLength",
  "maxLength",
  "pattern",
]);

export interface SchemaFieldBase {
  name: string;
  label: string;
  hint: string | null;
  required: boolean;
}

export type SchemaField =
  | (SchemaFieldBase & {
      kind: "string";
      minLength: number | null;
      maxLength: number | null;
      pattern: string | null;
    })
  | (SchemaFieldBase & {
      kind: "integer" | "number";
      minimum: number | null;
      maximum: number | null;
    })
  | (SchemaFieldBase & { kind: "boolean" })
  | (SchemaFieldBase & { kind: "enum"; options: readonly string[] })
  | (SchemaFieldBase & {
      kind: "string-list";
      itemMinLength: number | null;
      itemMaxLength: number | null;
      itemPattern: string | null;
    })
  | (SchemaFieldBase & { kind: "unsupported"; reason: string; error: string });

export interface SchemaFields {
  fields: readonly SchemaField[];
  problems: readonly string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cleanText(text: string): string {
  let cleaned = "";
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    cleaned += code <= 0x1f || code === 0x7f ? " " : character;
  }
  return cleaned;
}

function cut(text: string, maximum: number): string {
  return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
}

function quoted(text: string): string {
  return cut(cleanText(text), MAX_QUOTED_LENGTH);
}

function labelFromName(name: string, index: number): string {
  if (name.length === 0) return `Field ${index + 1}`;
  const spaced = name.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const lower = spaced.toLowerCase();
  const capitalised = `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
  return cut(capitalised, MAX_LABEL_LENGTH);
}

function baseFor(
  name: string,
  property: Record<string, unknown>,
  index: number,
  required: boolean,
): SchemaFieldBase {
  const title = property["title"];
  const label =
    typeof title === "string" && title.trim().length > 0
      ? cut(title.trim(), MAX_LABEL_LENGTH)
      : labelFromName(name, index);
  const description = property["description"];
  let hint: string | null = null;
  if (typeof description === "string") {
    const trimmed = description.trim();
    hint = trimmed.length > 0 ? cut(trimmed, MAX_HINT_LENGTH) : null;
  }
  return { name, label, hint, required };
}

function unsupportedField(base: SchemaFieldBase, reason: string): SchemaField {
  return {
    ...base,
    kind: "unsupported",
    reason,
    error: cut(`Unsupported: ${reason}`, MAX_ERROR_LENGTH),
  };
}

function keywordsFor(kind: string): ReadonlySet<string> {
  switch (kind) {
    case "integer":
    case "number":
      return NUMBER_KEYWORDS;
    case "boolean":
      return BOOLEAN_KEYWORDS;
    case "enum":
      return ENUM_KEYWORDS;
    case "array":
      return ARRAY_KEYWORDS;
    default:
      return STRING_KEYWORDS;
  }
}

function firstUnsupportedKeyword(
  record: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  suffix: string,
): string | null {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      return `keyword "${quoted(key)}" is not supported${suffix}`;
    }
  }
  return null;
}

function lengthValue(record: Record<string, unknown>, key: string): number | null {
  if (!Object.hasOwn(record, key)) return null;
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_LENGTH_KEYWORD) {
    return null;
  }
  return value;
}

function lengthProblem(record: Record<string, unknown>, key: string, prefix: string): string | null {
  if (!Object.hasOwn(record, key)) return null;
  if (lengthValue(record, key) === null) {
    return `${prefix}${key} must be an integer from 0 to ${MAX_LENGTH_KEYWORD}`;
  }
  return null;
}

function patternProblem(record: Record<string, unknown>, prefix: string): string | null {
  if (!Object.hasOwn(record, "pattern")) return null;
  const value = record["pattern"];
  if (typeof value !== "string" || value.length > MAX_PATTERN_LENGTH) {
    return `${prefix}pattern is not a valid expression`;
  }
  try {
    new RegExp(value, "u");
  } catch {
    return `${prefix}pattern is not a valid expression`;
  }
  return null;
}

function rangeValue(record: Record<string, unknown>, key: string): number | null {
  if (!Object.hasOwn(record, key)) return null;
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function rangeProblem(record: Record<string, unknown>, key: string): string | null {
  if (!Object.hasOwn(record, key)) return null;
  if (rangeValue(record, key) === null) {
    return `${key} must be a finite number`;
  }
  return null;
}

function enumOptions(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ENUM_OPTIONS) return null;
  const options: string[] = [];
  const seen = new Set<string>();
  for (const option of value) {
    if (typeof option !== "string" || option.length < 1 || option.length > MAX_ENUM_TEXT_LENGTH) {
      return null;
    }
    if (seen.has(option)) return null;
    seen.add(option);
    options.push(option);
  }
  return options;
}

const ENUM_REASON = `enum must hold 1 to ${MAX_ENUM_OPTIONS} distinct text values of 1 to ${MAX_ENUM_TEXT_LENGTH} characters`;

function parseProperty(
  key: string,
  property: unknown,
  index: number,
  required: boolean,
): SchemaField {
  const name = cut(cleanText(key), MAX_NAME_LENGTH);

  if (!isPlainObject(property)) {
    return unsupportedField(
      { name, label: labelFromName(name, index), hint: null, required },
      "the property schema must be an object",
    );
  }

  const base = baseFor(name, property, index, required);

  const validName: boolean = isFieldName(name);
  if (!validName) {
    return unsupportedField(
      { ...base, label: name.length > 0 ? name : labelFromName("", index) },
      "the property name is not supported",
    );
  }

  const hasType = Object.hasOwn(property, "type");
  const type = property["type"];

  if (Object.hasOwn(property, "enum") && hasType && type !== "string") {
    return unsupportedField(base, "enum is supported for text values only");
  }

  if (!hasType) {
    return unsupportedField(
      { ...base, name: "" },
      "the property has no type",
    );
  }

  if (typeof type !== "string") {
    return unsupportedField(base, "type must be a single name");
  }

  if (!ALLOWED_TYPES.has(type)) {
    return unsupportedField(base, `type "${quoted(type)}" is not supported`);
  }

  const kind = type === "string" && Object.hasOwn(property, "enum") ? "enum" : type;

  const keywordProblem = firstUnsupportedKeyword(property, keywordsFor(kind), "");
  if (keywordProblem !== null) return unsupportedField(base, keywordProblem);

  if (Object.hasOwn(property, "title")) {
    const title = property["title"];
    if (typeof title !== "string" || title.length < 1 || title.length > MAX_TITLE_LENGTH) {
      return unsupportedField(base, `title must be text of 1 to ${MAX_TITLE_LENGTH} characters`);
    }
  }

  if (Object.hasOwn(property, "description") && typeof property["description"] !== "string") {
    return unsupportedField(base, "description must be text");
  }

  if (kind === "string") {
    const minProblem = lengthProblem(property, "minLength", "");
    if (minProblem !== null) return unsupportedField(base, minProblem);
    const maxProblem = lengthProblem(property, "maxLength", "");
    if (maxProblem !== null) return unsupportedField(base, maxProblem);
    const pattern = patternProblem(property, "");
    if (pattern !== null) return unsupportedField(base, pattern);
    return {
      ...base,
      kind: "string",
      minLength: lengthValue(property, "minLength"),
      maxLength: lengthValue(property, "maxLength"),
      pattern: typeof property["pattern"] === "string" ? (property["pattern"] as string) : null,
    };
  }

  if (kind === "integer" || kind === "number") {
    const minProblem = rangeProblem(property, "minimum");
    if (minProblem !== null) return unsupportedField(base, minProblem);
    const maxProblem = rangeProblem(property, "maximum");
    if (maxProblem !== null) return unsupportedField(base, maxProblem);
    return {
      ...base,
      kind,
      minimum: rangeValue(property, "minimum"),
      maximum: rangeValue(property, "maximum"),
    };
  }

  if (kind === "boolean") {
    return { ...base, kind: "boolean" };
  }

  if (kind === "enum") {
    const options = enumOptions(property["enum"]);
    if (options === null) return unsupportedField(base, ENUM_REASON);
    return { ...base, kind: "enum", options };
  }

  if (!Object.hasOwn(property, "items")) {
    return unsupportedField(base, "array items must be strings");
  }
  const items = property["items"];
  if (!isPlainObject(items) || !Object.hasOwn(items, "type") || items["type"] !== "string") {
    return unsupportedField(base, "array items must be strings");
  }
  const itemKeywordProblem = firstUnsupportedKeyword(items, ITEM_KEYWORDS, " in items");
  if (itemKeywordProblem !== null) return unsupportedField(base, itemKeywordProblem);
  const itemMinProblem = lengthProblem(items, "minLength", "items ");
  if (itemMinProblem !== null) return unsupportedField(base, itemMinProblem);
  const itemMaxProblem = lengthProblem(items, "maxLength", "items ");
  if (itemMaxProblem !== null) return unsupportedField(base, itemMaxProblem);
  const itemPatternProblem = patternProblem(items, "items ");
  if (itemPatternProblem !== null) return unsupportedField(base, itemPatternProblem);
  return {
    ...base,
    kind: "string-list",
    itemMinLength: lengthValue(items, "minLength"),
    itemMaxLength: lengthValue(items, "maxLength"),
    itemPattern: typeof items["pattern"] === "string" ? (items["pattern"] as string) : null,
  };
}

export function schemaToFields(schema: unknown): SchemaFields {
  if (!isPlainObject(schema)) {
    return { fields: [], problems: ["the schema must be an object"] };
  }

  if (schema["type"] !== "object") {
    return { fields: [], problems: ['the schema must have type "object"'] };
  }

  const problems: string[] = [];

  for (const key of Object.keys(schema)) {
    if (!ROOT_KEYWORDS.has(key)) {
      problems.push(`keyword "${quoted(key)}" is not supported at the top level`);
    }
  }

  let properties: Record<string, unknown> | null = {};
  if (Object.hasOwn(schema, "properties")) {
    const value = schema["properties"];
    if (!isPlainObject(value)) {
      problems.push("properties must be an object");
      properties = null;
    } else {
      properties = value;
    }
  }

  let requiredNames: string[] = [];
  if (Object.hasOwn(schema, "required")) {
    const value = schema["required"];
    if (!Array.isArray(value) || !value.every((name) => typeof name === "string")) {
      problems.push("required must be a list of property names");
    } else {
      requiredNames = value;
    }
  }

  if (Object.hasOwn(schema, "additionalProperties")) {
    if (typeof schema["additionalProperties"] !== "boolean") {
      problems.push("additionalProperties must be true or false");
    }
  }

  if (properties === null) {
    return { fields: [], problems };
  }

  const keys = Object.keys(properties);
  if (keys.length > MAX_SCHEMA_PROPERTIES) {
    problems.push("more than 100 properties");
    return { fields: [], problems };
  }

  const requiredSet = new Set(requiredNames);
  const fields: SchemaField[] = keys.map((key, index) =>
    parseProperty(key, properties[key], index, requiredSet.has(key)),
  );

  const ghosts = new Set<string>();
  let ghostCount = 0;
  for (const name of requiredNames) {
    if (Object.hasOwn(properties, name) || ghosts.has(name)) continue;
    if (ghostCount >= MAX_REQUIRED_GHOSTS) break;
    ghosts.add(name);
    ghostCount += 1;
    const cleanName = cut(cleanText(name), MAX_NAME_LENGTH);
    fields.push(
      unsupportedField(
        {
          name: cleanName,
          label: labelFromName(cleanName, fields.length),
          hint: null,
          required: true,
        },
        "a required property has no schema",
      ),
    );
  }

  return { fields, problems };
}
