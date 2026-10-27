// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const MAX_SCHEMA_PROPERTIES: number = 0;

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

export function schemaToFields(_schema: unknown): SchemaFields {
  throw new Error("not implemented");
}
