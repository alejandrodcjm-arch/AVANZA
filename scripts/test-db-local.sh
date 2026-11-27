#!/usr/bin/env bash
# Crea una base limpia, aplica la imitación de Supabase, las migraciones y el seed, y corre las pruebas pgTAP.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=${DB:-avanza_test}
PSQL="psql -v ON_ERROR_STOP=1 -q -X -d $DB"
dropdb --if-exists "$DB" >/dev/null 2>&1 || true
createdb "$DB"
psql -q -X -d "$DB" -v ON_ERROR_STOP=1 -f scripts/local-db/supabase_shim.sql
for f in supabase/migrations/*.sql; do
  $PSQL -f "$f"
done
if [ "${SKIP_SEED:-0}" != "1" ]; then $PSQL -f supabase/seed.sql; fi
status=0
for t in supabase/tests/database/*.sql; do
  out=$(psql -X -q -d "$DB" -v ON_ERROR_STOP=1 -f "$t" 2>&1) || status=1
  fails=$(echo "$out" | grep -E "^\s*not ok" || true)
  passed=$(echo "$out" | grep -cE "^\s*ok [0-9]" || true)
  if [ -n "$fails" ] || echo "$out" | grep -qE "ERROR|Looks like"; then
    echo "FALLA $t"; echo "$out" | grep -E "not ok|ERROR|Looks like|#" | head -40; status=1
  else
    echo "OK    $t ($passed pruebas)"
  fi
done
exit $status
