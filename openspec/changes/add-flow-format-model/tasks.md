Spec: `specs/flow-format/spec.md`; signatures and decisions: `design.md`. Each test file declares its own inline sample flow and wraps every call in `assert.doesNotThrow(() => { r = f(x); })` before asserting on `r` (design.md § Test plan). Tests import from `src/authoring/format/index.ts` (`hash.test.ts` from `src/authoring/index.ts`), and test names contain no `.`, `[` or `::`.

## 1. Catalogue interface

- [x] 1.1 Write `src/authoring/format/catalogue.test.ts` first (scenario "Empty catalogue and versioned references": the five `emptyCatalogue` lookups and the twelve `parseVersionedRef` inputs), then implement `emptyCatalogue` and `parseVersionedRef` in `src/authoring/format/catalogue.ts` as design.md Decision 9 says, implementing requirement "The catalogue is an interface with a versioned-reference helper"

## 2. Reference grammar

- [x] 2.1 Write `src/authoring/format/refs.test.ts` first (scenarios "A reference is parsed or explained" and "Templates are scanned into segments"), then implement `parseRef`, `scanTemplate`, `isSingleRef`, `refToString`, `suspiciousInterpolation`, `walkStrings` and `escapePointer` in `src/authoring/format/refs.ts` as a port of `seed/format/src/refs.ts` (read-only) with the `hook` root and the renames of design.md Decision 7, implementing requirement "References are parsed by one grammar"

## 3. Node helpers

- [x] 3.1 Write `src/authoring/format/nodes.test.ts` first (scenario "Value fields and successors per node kind"), then implement `valueFields`, `hookValueFields`, `successorFields` and `requiredSuccessorFields` in `src/authoring/format/nodes.ts` (design.md Decision 8; ported from `seed/format/src/refs.ts` and `graph.ts`, without `any`), implementing requirement "Node structure is read through shared helpers"

## 4. Safe parsing

- [ ] 4.1 Write `src/authoring/format/parse.test.ts` first (scenarios "YAML and JSON parse to the same document", "Malformed text is refused with a code and a position", "Values that are not JSON are refused", "Size is measured in bytes before parsing", "Deep and self-referencing documents are refused" and "Alias expansion is bounded"), then implement `formatOf` and `parseFlowText` in `src/authoring/format/parse.ts` (YAML options, BOM, byte check, lower-only `limits`, error mapping with `line` and `column`) and the walk `findJsonProblem(value, maxDepth)` in `src/authoring/format/json-value.ts`, as design.md Decisions 1 to 3 say, implementing requirements "Flow text is parsed into a plain document or refused with a code" and "Parsing is bounded in size, depth and aliases"

## 5. Canonical form

- [ ] 5.1 Write `src/authoring/format/canonical.test.ts` first (scenarios "Canonical JSON ignores order, surface and reference spacing", "Canonical JSON keeps real differences and unusual keys" and "Canonical form refuses what is not JSON"; errors asserted by `instanceof FormatError`, `code` and `path`), then implement `FormatError` in `src/authoring/format/errors.ts` and `canonicalizeFlow`, `stableStringify`, `canonicalJson` and `canonicalEqual` in `src/authoring/format/canonical.ts` as design.md Decision 5 says (objects built with `Object.fromEntries`), implementing requirement "Canonical JSON is one string per meaning"

## 6. Content hash

- [ ] 6.1 Write `src/authoring/format/hash.test.ts` first (scenario "The hash is sha256 of the canonical JSON", importing `contentHash` and `isContentHash` from `src/authoring/index.ts`; the three golden hashes asserted as literals), then implement `contentHash` and `isContentHash` in `src/authoring/format/hash.ts` with `node:crypto` and confirm that `src/authoring/format/index.ts` and `src/authoring/index.ts` export every name of design.md § Interfaces, implementing requirement "The content hash identifies a canonical flow"

## 7. Documentation

- [ ] 7.1 Write `src/authoring/format/doc-terms.test.ts` first (scenario "The documentation names every term": first asserts with `existsSync` that `docs/authoring/format.md` exists, then reads it with `readFileSync(new URL("../../../docs/authoring/format.md", import.meta.url), "utf8")`), then implement `documentedTerms` and `missingDocTerms` in `src/authoring/format/doc-terms.ts` and write `docs/authoring/format.md` (sections as design.md Decision 10, every term as an inline code span, with one YAML example flow), implementing requirement "The format is documented and the documentation is checked"
