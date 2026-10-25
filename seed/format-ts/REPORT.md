# M4b report: TS call-list surface

The orchestrator saved this report from the implementer's final message. Full details, including the builder API reference and the sequencing rule, are in `format-ts/README.md`. The machine-readable report is in `.orchestration/runs/20261024-phase0-spikes/reports/M4b.json`.

**Status:** done. The orchestrator re-ran the checks on 2026-10-24: `npm test` gave 74/74, and the RF-1 round trip was canonical-equal.

## What it is
- `transpile(ts)`: esbuild strips the types, then the code is evaluated in a fresh QuickJS context. It runs under a time limit and a dedicated Wasm memory ceiling (48 MiB) with a 64 KiB stack. There are no host functions, and `Date`, `Math.random` and `eval` are removed. The result is a canonical format-v0 document.
- L0 error codes: `L0_SYNTAX`, `L0_EVAL_ERROR`, `L0_TIMEOUT`, `L0_BUILDER_MISUSE`, `L0_NO_FLOW`, each with the line number in the author's source.
- `print(doc)`: produces readable builder code.
- CLI: `transpile`, `print`, `roundtrip`.
- Builder: 14 node kinds, plus `f.cases`, `f.next`, `f.start`, `f.template`, `f.inputs` and `f.item`. Each node handle exposes `.out.<path>` and `.outcome`.
- Default sequencing: node-creating calls chain `next` automatically. Branching nodes (decide, switch, approval) and `end` never get an implicit `next`.

## Results
- **Round trips:** 76/76 files are canonical-equal. That covers RF-1, the support-triage example, 29 valid and 13 warning fixtures, 24 goldens and 8 seeds.
- **Validator parity:** validator results are identical between the YAML originals and their transpiled TS. RF-1 even produces the same warning.
- **L0 negative tests:** 41 pass.
- **Transpile time:** RF-1 transpiles at a p50 of about 11 ms.

## Guide asymmetry
These differences matter when interpreting the A/B results.
- Content is identical: the catalogue, the authoring rules and the worked examples. The examples are printer output.
- Only the TS guide has the sequencing rule and the sandbox note.
- Only the YAML guide has the `ursitoare: "0.1"` header line and the quoting pitfalls.
- `ts.md` is 13% longer than `yaml.md`. Printed goldens are 4% shorter in TS than in YAML.
- The builder tolerates snake_case option names and cases or next passed as options.
- Prediction, not yet measured: TS failures will move from missing-successor errors to silent mis-wiring and `x.output` typos (the handle property is `.out`). Compare valid&correct rates, not per-layer rates.
