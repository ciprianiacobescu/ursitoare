#!/bin/sh
# 4 parallel loops; each does N password grants and N client-credentials grants. Prints failures count.
N=${1:-100}; T=http://localhost:18580/realms/ursitoare/protocol/openid-connect/token
one() { f=0; for i in $(seq 1 $N); do
  c=$(curl -s -o /dev/null -w '%{http_code}' -d grant_type=password -d client_id=ursitoare-engine -d client_secret=spike-only-secret -d username=hobbyist -d password=spike-only-user -d scope=openid $T); [ "$c" = 200 ] || f=$((f+1))
  c=$(curl -s -o /dev/null -w '%{http_code}' -d grant_type=client_credentials -d client_id=ursitoare-engine -d client_secret=spike-only-secret $T); [ "$c" = 200 ] || f=$((f+1))
done; echo "fail=$f"; }
s=$(date +%s); one & one & one & one & wait; echo "elapsed=$(( $(date +%s) - s ))s requests=$((N*8))"
