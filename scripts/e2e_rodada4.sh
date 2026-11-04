#!/bin/bash
# E2E rodada 4 — tempo real via gateway (:81), que encaminha o WebSocket para :3003.
# Fluxos de dados já validados nas rodadas anteriores; aqui o foco é o aviso ao vivo.
set -u
cd /home/z/my-project
B_M="agent-browser --session morador"
B_P="agent-browser --session portaria"
URL="http://127.0.0.1:81/"

tem_texto() { local cmd="$1" texto="$2"; $cmd eval "document.body.innerText.includes(\"$texto\")" 2>/dev/null | grep -q true; }
espera_texto() { local cmd="$1" texto="$2" t="${3:-15}" i=0
  while [ $i -lt $t ]; do tem_texto "$cmd" "$texto" && return 0; sleep 1; i=$((i+1)); done; return 1; }
espera_toast() { local cmd="$1" texto="$2" t="${3:-20}" i=0
  while [ $i -lt $t ]; do
    $cmd eval "Array.from(document.querySelectorAll('[data-sonner-toast]')).some(t=>(t.textContent||'').includes(\"$texto\"))" 2>/dev/null | grep -q true && return 0
    sleep 1; i=$((i+1)); done; return 1; }
ref_de() { local cmd="$1"; shift; $cmd snapshot -i -c 2>/dev/null | grep -m1 -- "$1" | grep -o 'e[0-9]*]' | tr -d ']' | head -1; }
btn_menu() { local cmd="$1" nome="$2"
  $cmd snapshot -i -c 2>/dev/null | grep "button \"$nome" | grep -v "na portaria" | grep -o 'e[0-9]*]' | tr -d ']' | head -1; }
passo() { echo "--- $1"; }

# ---------- serviços ----------
pkill -f "bun index.ts" 2>/dev/null; pkill -f "server.js" 2>/dev/null; sleep 1
(cd mini-services/encomenda-socket && exec bun index.ts) > /tmp/socket-r4.log 2>&1 &
(bun .next/standalone/server.js > /tmp/next-r4.log 2>&1) &
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 2 "$URL" && break; sleep 1; done
curl -s -o /dev/null --max-time 3 "$URL" || { echo "ERRO: gateway não responde"; exit 1; }
curl -s --max-time 3 "http://127.0.0.1:81/?XTransformPort=3003&transport=polling" | head -c 40 | grep -q "0\{" && echo "OK websocket acessível pelo gateway" || echo "AVISO: polling do socket não confirmado"
echo "=== SERVIÇOS NO AR (via gateway :81) ==="

# ---------- 1. morador conecta (login demo) ----------
passo "Morador: login pelo gateway"
$B_M open "$URL" >/dev/null 2>&1
espera_texto "$B_M" "Acesso rápido para demonstração" 40 && echo "OK login carregado (QR do portal deve estar abaixo)" || echo "ERRO login"
$B_M eval "!!document.querySelector('img[alt=\"QR code com o endereço do portal\"]')" 2>/dev/null | grep -q true && echo "OK QR do portal presente" || echo "AVISO QR portal"
r=$(ref_de "$B_M" "Morador — Maria")
[ -n "$r" ] && $B_M click @$r >/dev/null
espera_texto "$B_M" "Pendências e avisos" 30 && echo "OK Maria logada" || echo "ERRO login Maria"
sleep 2  # margem para o socket conectar e entrar na sala
r=$(btn_menu "$B_M" "Encomendas")
[ -n "$r" ] && $B_M click @$r >/dev/null
espera_texto "$B_M" "Aguardando retirada" 15 && echo "OK morador no módulo Encomendas" || echo "AVISO módulo"

# ---------- 2. portaria registra ----------
passo "Portaria: login e registro"
$B_P open "$URL" >/dev/null 2>&1
espera_texto "$B_P" "Acesso rápido para demonstração" 40 || echo "ERRO login portaria"
r=$(ref_de "$B_P" "Portaria — Jorge")
[ -n "$r" ] && $B_P click @$r >/dev/null
espera_texto "$B_P" "Painel da portaria" 30 && echo "OK Jorge logado" || echo "ERRO login Jorge"
r=$(btn_menu "$B_P" "Encomendas")
[ -n "$r" ] && $B_P click @$r >/dev/null
espera_texto "$B_P" "Registrar recebimento" 20 || echo "ERRO módulo"
r=$(ref_de "$B_P" '"Registrar recebimento"')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Descrição do produto" 15 || echo "ERRO dialog"
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
  [ -n "$optm" ] && $B_P click @$optm >/dev/null; sleep 1
fi
snap=$($B_P snapshot -i -c 2>/dev/null)
desc=$(echo "$snap" | grep -m1 'Descrição do produto' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P fill @$desc "Caixa QR Maria R4" >/dev/null
r=$( $B_P snapshot -i -c 2>/dev/null | grep -m1 '"Registrar e avisar morador"' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Código de retirada gerado" 15 && echo "OK registrada" || echo "ERRO registro"
CODIGO=$(node scripts/pega_codigo.js "Caixa QR Maria R4" 2>/dev/null | tail -1)
echo "código: $CODIGO"
rg "evento=encomenda sala=" /tmp/socket-r4.log | tail -2

# ---------- 3. morador: tempo real ----------
passo "Tempo real: nova encomenda"
espera_toast "$B_M" "Encomenda recebida na portaria" 20 && echo "OK toast AO VIVO recebido" || echo "FALHOU toast nova"
espera_texto "$B_M" "Caixa QR Maria R4" 15 && echo "OK lista atualizou ao vivo" || echo "FALHOU lista"
$B_M screenshot /tmp/render/r4-maria-toast.png >/dev/null

# ---------- 4. portaria: baixa por código ----------
passo "Portaria: baixa por código"
r=$(ref_de "$B_P" '"Baixa por código"')
[ -z "$r" ] && r=$(ref_de "$B_P" "Baixa por código")
$B_P click @$r >/dev/null
espera_texto "$B_P" "Código de retirada" 12 || echo "AVISO dialog baixa"
snap=$($B_P snapshot -i -c 2>/dev/null)
campo=$(echo "$snap" | grep -m1 '000000' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P fill @$campo "$CODIGO" >/dev/null
r=$(ref_de "$B_P" '"Buscar"')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Caixa QR Maria R4" 12 && echo "OK localizada" || echo "AVISO busca"
r=$(ref_de "$B_P" '"Confirmar retirada"')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Retirada confirmada" 12 && echo "OK baixa" || echo "AVISO baixa"
rg "evento=encomenda-retirada" /tmp/socket-r4.log | tail -1

# ---------- 5. morador: toast retirada ----------
passo "Tempo real: retirada"
espera_toast "$B_M" "Retirada confirmada" 20 && echo "OK toast retirada AO VIVO" || echo "FALHOU toast retirada"
$B_M screenshot /tmp/render/r4-maria-retirada.png >/dev/null

# ---------- 6. autorização: criar e dar baixa ----------
passo "Autorização: criar (morador) e baixar (portaria)"
r=$(btn_menu "$B_M" "Autorizações")
[ -n "$r" ] && $B_M click @$r >/dev/null
espera_texto "$B_M" "Nova autorização" 20 || echo "ERRO módulo aut"
r=$(ref_de "$B_M" '"Nova autorização"')
$B_M click @$r >/dev/null
espera_texto "$B_M" "Nova autorização de entrega" 12 || echo "AVISO dialog aut"
snap=$($B_M snapshot -i -c 2>/dev/null)
nome=$(echo "$snap" | grep -m1 'autorizado' | grep -o 'e[0-9]*]' | tr -d ']')
$B_M fill @$nome "Paulo R4 Autorizado" >/dev/null
r=$( $B_M snapshot -i -c 2>/dev/null | grep -m1 '"Autorizar"' | grep -o 'e[0-9]*]' | tr -d ']')
$B_M click @$r >/dev/null
espera_texto "$B_M" "Paulo R4 Autorizado" 15 && echo "OK autorização criada" || echo "ERRO criar aut"

r=$(btn_menu "$B_P" "Autorizações")
[ -n "$r" ] && $B_P click @$r >/dev/null
espera_texto "$B_P" "Autorizadas agora" 20 || echo "ERRO módulo aut portaria"
tem_texto "$B_P" "Paulo R4 Autorizado" && echo "OK portaria vê" || echo "FALHOU visibilidade"
r=$(ref_de "$B_P" '"Dar baixa"')
$B_P click @$r >/dev/null
espera_texto "$B_P" "Baixa registrada" 12 && echo "OK baixa aut" || echo "AVISO baixa aut"
rg "evento=autorizacao sala=" /tmp/socket-r4.log | tail -1

espera_toast "$B_M" "Autorização utilizada" 20 && echo "OK toast autorização AO VIVO" || echo "FALHOU toast aut"
$B_M screenshot /tmp/render/r4-maria-autorizacao.png >/dev/null

# ---------- banco ----------
passo "Estado final (banco)"
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const enc = await db.encomenda.findFirst({ where: { descricao: 'Caixa QR Maria R4' }, orderBy: { recebidaEm: 'desc' } });
  console.log('encomenda:', enc?.status, '| retiradaPor:', enc?.retiradaPor ?? '—');
  const aut = await db.autorizacaoEntrega.findFirst({ where: { nomeAutorizado: 'Paulo R4 Autorizado' }, orderBy: { criadoEm: 'desc' } });
  console.log('autorização:', aut?.status);
  await db.\$disconnect();
})();" 2>/dev/null

pkill -f "server.js" 2>/dev/null; pkill -f "bun index.ts" 2>/dev/null
echo "=== FIM RODADA 4 ==="
