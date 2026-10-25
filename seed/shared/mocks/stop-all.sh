#!/usr/bin/env bash
# Stop the three mocks via their PID files (SIGTERM, then SIGKILL after 2 s).
set -uo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE="${MOCK_STATE_DIR:-$DIR/state}"
for name in mock-llm mock-tools mock-n8n; do
  pidfile="$STATE/$name.pid"
  [[ -f "$pidfile" ]] || { echo "$name: no pid file"; continue; }
  pid="$(cat "$pidfile")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null
    for _ in $(seq 1 20); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
    if kill -0 "$pid" 2>/dev/null; then kill -9 "$pid" 2>/dev/null; echo "$name: SIGKILLed (pid $pid)"; else echo "$name: stopped (pid $pid)"; fi
  else
    echo "$name: not running (stale pid $pid)"
  fi
  rm -f "$pidfile"
done
