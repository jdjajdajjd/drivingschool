#!/usr/bin/env bash
set -euo pipefail
LOG="reports/admin-rebuild/live.log"
steps=("AUDIT real ops + current UI" "DESIGN new admin information architecture" "REBUILD dashboard/bookings/slots" "REBUILD students/instructors/settings" "QA click routes + mobile visual" "TYPECHECK build push")
for s in "${steps[@]}"; do
  echo "[$(date +%H:%M:%S)] $s" >> "$LOG"
  echo "$s"
  sleep 20
done
