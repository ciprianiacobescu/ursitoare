#!/usr/bin/env bash
# Start mock-llm (:18901), mock-tools (:18902), mock-n8n (:18903) as background host Node processes.
# PID files and stdout logs go to shared/mocks/state/. Env vars pass through (DELAY_MS_*, DELEGATE_DELAY_MS, MOCK_LLM_MODE, ...).
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE="${MOCK_STATE_DIR:-$DIR/state}"
mkdir -p "$STATE"
declare -a NAMES=(mock-llm mock-tools mock-n8n)
declare -a PORTS=("${MOCK_LLM_PORT:-18901}" "${MOCK_TOOLS_PORT:-18902}" "${MOCK_N8N_PORT:-18903}")
for i in 0 1 2; do
  name="${NAMES[$i]}"; port="${PORTS[$i]}"; pidfile="$STATE/$name.pid"
  if [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; then
    echo "$name already running (pid $(cat "$pidfile"))"; continue
  fi
  nohup node "$DIR/$name.mjs" >"$STATE/$name.log" 2>&1 &
  echo $! >"$pidfile"
done
for i in 0 1 2; do
  name="${NAMES[$i]}"; port="${PORTS[$i]}"
  for _ in $(seq 1 50); do
    if curl -fsS "http://127.0.0.1:$port/health" >/dev/null 2>&1; then echo "$name up on :$port (pid $(cat "$STATE/$name.pid"))"; continue 2; fi
    sleep 0.1
  done
  echo "FAILED: $name did not come up on :$port; see $STATE/$name.log" >&2
  tail -5 "$STATE/$name.log" >&2 || true
  exit 1
done
