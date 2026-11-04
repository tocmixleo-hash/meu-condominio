#!/bin/bash
# Verificação visual completa do portal multi-condomínio em uma sessão só.
set -u
cd /home/z/my-project/.next/standalone

PORT=3100
setsid env PORT=$PORT DATABASE_URL="file:/home/z/my-project/db/custom.db" NODE_ENV=production bun server.js > /tmp/mc-visual.log 2>&1 < /dev/null &
for i in $(seq 1 20); do
  sleep 1
  COD=$(curl -s -m 2 -o /dev/null -w "%{http_code}" http://localhost:$PORT/api/condominios || true)
  [ "$COD" = "200" ] && break
done
echo "server: $COD"

ab() { agent-browser "$@" >/dev/null 2>&1 || true; }

ab set viewport 1600 900
ab open http://localhost:$PORT
ab wait --load networkidle
ab wait --text "Parque Florida"
sleep 1
ab screenshot /tmp/render/v-login-ca.png
echo "1) login California ✓"

# Troca para Florida e captura a tela com tema cinza
REF_FL=$(agent-browser snapshot -i -c 2>/dev/null | grep -o 'button "Parque Florida[^"]*" \[ref=e[0-9]*\]' | grep -o 'e[0-9]*\]' | tr -d ']')
REF_FL="${REF_FL#e}"
ab click "e$REF_FL"
sleep 1
ab screenshot /tmp/render/v-login-fl.png
echo "2) login Florida ✓"

# Login rápido do síndico (Florida) → dashboard cinza
REF_CARLOS=$(agent-browser snapshot -i -c 2>/dev/null | grep -o 'button "Carlos[^"]*" \[ref=e[0-9]*\]' | grep -o 'e[0-9]*\]' | tr -d ']')
REF_CARLOS="${REF_CARLOS#e}"
ab click "e$REF_CARLOS"
ab wait --load networkidle
sleep 2
ab screenshot /tmp/render/v-dash-fl.png
agent-browser snapshot -i -c 2>/dev/null | grep -o "Bom dia[^,]*, [A-Za-z]*" | head -1
echo "3) dashboard Florida ✓"

# Sair, voltar ao login, selecionar California e entrar como síndico
REF_SAIR=$(agent-browser snapshot -i -c 2>/dev/null | grep -o 'button "Sair da conta" \[ref=e[0-9]*\]' | grep -o 'e[0-9]*\]' | tr -d ']')
REF_SAIR="${REF_SAIR#e}"
ab click "e$REF_SAIR"
ab wait --load networkidle
ab wait --text "Parque California"
REF_CA=$(agent-browser snapshot -i -c 2>/dev/null | grep -o 'button "Parque California[^"]*" \[ref=e[0-9]*\]' | grep -o 'e[0-9]*\]' | tr -d ']')
REF_CA="${REF_CA#e}"
ab click "e$REF_CA"
sleep 1
REF_CARLOS2=$(agent-browser snapshot -i -c 2>/dev/null | grep -o 'button "Carlos[^"]*" \[ref=e[0-9]*\]' | grep -o 'e[0-9]*\]' | tr -d ']')
REF_CARLOS2="${REF_CARLOS2#e}"
ab click "e$REF_CARLOS2"
ab wait --load networkidle
sleep 2
ab screenshot /tmp/render/v-dash-ca.png
echo "4) dashboard California ✓"

# Sino de notificações
REF_SINO=$(agent-browser snapshot -i -c 2>/dev/null | grep -o 'button "Notifica[^"]*" \[ref=e[0-9]*\]' | grep -o 'e[0-9]*\]' | tr -d ']')
REF_SINO="${REF_SINO#e}"
ab click "e$REF_SINO"
sleep 1
ab screenshot /tmp/render/v-sino.png
ab press Escape
echo "5) sino de notificações ✓"

# Página de Auditoria
REF_AUD=$(agent-browser snapshot -i -c 2>/dev/null | grep -o 'button "Auditoria" \[ref=e[0-9]*\]' | grep -o 'e[0-9]*\]' | tr -d ']')
REF_AUD="${REF_AUD#e}"
ab click "e$REF_AUD"
ab wait --load networkidle
sleep 2
ab screenshot /tmp/render/v-auditoria.png
echo "6) auditoria ✓"

pkill -f "bun server.js" || true
ls -la /tmp/render/v-*.png
