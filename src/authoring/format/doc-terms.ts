// Terms that the format documentation must name, and the check that it does
// (design Decision 10).

import { FORMAT_ERROR_CODES } from "./errors.ts";
import { FLOW_TOP_LEVEL_FIELDS, NODE_KINDS } from "./types.ts";

const NODE_V02_FIELDS: readonly string[] = [
  "tags",
  "pre",
  "post",
  "profile",
  "skills",
  "skill_mode",
  "context",
  "context_budget",
];

const HOOK_FIELDS: readonly string[] = [
  "hook",
  "id",
  "match",
  "kind",
  "effect",
  "nodes",
  "tags",
  "from",
  "next",
  "outcome",
  "when",
  "input",
  "source",
  "routes",
  "max_retries",
  "allow_effect_retry",
  "uses",
  "with",
  "on_error",
];

const REFERENCE_ROOTS: readonly string[] = ["inputs", "nodes", "item", "hook"];

const REFERENCE_SCOPES: readonly string[] = ["input", "output", "node", "next", "from"];

const LIMIT_NAMES_AND_VALUES: readonly string[] = [
  "maxBytes",
  "1048576",
  "maxDepth",
  "64",
  "maxAliasCount",
  "20",
];

/** Every term the format documentation must name, without duplicates. */
export function documentedTerms(): string[] {
  const terms = new Set<string>();
  const ordered = [
    ...FLOW_TOP_LEVEL_FIELDS,
    ...NODE_KINDS,
    ...NODE_V02_FIELDS,
    ...HOOK_FIELDS,
    ...REFERENCE_ROOTS,
    ...REFERENCE_SCOPES,
    ...FORMAT_ERROR_CODES,
    "sha256",
    ...LIMIT_NAMES_AND_VALUES,
  ];
  for (const term of ordered) terms.add(term);
  return [...terms];
}

const CODE_SPAN = /(?<!`)`([^`\n]+)`(?!`)/g;

function inlineCodeSpans(markdown: string): Set<string> {
  const spans = new Set<string>();
  for (const match of markdown.matchAll(CODE_SPAN)) {
    const content = match[1];
    if (content !== undefined) spans.add(content);
  }
  return spans;
}

/** The terms, in `documentedTerms()` order, that the markdown does not name as inline code. */
export function missingDocTerms(markdown: string): string[] {
  const spans = inlineCodeSpans(markdown);
  return documentedTerms().filter((term) => !spans.has(term));
}
