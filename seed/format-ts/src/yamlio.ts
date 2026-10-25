import YAML from "yaml";

/** Parse a flow document: YAML 1.2 core schema, no custom tags, duplicate keys and parser warnings are errors. */
export function parseYaml(text: string): unknown {
  const d = YAML.parseDocument(text, { version: "1.2", schema: "core", customTags: [], uniqueKeys: true, merge: false, prettyErrors: false, strict: true });
  const problems = [...d.errors, ...d.warnings];
  if (problems.length) throw new Error(`invalid YAML: ${problems.map((p) => p.message.split("\n")[0]).join("; ")}`);
  return d.toJS({ maxAliasCount: 100 });
}

/** Block-style YAML with literal blocks for multi-line strings; parseYaml(dumpYaml(x)) deep-equals x. */
export function dumpYaml(doc: unknown): string {
  return YAML.stringify(doc, { lineWidth: 0, blockQuote: "literal", indent: 2 });
}
