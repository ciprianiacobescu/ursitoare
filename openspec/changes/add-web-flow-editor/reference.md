This file holds the data that scenarios and tasks refer to: parsing rules, the starter text, tables, texts, test data and journey texts.

## Parsing rules

Strict, ignoring unknown properties. `flowId` matches `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` (at most 64), `ownerTeam` `^[a-z][a-z0-9_-]{0,63}$`, `hash` `^sha256:[0-9a-f]{64}$`, timestamps `^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$`, `number` an integer from 1, `versionCount` an integer from 0, user ids and `author` 1 to 200 characters, an issue `code` `^[A-Z][A-Z0-9_]{1,63}$`, `message` and `text` strings.  `formatAt`: the first 19 characters with `T` as a space, plus " UTC". `flowCells.latest`: "Not saved yet", or `Version <n>, <state>` plus ", validation found errors" when `validationOk` is false. `where`: "Line L, column C" for a position, "Whole text" for a parse error without one; for an issue "Node <node> · <path>", else the path, else "Whole flow". `linkText`: `Guide for <code> (opens in a new tab)`. `key`: `error:<i>`, `warning:<i>`, `text:0`. Summary: `<Valid|Not valid>. <n> error(s), <m> warning(s). Layers run: <L1, L2>.` plus ` Checked <formatAt>.` when given, with "1 error" and "1 warning" singular.

## Starter text

`starterText(flowId)` for "demo-flow" (checked against the Phase-0 validator: ok, no warning):

```yaml
ursitoare: "0.1"
flow: demo-flow
version: 1.0.0
inputs:
  type: object
  properties: {}
start: done
nodes:
  done:
    kind: end
    status: completed
```

## Tables

`flows`: caption "Flows"; columns `flow` "Flow" (row header), `ownerTeam` "Owner team", `versions` "Versions", `latest` "Latest version"; empty title "No flows yet", description "Create a flow above. You see the flows owned by your teams." `versions`: caption "Versions"; `number` "Number" (row header), `state` "State", `saved` "Saved (UTC)", `author` "Author", `actions` "Actions"; empty title "No versions yet", description "Save the flow to create version 1."

## Texts

`FLOW_NAME_MESSAGE` "Use lower-case words joined by single hyphens, starting with a letter (up to 64 characters), for example rf-1-core." `TEAM_MESSAGE` "Use a lower-case letter first, then lower-case letters, digits, hyphens or underscores (up to 64 characters)." Other messages: "Enter a flow name.", "Enter the owner team." `flowErrorMessage`: 409 `ALREADY_EXISTS` "A flow with this name already exists. Choose another name."; 422 `FLOW_TEXT_INVALID` "The text is not a flow document. See the diagnostics."; 403 and every other `ApiRequestError`: the kit's `errorPanelModel(error).message`, plus " Decision id: <id>" when it has one (a 403 gives the kit's `FORBIDDEN` text, "You are not allowed to do this. If you think you should be, give the decision id to an administrator.", then " Decision id: d-1"); the two `RangeError` texts of decision 5; anything else the kit's `FALLBACK_MESSAGE`. Text refusals: `not_object` "The text must describe one flow: a mapping with keys such as flow, start and nodes."; `name_mismatch` `The flow key must be "<flowId>", the name of this flow.`; any other reason "The text is not a flow document."; a parse reason shows `details.message`, cut to 300 characters, with code `details.code`. Status and save messages: the strings of the scenarios "Status, plan and error text" and "Save, read and list calls", with `<n>` the version number; `Version <n> saved...` follows `validationOk` null, false, true.

## Test data

`H` = "sha256:" + 64 times "a". `V` = a `VersionRow` of `rf-1-core`: number 2, hash `H`, state "validated", surface "yaml", author "u1", requestedBy null, `createdAt` and `validatedAt` "2026-10-25T09:00:00.000000Z", validationOk true. `R` = `{ ok: false, errors: [{ layer: "L2", code: "L2_UNKNOWN_BLOCK", node: "fetch", path: "/nodes/fetch/uses", message: 'block "nope.missing@1" is not in the catalogue' }], warnings: [{ layer: "L3", code: "W_LETHAL_TRIFECTA", node: null, path: "/nodes", message: "flow reads untrusted content" }, { layer: "L1", code: "W_X", node: null, path: "", message: "m" }], layers_run: ["L1", "L2", "L3"] }`. `T` = `flow: x`, `nodes:`, `  a:`, `    uses: "k.b@1"`, `    tools:`, `      - z` on six lines, each ended by a newline. `TJ` = `{"flow":"x","nodes":{"a":{"uses":"k"}}}`.

## Journey texts

`GOOD` is the starter text with `flow: demo-intake`, `inputs.properties.url` of type string (required), `start: fetch`, a node `fetch` of kind `block` using `docs.fetch@1` with `with.url: ${{ inputs.url }}` and `next: done`, and the end node `done`; `BAD` is `GOOD` with `uses: nope.missing@1`. `GOOD` validates ok with no warning against the seed catalogue, and `BAD` gives the one error `L2_UNKNOWN_BLOCK` at `/nodes/fetch/uses` (checked with the Phase-0 validator that U25 ports). Both are constants in the journey files.
