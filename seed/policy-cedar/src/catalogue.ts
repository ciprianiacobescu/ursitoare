import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CATALOGUE_PATH = path.resolve(ROOT, "../shared/catalogue/blocks.v0.json");
export const RF1_PATH = path.resolve(ROOT, "../shared/flows/rf-1-invoice-intake.yaml");

export type Effect = "read" | "write" | "send" | "pay";
export interface Block {
  effect: Effect;
  description?: string;
  input: { type: "object"; properties: Record<string, JsonSchemaProp>; required?: string[] };
  output: { type: "object"; properties: Record<string, JsonSchemaProp>; required?: string[] };
  untrusted_fields?: string[];
}
export interface JsonSchemaProp {
  type?: string;
  enum?: string[];
  items?: JsonSchemaProp;
  properties?: Record<string, JsonSchemaProp>;
}
export interface Catalogue {
  blocks: Record<string, Block>;
  roles: string[];
  model_profiles: string[];
  delegate_targets: Record<string, string[]>;
}

export function loadCatalogue(): Catalogue {
  return JSON.parse(readFileSync(CATALOGUE_PATH, "utf8")) as Catalogue;
}

export type CedarArgType = "String" | "Long" | "Bool" | "decimal" | "Set<String>" | null;

/** Map a catalogue input property to a Cedar type, or null if Cedar cannot type it (free-form object). */
export function cedarTypeOf(p: JsonSchemaProp): CedarArgType {
  switch (p.type) {
    case "string":
      return "String";
    case "integer":
      return "Long";
    case "boolean":
      return "Bool";
    case "number":
      return "decimal";
    case "array":
      return p.items?.type === "string" ? "Set<String>" : null;
    default:
      return null; // "object": no open records in Cedar schema (experimental) -> not constrainable
  }
}

/** Union of all (non-object) tool input properties; throws on a type conflict between tools. */
export function unionToolArgs(cat: Catalogue): { attrs: Map<string, CedarArgType>; untypable: Map<string, string[]> } {
  const attrs = new Map<string, CedarArgType>();
  const untypable = new Map<string, string[]>();
  for (const [name, b] of Object.entries(cat.blocks)) {
    for (const [prop, def] of Object.entries(b.input.properties)) {
      const t = cedarTypeOf(def);
      if (t === null) {
        untypable.set(name, [...(untypable.get(name) ?? []), prop]);
        continue;
      }
      const prev = attrs.get(prop);
      if (prev && prev !== t) throw new Error(`args type conflict on '${prop}': ${prev} vs ${t} (${name})`);
      attrs.set(prop, t);
    }
  }
  return { attrs, untypable };
}
