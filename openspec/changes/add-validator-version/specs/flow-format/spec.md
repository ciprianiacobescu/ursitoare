## ADDED Requirements

### Requirement: A reference names a node id of at most 128 characters
`parseRef` SHALL accept `nodes.<id>.output.<path>` and `nodes.<id>.outcome` only for an `<id>` that matches `^[a-z][a-z0-9_]{0,127}$` (`NODE_ID` in `src/authoring/format/refs.ts`, built from `MAX_NODE_ID_LENGTH`), and SHALL answer `{ error: "invalid node id \"<id>\" in reference" }` for any other id, never throwing.

#### Scenario: parseRef accepts 128 characters and refuses 129
- **WHEN** `parseRef` runs on the rows P1 to P6 of `test-plan.md` § Reference rows (`id(n)` is `"x"` followed by `n - 1` times `"a"`)
- **THEN** P1 (`nodes.<id(128)>.output.v`) returns `{ ref: { root: "node", id: <id(128)>, field: "output", path: ["v"] } }`; P2 (`nodes.<id(128)>.outcome`) returns `{ ref: { root: "node", id: <id(128)>, field: "outcome", path: [] } }`; P3 and P4 (the same two forms with `id(129)`) return `{ error: "invalid node id \"<id(129)>\" in reference" }` and no `ref`; P5 (`nodes.a.output.v`) still returns `{ ref: { root: "node", id: "a", field: "output", path: ["v"] } }`; P6 (`nodes.A.output.v`) still returns `{ error: "invalid node id \"A\" in reference" }`

### Requirement: The format document states the node-id rule and the optional selector
`docs/authoring/format.md` SHALL state in its `nodes` entry that a node id is "lower-case snake_case, at most 128 characters", and in its Hooks section that a hook rule has "an `id`, an optional `match` selector (an absent one selects every node) and optional `pre` and `post` hook definitions" (the text read with whitespace collapsed to single spaces), and SHALL no longer say "a `match` selector and optional".

#### Scenario: format.md reads both phrases
- **WHEN** the test reads `docs/authoring/format.md`, collapses every run of whitespace to one space, and checks the three phrases of `test-plan.md` § Document rows, then calls `missingDocTerms` on the file
- **THEN** the text contains `lower-case snake_case, at most 128 characters` and ``an `id`, an optional `match` selector (an absent one selects every node) and optional `pre` and `post` hook definitions``, does not contain ``a `match` selector and optional``, and `missingDocTerms` of the file is `[]`
