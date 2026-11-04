#!/bin/bash
# E2E rodada 3 — valida tempo real (WebSocket), QR de retirada e autorizações
# com verificações por DOM (innerText/sonner), imunes às omissões do snapshot.
# Morador conecta ANTES do registro da portaria para receber o aviso ao vivo.
set -u
cd /home/z/my-project
B_M="agent-browser --session morador"
B_P="agent-browser --session portaria"
mkdir -p /tmp/render

ref_de() { local cmd="$1"; shift; $cmd snapshot -i -c 2>/dev/null | grep -m1 -- "$1" | grep -o 'e[0-9]*]' | tr -d ']' | head -1; }
btn_menu() { local cmd="$1" nome="$2"
  $cmd snapshot -i -c 2>/dev/null | grep "button \"$nome" | grep -v "na portaria" | grep -o 'e[0-9]*]' | tr -d ']' | head -1; }
tem_texto() { local cmd="$1" texto="$2"; $cmd eval "document.body.innerText.includes(\"$texto\")" 2>/dev/null | grep -q true; }
espera_texto() { local cmd="$1" texto="$2" t="${3:-15}" i=0
  while [ $i -lt $t ]; do tem_texto "$cmd" "$texto" && return 0; sleep 1; i=$((i+1)); done; return 1; }
espera_toast() { local cmd="$1" texto="$2" t="${3:-15}" i=0
  while [ $i -lt $t ]; do
    $cmd eval "Array.from(document.querySelectorAll('[data-sonner-toast]')).some(t=>(t.textContent||'').includes(\"$texto\"))" 2>/dev/null | grep -q true && return 0
    sleep 1; i=$((i+1)); done; return 1; }
passo() { echo "--- $1"; }

# ---------- serviços ----------
pkill -f "bun index.ts" 2>/dev/null; pkill -f "server.js" 2>/dev/null; sleep 1
(cd mini-services/encomenda-socket && exec bun index.ts) > /tmp/socket-e2e.log 2>&1 &
(bun .next/standalone/server.js > /tmp/next-e2e.log 2>&1) &
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 2 http://127.0.0.1:3000/ && break; sleep 1; done
curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/ || { echo "ERRO: Next não subiu"; exit 1; }
echo "=== SERVIÇOS NO AR ==="

# ---------- 1. morador conecta primeiro (WebSocket ao vivo) ----------
passo "Morador conecta e fica no módulo Encomendas"
$B_M open http://127.0.0.1:3000/ >/dev/null 2>&1
espera_texto "$B_M" "Encomendas" 30 || { echo "ERRO morador não carregou"; exit 1; }
r=$(btn_menu "$B_M" "Encomendas")
[ -n "$r" ] && $B_M click @$r >/dev/null
espera_texto "$B_M" "Aguardando retirada" 20 && echo "OK morador no módulo e conectado" || echo "AVISO módulo morador"

# ---------- 2. portaria registra encomenda para Maria ----------
passo "Portaria registra encomenda"
$B_P open http://127.0.0.1:3000/ >/dev/null 2>&1
espera_texto "$B_P" "Painel da portaria" 40 && echo "OK painel portaria" || echo "ERRO painel portaria"
r=$(btn_menu "$B_P" "Encomendas")
[ -n "$r" ] && $B_P click @$r >/dev/null
espera_texto "$B_P" "Registrar recebimento" 20 || echo "ERRO módulo encomendas"
r=$(ref_de "$B_P" '"Registrar recebimento"')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Descrição do produto" 15 && echo "OK dialog aberto" || echo "ERRO dialog"
snap=$($B_P snapshot -i -c 2>/dev/null)
bloco=$(echo "$snap" | grep -m1 'combobox' | grep -o 'e[0-9]*]' | tr -d ']' | head -1)
if [ -n "$bloco" ]; then
  $B_P click @$bloco >/dev/null; sleep 1
  opt=$( $B_P snapshot -i -c 2>/dev/null | grep -m1 'option "Bloco' | grep -o 'e[0-9]*]' | tr -d ']')
  [ -n "$opt" ] && $B_P click @$opt >/dev/null; sleep 1
fi
mor=$( $B_P snapshot -i -c 2>/dev/null | grep 'combobox' | sed -n '2p' | grep -o 'e[0-9]*]' | tr -d ']')
if [ -n "$mor" ]; then
  $B_P click @$mor >/dev/null; sleep 1
  optm=$( $B_P snapshot -i -c 2>/dev/null | grep -m1 'option "Maria' | grep -o 'e[0-9]*]' | tr -d ']')
  echo "ref opção morador: $optm"
  [ -n "$optm" ] && $B_P click @$optm >/dev/null; sleep 1
fi
snap=$($B_P snapshot -i -c 2>/dev/null)
desc=$(echo "$snap" | grep -m1 'Descrição do produto' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P fill @$desc "Caixa QR Maria R3" >/dev/null
r=$( $B_P snapshot -i -c 2>/dev/null | grep -m1 '"Registrar e avisar morador"' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Código de retirada gerado" 15 && echo "OK encomenda registrada" || echo "ERRO registro"
CODIGO=$(node scripts/pega_codigo.js "Caixa QR Maria R3" 2>/dev/null | tail -1)
echo "código gerado: $CODIGO"
[ -z "$CODIGO" ] && { echo "ERRO: código não gerado"; pkill -f "server.js"; pkill -f "bun index.ts"; exit 1; }

# ---------- 3. morador: aviso ao vivo (WebSocket) ----------
passo "Morador: aviso em tempo real"
espera_toast "$B_M" "Encomenda recebida na portaria" 20 && echo "OK toast em tempo real recebido" || echo "FALHOU: toast tempo real"
espera_texto "$B_M" "Caixa QR Maria R3" 20 && echo "OK lista do morador atualizou ao vivo" || echo "FALHOU: lista não atualizou"
$B_M screenshot /tmp/render/r3-maria-toast.png >/dev/null

# ---------- 4. morador: QR de retirada ----------
passo "Morador: QR de retirada"
r=$(ref_de "$B_M" "QR de retirada")
if [ -n "$r" ]; then
  $B_M click @$r >/dev/null
  espera_texto "$B_M" "Apresente na portaria" 12 && echo "OK dialog QR aberto" || echo "AVISO texto dialog"
  $B_M eval "!!document.querySelector('img[alt^=\"QR code do código de retirada\"]')" 2>/dev/null | grep -q true && echo "OK imagem QR renderizada" || echo "FALHOU: imagem QR"
  dialogo=$($B_M eval "Array.from(document.querySelectorAll('[role=dialog]')).map(d=>d.innerText).join(' ')" 2>/dev/null | tail -1)
  echo "$dialogo" | grep -q "$CODIGO" && echo "OK código no dialog confere ($CODIGO)" || echo "FALHOU: código no dialog: $dialogo"
  $B_M screenshot /tmp/render/r3-maria-qr.png >/dev/null
  $B_M press Escape >/dev/null; sleep 1
else
  echo "FALHOU: botão QR não encontrado"
fi

# ---------- 5. portaria: baixa por código ----------
passo "Portaria: baixa por código"
r=$(ref_de "$B_P" '"Baixa por código"')
[ -z "$r" ] && r=$(ref_de "$B_P" "Baixa por código")
$B_P click @$r >/dev/null
espera_texto "$B_P" "Código de retirada" 12 && echo "OK dialog baixa aberto" || echo "AVISO dialog baixa"
snap=$($B_P snapshot -i -c 2>/dev/null)
campo=$(echo "$snap" | grep -m1 '000000' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P fill @$campo "$CODIGO" >/dev/null
r=$(ref_de "$B_P" '"Buscar"')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Caixa QR Maria R3" 15 && echo "OK encomenda localizada" || echo "AVISO localização por código"
r=$(ref_de "$B_P" '"Confirmar retirada"')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Retirada confirmada" 15 && echo "OK baixa por código concluída" || echo "AVISO baixa"
$B_P screenshot /tmp/render/r3-portaria-baixa.png >/dev/null

# ---------- 6. morador: toast de retirada ----------
passo "Morador: confirmação de retirada"
espera_toast "$B_M" "Retirada confirmada" 20 && echo "OK Maria avisada da retirada ao vivo" || echo "FALHOU: toast retirada"
$B_M screenshot /tmp/render/r3-maria-retirada.png >/dev/null

# ---------- 7. morador: cria autorização ----------
passo "Morador: nova autorização"
r=$(btn_menu "$B_M" "Autorizações")
[ -n "$r" ] && $B_M click @$r >/dev/null
espera_texto "$B_M" "Nova autorização" 20 || echo "ERRO módulo autorizações"
r=$(ref_de "$B_M" '"Nova autorização"')
$B_M click @$r >/dev/null
espera_texto "$B_M" "Nova autorização de entrega" 12 || echo "AVISO dialog autorização"
snap=$($B_M snapshot -i -c 2>/dev/null)
nome=$(echo "$snap" | grep -m1 'autorizado' | grep -o 'e[0-9]*]' | tr -d ']')
$B_M fill @$nome "Paula R3 Autorizada" >/dev/null
r=$( $B_M snapshot -i -c 2>/dev/null | grep -m1 '"Autorizar"' | grep -o 'e[0-9]*]' | tr -d ']')
$B_M click @$r >/dev/null
espera_texto "$B_M" "Paula R3 Autorizada" 15 && echo "OK autorização criada" || echo "ERRO autorização"
$B_M screenshot /tmp/render/r3-maria-autorizacao.png >/dev/null

# ---------- 8. portaria: dar baixa ----------
passo "Portaria: baixa na autorização"
r=$(btn_menu "$B_P" "Autorizações")
[ -n "$r" ] && $B_P click @$r >/dev/null
espera_texto "$B_P" "Autorizadas agora" 20 || echo "ERRO módulo autorizações"
tem_texto "$B_P" "Paula R3 Autorizada" && echo "OK portaria vê a autorização" || echo "FALHOU: autorização invisível"
r=$(ref_de "$B_P" '"Dar baixa"')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Baixa registrada" 15 && echo "OK baixa registrada" || echo "AVISO baixa"
$B_P screenshot /tmp/render/r3-portaria-autorizacao.png >/dev/null

# ---------- 9. morador: toast autorização ----------
passo "Morador: aviso de autorização utilizada"
espera_toast "$B_M" "Autorização utilizada" 20 && echo "OK Maria avisada da baixa" || echo "FALHOU: toast autorização"
$B_M screenshot /tmp/render/r3-maria-autorizacao-toast.png >/dev/null

# ---------- 10. banco ----------
passo "Estado final (banco)"
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const enc = await db.encomenda.findFirst({ where: { descricao: 'Caixa QR Maria R3' }, orderBy: { recebidaEm: 'desc' } });
  console.log('encomenda:', enc?.status, '| retiradaPor:', enc?.retiradaPor ?? '—');
  const aut = await db.autorizacaoEntrega.findFirst({ where: { nomeAutorizado: 'Paula R3 Autorizada' }, orderBy: { criadoEm: 'desc' } });
  console.log('autorização:', aut?.status, '| utilizadaEm:', aut?.utilizadaEm ? 'sim' : 'não');
  await db.\$disconnect();
})();" 2>/dev/null

pkill -f "server.js" 2>/dev/null; pkill -f "bun index.ts" 2>/dev/null
echo "=== FIM RODADA 3 ==="
