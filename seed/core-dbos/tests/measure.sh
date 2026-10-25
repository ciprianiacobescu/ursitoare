#!/usr/bin/env bash
# Takes the design-section-7 measurement mutex (.orchestration/measure.lock), runs measure.mjs, releases the lock.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK="$HERE/../.orchestration/measure.lock"
for i in $(seq 1 60); do
  if mkdir "$LOCK" 2>/dev/null; then break; fi
  echo "measure.lock held by $(cat "$LOCK/owner" 2>/dev/null || echo '?'); waiting 30 s ($i/60)" >&2; sleep 30
  [ "$i" = 60 ] && { echo "could not take the lock in 30 min" >&2; exit 3; }
done
echo M2 > "$LOCK/owner"
trap 'rm -r "$LOCK"' EXIT
cd "$HERE"
node tests/measure.mjs "${1:-3}"
