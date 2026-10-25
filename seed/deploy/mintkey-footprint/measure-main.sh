#!/bin/sh
# Take N samples (default 3) 60s apart of docker stats for ALL running containers (no truncation),
# store raw TSV per sample. Filtering to mintkey-* (not mintkey-test-*) happens at analysis time.
N=${1:-3}; GAP=${2:-60}; OUT=${3:-evidence}
i=1
while [ $i -le $N ]; do
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  docker stats --no-stream --no-trunc --format '{{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}\t{{.PIDs}}' > "$OUT/stats-main-sample$i.tsv"
  echo "$ts" > "$OUT/stats-main-sample$i.ts"
  [ $i -lt $N ] && sleep $GAP
  i=$((i+1))
done
