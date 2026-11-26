# Test plan (data): add-stack-conformance

The four step files, byte for byte (the tests compare rules, not text: a comment may change, a value may not). They ran under the prototype `scriptProblems` of `add-stack-overlay` with its `30-proxy-smoke.sh` (`[]`); nothing ran in Docker. The run directory is `$STACK_OUT/$STACK_RUN` in the runner and `$RUN_OUT` on the host.

## scripts/stack-e2e.d/05-snapshot.sh

```bash
#!/usr/bin/env bash
# The exit 10 and restart baseline, taken after `up` and before any reset. Only the filtered snapshot is written (docs/testing.md).
set -euo pipefail

docker inspect $( $COMPOSE ps -q ) | $COMPOSE run --rm -T runner node test/support/stack/conformance.ts snapshot > "$RUN_OUT/before.json"
echo "snapshot: before.json"
```

## scripts/stack-e2e.d/40-contracts.sh

```bash
#!/usr/bin/env bash
# The contract suites against the real services: one row each, a failed row is data and not a failed step. The wrong-token flood is bracketed by its own two snapshots.
set -euo pipefail

$COMPOSE run --rm runner node test/support/stack/contracts.ts run
docker inspect $( $COMPOSE ps -q ) | $COMPOSE run --rm -T runner node test/support/stack/conformance.ts snapshot > "$RUN_OUT/flood-before.json"
$COMPOSE run --rm runner node test/support/stack/contracts.ts flood
docker inspect $( $COMPOSE ps -q ) | $COMPOSE run --rm -T runner node test/support/stack/conformance.ts snapshot > "$RUN_OUT/flood-after.json"
$COMPOSE run --rm runner node test/support/stack/contracts.ts bracket
echo "contracts: recorded"
```

## scripts/stack-e2e.d/60-conformance.sh

```bash
#!/usr/bin/env bash
# The stack-marked conformance tests (e2e/test_stack_conformance.py), against the files of steps 05 and 40.
set -euo pipefail

$COMPOSE run --rm runner uv run --project e2e --frozen pytest e2e -m stack --tb=short --junitxml="/run/stack-out/$STACK_RUN/conformance-junit.xml"
echo "conformance done"
```

## scripts/stack-e2e.d/90-checks.sh

```bash
#!/usr/bin/env bash
# Runs from the exit trap after any outcome: restarts and OOM kills over the whole run, and the summary of every row.
set -euo pipefail

docker inspect $( $COMPOSE ps -q ) | $COMPOSE run --rm -T runner node test/support/stack/conformance.ts snapshot > "$RUN_OUT/after.json" || true
$COMPOSE run --rm runner node test/support/stack/contracts.ts checks
```

## test/support/README.md (one row, after the `add-stack-seeding` row)

`` | `stack/contracts.ts`, `stack/conformance.ts`, `stack/sink-probe.ts`, `stack/credential-probe.ts` | `add-stack-conformance` | The contract runner, exit checks, redacted snapshots and probes of the closing stack run | ``
