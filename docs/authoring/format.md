# Flow format v0

A flow document is plain JSON. It is written as YAML or JSON text, parsed into a
plain document, validated, and then reduced to one canonical JSON string whose
SHA-256 hash pins a published version. This page documents the format itself;
validation lives in the validator unit.

## Top-level fields

Every flow has the top-level fields `ursitoare`, `flow`, `version`, `description`,
`inputs`, `start`, `nodes`, `hooks` and `expose`. Of these, `ursitoare`, `flow`,
`version`, `inputs`, `start` and `nodes` are required; `description`, `hooks` and
`expose` are optional.

- `ursitoare` identifies the format version; v0 documents use `"0.1"`.
- `flow` is the flow name, in lower-case kebab or snake case.
- `version` is the document version string.
- `description` is free text and is left untouched by canonicalisation.
- `inputs` is a JSON Schema object describing the flow inputs.
- `start` names the entry node id.
- `nodes` maps node ids to node objects.
- `hooks` is an optional list of hook rules.
- `expose` is optional; its only v0 value is `"mcp"`.

## Node kinds

There are fourteen node kinds: `block`, `code`, `llm.extract`,
`llm.generate`, `llm.decide`, `agent`, `switch`, `human.approval`,
`human.form`, `foreach`, `subflow`, `delegate`, `wait` and `end`.

Every node may carry the v0.2 fields `tags`, `pre` and `post`; `pre` and `post`
are lists of hooks that run before and after the node.

The LLM nodes (`llm.extract`, `llm.generate`, `llm.decide` and `agent`) may also
carry the v0.2 tuning fields `profile`, `skills`, `skill_mode`, `context` and
`context_budget`. `skill_mode` is `bound` or `catalog`. `context_budget`
declares a `total_tokens` budget.

Value-holding fields differ per kind: `with` for `block`, `subflow` and
`delegate`; `input` for `code` and the LLM kinds; `items` and `with` for
`foreach`; `summary` for `human.approval`; `on` for `switch`; `output` for
`end`. References are allowed in these fields; text elsewhere is literal.

## Hooks

A `hooks` entry is a hook rule with an `id`, a `match` selector and optional
`pre` and `post` hook definitions. A selector may filter by `kind`, `effect`,
`nodes` or `tags`. The `effect` values are `read`, `write`, `send`, `pay`,
`human` and `none`. A rule may also constrain the previous edge with `when`,
whose `from` and `next` selectors and `outcome` list narrow when it applies.

A hook definition has a `kind` of `code` or `block`. Both may have an `id`, a
`when` condition and an `input` value mapping. A `code` hook adds a `source`
string, optional `routes`, `max_retries` and `allow_effect_retry`. A `block`
hook adds `uses`, `with` and an optional `on_error` of `fail` or `continue`.

A value inside a block hook's `with` may reference the hook itself with the
`hook` root, for example `hook.input` or `hook.output`.

## References

A reference is written `${{ <reference> }}`. The reference roots are `inputs`,
`nodes`, `item` and `hook`.

- `inputs.<path>` reads a flow input.
- `nodes.<id>.output.<path>` reads a node output.
- `nodes.<id>.outcome` reads a decision outcome.
- `item` and `item.<path>` read the current `foreach` item.
- `hook.<scope>.<path>` reads the current hook; the scopes are `input`,
  `output`, `node`, `next` and `from`.

Path segments are letters, digits and underscores. Node ids start with a
lower-case letter. Canonical JSON re-prints each reference in a value field as
`${{ <reference> }}`, but leaves text around references, `source`,
`instructions`, `goal` and `description` unchanged.

## Errors

Parsing returns either a document or one error whose code is a stable string:

- `FORMAT_TOO_LARGE` — the text is larger than `maxBytes`.
- `FORMAT_TOO_DEEP` — a container is nested deeper than `maxDepth`.
- `FORMAT_ALIAS_LIMIT` — YAML alias expansion exceeds `maxAliasCount`.
- `FORMAT_YAML_SYNTAX` — YAML is malformed, including multiple documents.
- `FORMAT_JSON_SYNTAX` — JSON is malformed.
- `FORMAT_DUPLICATE_KEY` — a YAML mapping repeats a key.
- `FORMAT_UNSUPPORTED_TAG` — a custom or unsupported YAML tag is present.
- `FORMAT_NOT_JSON` — a value is not plain JSON, such as `!!binary`, a
  timestamp, `NaN`, a NUL character or a lone surrogate.

Canonicalisation throws `FormatError` with `FORMAT_NOT_JSON` or
`FORMAT_TOO_DEEP`.

## Parse limits

Parsing is bounded in size, depth and alias count. The defaults are
`maxBytes` of `1048576` (1 MiB, measured in UTF-8 bytes before parsing),
`maxDepth` of `64` (the root container is depth 1) and `maxAliasCount` of
`20`. A caller may lower a limit; a value that is not a non-negative integer is
ignored and a value above the default is lowered to it.

## Content hash

`contentHash` returns `sha256` followed by a colon and the 64 lower-case hex
digits of the SHA-256 of the UTF-8 bytes of the canonical JSON. Surface form,
key order and spacing inside `${{ }}` do not change the hash; any real change
does.

## Example

```yaml
ursitoare: "0.1"
flow: invoices
version: "1.0.0"
description: "Extract the total from an invoice"
inputs:
  type: object
  properties:
    invoice_id:
      type: string
start: fetch
nodes:
  fetch:
    kind: block
    uses: invoices.get@1
    with:
      invoice_id: "${{ inputs.invoice_id }}"
    next: extract
  extract:
    kind: llm.extract
    input:
      text: "${{ nodes.fetch.output.raw_text }}"
    instructions: "Return the invoice total."
    output_schema:
      type: object
      properties:
        total:
          type: number
    next: decide
  decide:
    kind: switch
    on: "${{ nodes.extract.output.total }}"
    cases:
      zero: done
    default: done
  done:
    kind: end
    status: completed
```
