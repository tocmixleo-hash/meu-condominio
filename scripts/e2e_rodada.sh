#!/bin/bash
# E2E da rodada: QR na tela de login, QR de retirada, convergência visual das
# notificações e módulo de autorizações de entrega — morador × portaria.
# Sobe socket-service + Next standalone, executa os dois fluxos e encerra tudo.
set -u
cd /home/z/my-project
B_M="agent-browser --session morador"
B_P="agent-browser --session portaria"
mkdir -p /tmp/render

ref_de() { # $1=variável de sessão (B_M|B_P por valor de comando), resto: texto
  local cmd="$1"; shift
  $cmd snapshot -i -c 2>/dev/null | grep -m1 -- "$1" | grep -o 'e[0-9]*]' | tr -d ']' | head -1
}

espera() { # cmd texto timeout_s
  local cmd="$1" texto="$2" t="${3:-15}" i=0
  while [ $i -lt $t ]; do
    $cmd snapshot -c 2>/dev/null | grep -q -- "$texto" && return 0
    sleep 1; i=$((i+1))
  done
  return 1
}

# ---------- 1. serviços ----------
pkill -f "bun index.ts" 2>/dev/null; pkill -f "next-server" 2>/dev/null; pkill -f "bun run start" 2>/dev/null
sleep 1
(cd mini-services/encomenda-socket && exec bun index.ts) > encomenda-socket.log 2>&1 &
SOCKET_PID=$!
NODE_ENV=production PORT=3000 HOSTNAME=127.0.0.1 exec 3>&1
(bun .next/standalone/server.js > server-e2e.log 2>&1) &
NEXT_PID=$!
for i in $(seq 1 30); do
  curl -s -o /dev/null --max-time 2 http://127.0.0.1:3000/ && break
  sleep 1
done
curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/ || { echo "ERRO: Next não subiu"; tail -5 server-e2e.log; exit 1; }
curl -s -o /dev/null --max-time 3 http://127.0.0.1:3003/health || echo "AVISO: socket sem /health (segue com polling)"
echo "=== SERVIÇOS NO AR ==="

# ---------- 2. morador: tela de login com QR ----------
$B_M open http://127.0.0.1:3000/ >/dev/null 2>&1
if espera "$B_M" "Entrar na plataforma" 30; then echo "OK login carregado"; else echo "ERRO login não carregou"; fi
$B_M eval "!!document.querySelector('img[alt=\"QR code com o endereço do portal\"]')" 2>/dev/null | grep -q true \
  && echo "OK QR do portal presente na tela de login" || echo "ERRO: QR do portal ausente"
$B_M eval "(document.querySelector('img[alt=\"QR code com o endereço do portal\"]')?.src ?? '').slice(0,22)" 2>/dev/null | tail -1
$B_M screenshot /tmp/render/e2e-login-qr.png >/dev/null

# login Maria
r=$(ref_de "$B_M" "Morador — Maria")
[ -n "$r" ] && $B_M click @$r >/dev/null
if espera "$B_M" "Pendências e avisos" 30 || espera "$B_M" "Olá, Maria" 5; then echo "OK login Maria"; else echo "ERRO login Maria"; fi
$B_M screenshot /tmp/render/e2e-dashboard-maria.png >/dev/null

# ---------- 3. morador: QR de retirada ----------
r=$(ref_de "$B_M" 'button "Encomendas"')
[ -n "$r" ] && $B_M click @$r >/dev/null
espera "$B_M" "apresente o QR" 20 || espera "$B_M" "QR de retirada" 20
r=$(ref_de "$B_M" "QR de retirada")
if [ -n "$r" ]; then
  $B_M click @$r >/dev/null
  if espera "$B_M" "Apresente na portaria" 15; then echo "OK dialog QR de retirada aberto"; else echo "ERRO dialog QR"; fi
  $B_M eval "!!document.querySelector('img[alt^=\"QR code do código de retirada\"]')" 2>/dev/null | grep -q true \
    && echo "OK imagem do QR renderizada" || echo "ERRO: imagem do QR ausente"
  $B_M screenshot /tmp/render/e2e-qr-retirada.png >/dev/null
  $B_M press Escape >/dev/null
else
  echo "AVISO: Maria sem encomenda própria para gerar QR (portaria registrará uma a seguir)"
fi

# ---------- 4. morador: criar autorização de entrega ----------
r=$(ref_de "$B_M" 'button "Autorizações"')
[ -n "$r" ] && $B_M click @$r >/dev/null
espera "$B_M" "Nova autorização" 20 || echo "ERRO módulo autorizações (morador)"
r=$(ref_de "$B_M" "Nova autorização")
$B_M click @$r >/dev/null
espera "$B_M" "Nova autorização de entrega" 15 || echo "ERRO dialog autorização"
snap=$($B_M snapshot -i -c 2>/dev/null)
nome_ref=$(echo "$snap" | grep -m1 'autorizado' | grep -o 'e[0-9]*]' | tr -d ']')
doc_ref=$(echo "$snap" | grep -m1 'CPF/RG' | grep -o 'e[0-9]*]' | tr -d ']')
emp_ref=$(echo "$snap" | grep -m1 'iFood, Mercado Livre' | grep -o 'e[0-9]*]' | tr -d ']')
obs_ref=$(echo "$snap" | grep -m1 'entregar na recepção' | grep -o 'e[0-9]*]' | tr -d ']')
$B_M fill @$nome_ref "Rogério Teste E2E" >/dev/null
[ -n "$doc_ref" ] && $B_M fill @$doc_ref "123.456.789-00" >/dev/null
[ -n "$emp_ref" ] && $B_M fill @$emp_ref "iFood" >/dev/null
[ -n "$obs_ref" ] && $B_M fill @$obs_ref "Entregar na portaria do bloco A" >/dev/null
r=$(ref_de "$B_M" '"Autorizar"')
$B_M click @$r >/dev/null
if espera "$B_M" "Rogério Teste E2E" 15; then echo "OK autorização criada e listada"; else echo "ERRO autorização não listada"; fi
$B_M screenshot /tmp/render/e2e-autorizacao-maria.png >/dev/null

# ---------- 5. portaria: login e painel ----------
$B_P open http://127.0.0.1:3000/ >/dev/null 2>&1
espera "$B_P" "Entrar na plataforma" 30 || echo "ERRO login portaria"
r=$(ref_de "$B_P" "Portaria — Jorge")
[ -n "$r" ] && $B_P click @$r >/dev/null
if espera "$B_P" "Painel da portaria" 30; then echo "OK login Jorge"; else echo "ERRO login Jorge"; fi
snap=$($B_P snapshot -c 2>/dev/null)
echo "$snap" | grep -q "Autorizações ativas" && echo "OK dashboard portaria: indicador autorizações" || echo "FALTA indicador autorizações"
echo "$snap" | grep -q '"Financeiro"\|link "Financeiro"\|button "Financeiro"' && echo "FALHA: portaria vê Financeiro no menu" || echo "OK portaria sem Financeiro no menu"
$B_P screenshot /tmp/render/e2e-dashboard-portaria.png >/dev/null

# ---------- 6. portaria: registrar recebimento ----------
r=$(ref_de "$B_P" 'button "Encomendas"')
[ -n "$r" ] && $B_P click @$r >/dev/null
espera "$B_P" "Registrar recebimento" 20 || echo "ERRO módulo encomendas (portaria)"
r=$(ref_de "$B_P" "Registrar recebimento")
$B_P click @$r >/dev/null
espera "$B_P" "Registrar recebimento" 10
snap=$($B_P snapshot -i -c 2>/dev/null)
bloco_ref=$(echo "$snap" | grep -m1 '"Bloco"' | grep -o 'e[0-9]*]' | tr -d ']')
mor_ref=$(echo "$snap" | grep -m1 'Nome do morador' | grep -o 'e[0-9]*]' | tr -d ']')
desc_ref=$(echo "$snap" | grep -m1 'Descrição do produto' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P click @$bloco_ref >/dev/null; sleep 1
snap=$($B_P snapshot -i -c 2>/dev/null)
opt_ref=$(echo "$snap" | grep -m1 'Bloco A' | grep -o 'e[0-9]*]' | tr -d ']')
[ -n "$opt_ref" ] && $B_P click @$opt_ref >/dev/null
$B_P click @$mor_ref >/dev/null; sleep 1
snap=$($B_P snapshot -i -c 2>/dev/null)
opt_ref=$(echo "$snap" | grep -m1 'Maria' | grep -o 'e[0-9]*]' | tr -d ']')
[ -n "$opt_ref" ] && $B_P click @$opt_ref >/dev/null
$B_P fill @$desc_ref "Caixa teste E2E" >/dev/null
r=$(ref_de "$B_P" '"Registrar e avisar morador"')
$B_P click @$r >/dev/null
espera "$B_P" "Código de retirada gerado" 15 && echo "OK encomenda registrada pela portaria" || echo "AVISO toast de registro não visto"

# ---------- 7. morador: aviso em tempo real ----------
if espera "$B_M" "Encomenda recebida na portaria" 12; then
  echo "OK morador recebeu aviso em tempo real (WebSocket)"
else
  echo "AVISO: tempo real não visto (fallback de polling ativo)"
fi
$B_M screenshot /tmp/render/e2e-toast-maria.png >/dev/null

# ---------- 8. portaria: baixa por código (QR do morador) ----------
CODIGO=$(node scripts/pega_codigo.js "Caixa teste E2E" | tail -1)
echo "código de retirada gerado: $CODIGO"
r=$(ref_de "$B_P" "Baixa por código")
$B_P click @$r >/dev/null
espera "$B_P" "Digite os 6 dígitos" 15 || echo "ERRO dialog baixa por código"
snap=$($B_P snapshot -i -c 2>/dev/null)
campo=$(echo "$snap" | grep -m1 '000000' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P fill @$campo "$CODIGO" >/dev/null
r=$(ref_de "$B_P" '"Buscar"')
$B_P click @$r >/dev/null
espera "$B_P" "Caixa teste E2E" 15 && echo "OK encomenda localizada pelo código" || echo "ERRO busca por código"
r=$(ref_de "$B_P" '"Confirmar retirada"')
$B_P click @$r >/dev/null
espera "$B_P" "Retirada confirmada" 15 && echo "OK baixa por código concluída" || echo "AVISO confirmação não vista"
$B_P screenshot /tmp/render/e2e-portaria-baixa.png >/dev/null

# ---------- 9. morador: toast de retirada ----------
espera "$B_M" "Retirada confirmada" 12 && echo "OK morador avisado da retirada" || echo "AVISO toast retirada não visto"

# ---------- 10. portaria: dar baixa na autorização ----------
r=$(ref_de "$B_P" 'button "Autorizações"')
[ -n "$r" ] && $B_P click @$r >/dev/null
espera "$B_P" "Autorizadas agora" 20 || echo "ERRO módulo autorizações (portaria)"
snap=$($B_P snapshot -c 2>/dev/null)
echo "$snap" | grep -q "Rogério Teste E2E" && echo "OK portaria vê autorização do morador" || echo "ERRO autorização não visível para portaria"
$B_P screenshot /tmp/render/e2e-autorizacao-portaria.png >/dev/null
r=$(ref_de "$B_P" '"Dar baixa"')
$B_P click @$r >/dev/null
espera "$B_P" "Baixa registrada" 15 && echo "OK baixa na autorização" || echo "AVISO baixa autorização não vista"

# ---------- 11. morador: toast de autorização utilizada ----------
espera "$B_M" "Autorização utilizada" 12 && echo "OK morador avisado da baixa na autorização" || echo "AVISO toast autorização não visto"
$B_M screenshot /tmp/render/e2e-final-maria.png >/dev/null

# ---------- 12. estado final no banco ----------
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const enc = await db.encomenda.findFirst({ where: { descricao: 'Caixa teste E2E' }, orderBy: { recebidaEm: 'desc' } });
  console.log('DB encomenda:', enc?.status, '| retiradaPor:', enc?.retiradaPor ?? '—');
  const aut = await db.autorizacaoEntrega.findFirst({ where: { nomeAutorizado: { contains: 'Rogério Teste E2E' } }, orderBy: { criadoEm: 'desc' } });
  console.log('DB autorização:', aut?.status, '| utilizadaEm:', aut?.utilizadaEm ? 'sim' : 'não');
  await db.\$disconnect();
})();
" 2>&1 | grep -v prisma

# ---------- limpeza ----------
kill $NEXT_PID $SOCKET_PID 2>/dev/null
pkill -f "next-server" 2>/dev/null
echo "=== FIM E2E ==="
