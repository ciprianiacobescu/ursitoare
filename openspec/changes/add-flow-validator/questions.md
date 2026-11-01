# Questions — add-flow-validator

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | answered | 4.1 | technical | Allow Write/Edit for task 4.1 |
| Q-002 | accepted | 5.2 | technical | src/cli/flow/validate.test.ts:162 writes a raw control byte instead of the JSON escape sequence |
<!-- l4:index:end -->

---

## Q-001: Allow Write/Edit for task 4.1

- **Status:** answered
- **Escalated by:** the delegate (claude-fable-5-1 via claude-code): The question asks the harness to grant Write/Edit permission so task 4.1 can implement src/authoring/validate/diagnostics.ts (still the scaffold stub throwing "not implemented") and create docs/authoring/diagnostics.md (absent). Nothing in the repository, the specification or the design settles a to
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-01T12:10Z by claude-sonnet, run r-20261101T0952Z-d8c1, task 4.1

### Context
Write and Bash were denied (don't ask mode), so diagnostics.ts and docs/authoring/diagnostics.md cannot be created. Please grant file-write permission, or run the step in a mode that allows Write.

Harness note: this task's red tests and test-support files are frozen, and green may change one only when the answer names its path. This question names no frozen test or support file, so an answer to it cannot unfreeze anything. An ignore file is never unfrozen by an answer, whatever it says.

### Answer
<!-- write below this line -->
No permission change is needed: Edit and Write are already allowed for every path inside the repository working tree. The implementer's rules are Read, Glob, Grep, Edit(./**) (which covers Write) and the result directory, plus Bash only for commands starting with the gate command `pnpm run test`. A Write to a path outside the repository, such as a scratch script under /tmp, and any other shell command are refused. That is what happened here. Earlier steps of this unit show the rule working: task 2.1 green created 48 new files, 45 of them in the new directory test/support/flow-cases/invalid/, and only Bash was denied.

For task 4.1:
1. Use Edit to replace the stub in src/authoring/validate/diagnostics.ts (design D8 and the "Interfaces given" paragraph of proposal.md).
2. Use Write with the repository-relative path docs/authoring/diagnostics.md to create the document. The directory docs/authoring/ already exists.
3. Write no helper script, and run no command other than `pnpm run test`.

No command can run renderDiagnosticsDoc() for you, so write the document text yourself:
- Keep renderDiagnosticsDoc() a plain join of fixed lines over DIAGNOSTICS, in the D8 layout:
  - a title;
  - the generated-by line, naming a command a person can run to regenerate the file (it is text; nothing runs it);
  - the intro;
  - then, for each entry, `### <CODE>`, the line `<layer> error|warning` (decide and keep one form for INTERNAL_ERROR, whose layer is null), the summary, and `Fix: <fix>`;
  - one final newline.
- Then write docs/authoring/diagnostics.md by applying exactly that layout to the same 53 entries.
- Run `pnpm run test`: the C-73b013e5 test "the committed document equals renderDiagnosticsDoc and ends with one newline" prints the first difference if the two texts differ. Fix the file until it passes.

---

## Q-002: src/cli/flow/validate.test.ts:162 writes a raw control byte instead of the JSON escape sequence

- **Status:** accepted
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 5.2
- **Kind:** technical
- **Asked:** 2026-11-01T12:49Z by deepseek-free, run r-20261101T1219Z-efa1, task 5.2

### Context
The test calls writeFile(badCatalogue, '{"blocks":{"a\u001b@1":{"effect":"x"}}}'), so JavaScript turns \u001b into a raw U+001B byte inside a JSON string. JSON.parse rejects raw control characters, so catalogueFromJson throws CatalogueFileError("invalid JSON"), while the test expects the diagnostic pointer /blocks/a?@1/effect. The spec scenario says the file holds the escape sequence \u001b, which JSON parses to the control character in the key before the validator builds its pointer; no strict JSON reader can reach that pointer from a raw control byte. This is the only failing assertion; the implementation already produces the expected pointer when the file contains the two-character escape sequence.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/cli/flow/validate.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-flow-validator`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `src/cli/flow/validate.test.ts`: change line 162's string literal from `'{"blocks":{"a\u001b@1":{"effect":"x"}}}'` to `'{"blocks":{"a\\u001b@1":{"effect":"x"}}}'` so the file holds the JSON escape sequence `\u001b` and parses to the key containing the control character.
2. Keep the test as written and let the CLI escape raw control characters inside catalogue string literals before calling catalogueFromJson, accepting catalogue files that strict JSON would reject.

### Clarifier suggestion
Edit `src/cli/flow/validate.test.ts`: change line 162's string literal from `'{"blocks":{"a\u001b@1":{"effect":"x"}}}'` to `'{"blocks":{"a\\u001b@1":{"effect":"x"}}}'` so the file holds the JSON escape sequence `\u001b` and parses to the key containing the control character.

### Answer
<!-- write below this line -->
