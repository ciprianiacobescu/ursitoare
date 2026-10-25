#!/bin/sh
# usage: measure-spike.sh <label> [samples=3] [gap=60]
# Records docker-stats (cgroup working set as docker CLI reports) AND process RSS from `docker top` for every mkspike-* container.
L=${1:?label}; N=${2:-3}; GAP=${3:-60}; i=1
while [ $i -le $N ]; do
  echo "# $(date -u +%Y-%m-%dT%H:%M:%SZ) sample $i" >> evidence/spike-stats-$L.txt
  docker stats --no-stream --no-trunc --format '{{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}\t{{.PIDs}}' $(docker ps --filter name=^mkspike- --format '{{.Names}}') >> evidence/spike-stats-$L.txt
  for c in $(docker ps --filter name=^mkspike- --format '{{.Names}}'); do
    docker top $c -eo pid,rss,comm | awk -v c=$c -v s=$i 'NR>1{printf "%s\tsample%s\tpid=%s\trss_kib=%s\tcomm=%s\n", c, s, $1, $2, $3}' >> evidence/spike-rss-$L.txt
  done
  [ $i -lt $N ] && sleep $GAP
  i=$((i+1))
done
