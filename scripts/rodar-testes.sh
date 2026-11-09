#!/bin/bash
# Roda a suíte de testes visuais contra uma CÓPIA descartável do banco —
# nunca contra db/custom.db (o banco de demonstração que vai para produção).
# Uso: bash scripts/rodar-testes.sh [suite...]   (padrão: scripts/testes-visual.mjs)
set -e
cd "$(dirname "$0")/.."

SUITE="${1:-scripts/testes-visual.mjs}"
BANCO_TESTES="/tmp/db-testes-$$.db"

# Porta livre
PID=$(ss -tlnp 2>/dev/null | rg ':3000' | rg -o 'pid=([0-9]+)' -r '$1' | head -1)
if [ -n "$PID" ]; then kill -9 "$PID" 2>/dev/null || true; sleep 1; fi

# Cópia descartável: os testes podem criar/destruir dados à vontade
cp db/custom.db "$BANCO_TESTES"
echo "→ Banco de testes: $BANCO_TESTES (cópia; o original fica intocado)"

cleanup() {
  P=$(ss -tlnp 2>/dev/null | rg ':3000' | rg -o 'pid=([0-9]+)' -r '$1' | head -1)
  [ -n "$P" ] && kill -9 "$P" 2>/dev/null || true
  rm -f "$BANCO_TESTES"
}
trap cleanup EXIT

DATABASE_URL="file:$BANCO_TESTES" NODE_ENV=production PORT=3000 \
  node .next/standalone/server.js > /tmp/servidor-testes.log 2>&1 &
sleep 3

node "$SUITE"
