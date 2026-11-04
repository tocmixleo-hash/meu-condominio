#!/bin/bash
# E2E rodada 2 — fluxo completo com seletores corrigidos (badge no nome acessível).
# Uma única chamada: sobe serviços, roda morador × portaria, valida toasts em
# tempo real, QR de retirada, baixa por código e autorizações. Encerra tudo.
set -u
cd /home/z/my-project
B_M="agent-browser --session morador"
B_P="agent-browser --session portaria"
mkdir -p /tmp/render

ref_de() { local cmd="$1"; shift; $cmd snapshot -i -c 2>/dev/null | grep -m1 -- "$1" | grep -o 'e[0-9]*]' | tr -d ']' | head -1; }
btn_menu() { # botão do menu lateral por nome (ignora badge e o sino)
  local cmd="$1" nome="$2"
  $cmd snapshot -i -c 2>/dev/null | grep "button \"$nome" | grep -v "na portaria" | grep -o 'e[0-9]*]' | tr -d ']' | head -1
}
espera() { local cmd="$1" texto="$2" t="${3:-15}" i=0
  while [ $i -lt $t ]; do $cmd snapshot -c 2>/dev/null | grep -q -- "$texto" && return 0; sleep 1; i=$((i+1)); done
  return 1; }
passo() { echo "--- $1"; }

# ---------- serviços ----------
pkill -f "bun index.ts" 2>/dev/null; pkill -f "server.js" 2>/dev/null; sleep 1
(cd mini-services/encomenda-socket && exec bun index.ts) > /tmp/socket-e2e.log 2>&1 &
(bun .next/standalone/server.js > /tmp/next-e2e.log 2>&1) &
for i in $(seq 1 30); do curl -s -o /dev/null --max-time 2 http://127.0.0.1:3000/ && break; sleep 1; done
curl -s -o /dev/null --max-time 3 http://127.0.0.1:3000/ || { echo "ERRO: Next não subiu"; tail -5 /tmp/next-e2e.log; exit 1; }
echo "=== SERVIÇOS NO AR ==="

# ---------- sanity via API ----------
MARIA=$(node -e "const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.usuario.findFirst({where:{email:'maria@email.com'},select:{id:true}}).then(u=>{console.log(u.id);return db.\$disconnect()})" 2>/dev/null | tail -1)
JORGE=$(node -e "const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.usuario.findFirst({where:{email:'portaria@parquecalifornia.com.br'},select:{id:true}}).then(u=>{console.log(u.id);return db.\$disconnect()})" 2>/dev/null | tail -1)
passo "API dashboard portaria (indicadores)"
curl -s --max-time 10 "http://127.0.0.1:3000/api/dashboard?userId=$JORGE" | node -e "
let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
  const j=JSON.parse(d);
  console.log('autorizacoesAtivas:', j.autorizacoesAtivas, '| encomendas.aguardando:', j.encomendas?.aguardando, '| boletosAbertos:', JSON.stringify(j.boletosAbertos).slice(0,60));
});"

# ---------- portaria: recarregar painel ----------
passo "Portaria: painel"
$B_P open http://127.0.0.1:3000/ >/dev/null 2>&1
espera "$B_P" "Painel da portaria" 40 && echo "OK painel portaria carregou" || echo "ERRO painel portaria"
$B_P screenshot /tmp/render/r2-portaria-painel.png >/dev/null
snap=$($B_P snapshot -c 2>/dev/null)
echo "$snap" | grep -qi "Financeiro" && echo "FALHA: Financeiro visível na portaria" || echo "OK portaria sem Financeiro"

# ---------- portaria: registrar encomenda para Maria ----------
passo "Portaria: registrar recebimento"
r=$(btn_menu "$B_P" "Encomendas")
[ -n "$r" ] && $B_P click @$r >/dev/null
espera "$B_P" "Registrar recebimento" 25 && echo "OK módulo encomendas" || { echo "ERRO módulo encomendas"; $B_P snapshot -c 2>/dev/null | head -30; }
r=$(ref_de "$B_P" '"Registrar recebimento"')
$B_P click @$r >/dev/null
espera "$B_P" "Descrição do produto" 15 && echo "OK dialog registro aberto" || echo "ERRO dialog registro"
snap=$($B_P snapshot -i -c 2>/dev/null)
bloco=$(echo "$snap" | grep -m1 'combobox' | grep -o 'e[0-9]*]' | tr -d ']' | head -1)
desc=$(echo "$snap" | grep -m1 'Descrição do produto' | grep -o 'e[0-9]*]' | tr -d ']')
echo "refs: bloco=$bloco desc=$desc"
# bloco (já vem pré-selecionado com o primeiro — reafirma pela lista)
if [ -n "$bloco" ]; then
  $B_P click @$bloco >/dev/null; sleep 1
  opt=$( $B_P snapshot -i -c 2>/dev/null | grep -m1 'option "Bloco' | grep -o 'e[0-9]*]' | tr -d ']')
  echo "ref opção bloco: $opt"
  [ -n "$opt" ] && $B_P click @$opt >/dev/null; sleep 1
fi
# morador — snapshot FRESCO (refs mudam após o dropdown do bloco)
mor=$( $B_P snapshot -i -c 2>/dev/null | grep 'combobox' | sed -n '2p' | grep -o 'e[0-9]*]' | tr -d ']')
echo "ref morador (fresco): $mor"
if [ -n "$mor" ]; then
  $B_P click @$mor >/dev/null; sleep 1
  optm=$( $B_P snapshot -i -c 2>/dev/null | grep -m1 'option "Maria' | grep -o 'e[0-9]*]' | tr -d ']')
  echo "ref opção morador: $optm"
  [ -n "$optm" ] && $B_P click @$optm >/dev/null; sleep 1
fi
# descrição e botão — refs frescos
snap=$($B_P snapshot -i -c 2>/dev/null)
desc=$(echo "$snap" | grep -m1 'Descrição do produto' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P fill @$desc "Caixa QR Maria E2E" >/dev/null
r=$( $B_P snapshot -i -c 2>/dev/null | grep -m1 '"Registrar e avisar morador"' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P click @$r >/dev/null
espera "$B_P" "Código de retirada gerado" 15 && echo "OK encomenda registrada" || echo "ERRO registro"
CODIGO=$(node scripts/pega_codigo.js "Caixa QR Maria E2E" 2>/dev/null | tail -1)
echo "código gerado: $CODIGO"
[ -z "$CODIGO" ] && { echo "ERRO: código não gerado — abortando"; kill %1 %2 2>/dev/null; exit 1; }

# ---------- morador: aviso em tempo real + QR de retirada ----------
passo "Morador: tempo real + QR"
$B_M open http://127.0.0.1:3000/ >/dev/null 2>&1   # recarrega a sessão salva de Maria
espera "$B_M" "Encomenda recebida na portaria" 20 && echo "OK toast em tempo real (WebSocket)" || echo "AVISO: toast tempo real não visto"
$B_M screenshot /tmp/render/r2-maria-toast.png >/dev/null
r=$(btn_menu "$B_M" "Encomendas")
[ -n "$r" ] && $B_M click @$r >/dev/null
espera "$B_M" "Caixa QR Maria E2E" 25 && echo "OK encomenda visível para Maria" || echo "ERRO: encomenda não listada"
r=$(ref_de "$B_M" "QR de retirada")
if [ -n "$r" ]; then
  $B_M click @$r >/dev/null
  espera "$B_M" "Apresente na portaria" 15 && echo "OK dialog QR aberto" || echo "ERRO dialog QR"
  $B_M eval "!!document.querySelector('img[alt^=\"QR code do código de retirada\"]')" 2>/dev/null | grep -q true && echo "OK imagem QR renderizada" || echo "ERRO: QR não renderizado"
  snap=$($B_M snapshot -c 2>/dev/null)
  codigo_dialog=$(echo "$snap" | grep -A3 '"Código de retirada"' | grep -o '[0-9]\{6\}' | head -1)
  echo "código no dialog: $codigo_dialog (esperado $CODIGO)"
  [ "$codigo_dialog" = "$CODIGO" ] && echo "OK código do dialog confere" || echo "AVISO: código divergente"
  $B_M screenshot /tmp/render/r2-maria-qr.png >/dev/null
  $B_M press Escape >/dev/null; sleep 1
else
  echo "ERRO: botão QR de retirada não encontrado"
fi

# ---------- portaria: baixa por código ----------
passo "Portaria: baixa por código"
r=$(ref_de "$B_P" '"Baixa por código"')
$B_P click @$r >/dev/null
espera "$B_P" "Digite os 6 dígitos" 15 && echo "OK dialog baixa aberto" || echo "ERRO dialog baixa"
snap=$($B_P snapshot -i -c 2>/dev/null)
campo=$(echo "$snap" | grep -m1 '000000' | grep -o 'e[0-9]*]' | tr -d ']')
$B_P fill @$campo "$CODIGO" >/dev/null
r=$(ref_de "$B_P" '"Buscar"')
$B_P click @$r >/dev/null
espera "$B_P" "Caixa QR Maria E2E" 15 && echo "OK encomenda localizada pelo código" || echo "ERRO busca código"
r=$(ref_de "$B_P" '"Confirmar retirada"')
$B_P click @$r >/dev/null
espera "$B_P" "Retirada confirmada" 15 && echo "OK baixa por código" || echo "ERRO baixa"
$B_P screenshot /tmp/render/r2-portaria-baixa.png >/dev/null

# ---------- morador: toast de retirada ----------
espera "$B_M" "Retirada confirmada" 15 && echo "OK Maria avisada da retirada" || echo "AVISO toast retirada"
$B_M screenshot /tmp/render/r2-maria-retirada-toast.png >/dev/null

# ---------- morador: nova autorização ----------
passo "Morador: criar autorização"
r=$(btn_menu "$B_M" "Autorizações")
[ -n "$r" ] && $B_M click @$r >/dev/null
espera "$B_M" "Nova autorização" 25 || echo "ERRO módulo autorizações"
r=$(ref_de "$B_M" '"Nova autorização"')
$B_M click @$r >/dev/null
espera "$B_M" "Nova autorização de entrega" 15 || echo "ERRO dialog autorização"
snap=$($B_M snapshot -i -c 2>/dev/null)
nome=$(echo "$snap" | grep -m1 'autorizado' | grep -o 'e[0-9]*]' | tr -d ']')
emp=$(echo "$snap" | grep -m1 'iFood, Mercado Livre' | grep -o 'e[0-9]*]' | tr -d ']')
$B_M fill @$nome "Paula Autorizada E2E" >/dev/null
[ -n "$emp" ] && $B_M fill @$emp "Mercado Livre" >/dev/null
r=$(ref_de "$B_M" '"Autorizar"')
$B_M click @$r >/dev/null
espera "$B_M" "Paula Autorizada E2E" 15 && echo "OK autorização criada e listada" || echo "ERRO autorização"
$B_M screenshot /tmp/render/r2-maria-autorizacao.png >/dev/null

# ---------- portaria: dar baixa na autorização ----------
passo "Portaria: baixa na autorização"
r=$(btn_menu "$B_P" "Autorizações")
[ -n "$r" ] && $B_P click @$r >/dev/null
espera "$B_P" "Autorizadas agora" 25 || echo "ERRO módulo autorizações (portaria)"
$B_P snapshot -c 2>/dev/null | grep -q "Paula Autorizada E2E" && echo "OK portaria vê autorização de Maria" || echo "ERRO autorização invisível"
r=$(ref_de "$B_P" '"Dar baixa"')
$B_P click @$r >/dev/null
espera "$B_P" "Baixa registrada" 15 && echo "OK baixa registrada" || echo "AVISO baixa não vista"
$B_P screenshot /tmp/render/r2-portaria-autorizacao.png >/dev/null

# ---------- morador: toast autorização utilizada ----------
espera "$B_M" "Autorização utilizada" 15 && echo "OK Maria avisada da baixa na autorização" || echo "AVISO toast autorização"
$B_M screenshot /tmp/render/r2-maria-autorizacao-toast.png >/dev/null

# ---------- estado final no banco ----------
passo "Estado final (banco)"
node -e "
const {PrismaClient} = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const enc = await db.encomenda.findFirst({ where: { descricao: 'Caixa QR Maria E2E' }, orderBy: { recebidaEm: 'desc' } });
  console.log('encomenda:', enc?.status, '| retiradaPor:', enc?.retiradaPor ?? '—', '| código:', enc?.codigoRetirada);
  const aut = await db.autorizacaoEntrega.findFirst({ where: { nomeAutorizado: 'Paula Autorizada E2E' }, orderBy: { criadoEm: 'desc' } });
  console.log('autorização:', aut?.status, '| utilizadaEm:', aut?.utilizadaEm ? 'sim' : 'não');
  await db.\$disconnect();
})();" 2>/dev/null

# ---------- limpeza ----------
pkill -f "server.js" 2>/dev/null; pkill -f "bun index.ts" 2>/dev/null
echo "=== FIM RODADA 2 ==="
