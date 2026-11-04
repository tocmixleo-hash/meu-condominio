#!/bin/bash
# Fluxo do morador: login → Encomendas (QR) → Autorizações (criar)
set -u
B="agent-browser --session morador"

ref_de() {
  # extrai o primeiro ref cuja linha contém o texto ($1) — texto ASCII apenas
  $B snapshot -i -c 2>/dev/null | grep -m1 -- "$1" | grep -o 'e[0-9]*]' | tr -d ']' | head -1
}

# 1. login (pula se a sessão já está ativa)
if $B wait --text "Olá, Maria" --timeout 8000 >/dev/null 2>&1; then
  echo "OK sessão já ativa"
else
  r=$(ref_de "Maria (Apto 101)")
  if [ -z "$r" ]; then echo "ERRO: botão Maria não encontrado"; exit 1; fi
  $B click @$r >/dev/null
  if $B wait --text "Olá, Maria" --timeout 30000 >/dev/null 2>&1; then echo "OK login Maria"; else echo "ERRO login"; exit 1; fi
fi
sleep 1

# 2. Encomendas (menu lateral — botão exato, não o sino)
r=$(ref_de 'button "Encomendas"')
$B click @$r >/dev/null
if $B wait --text "Apresente o QR" --timeout 20000 >/dev/null 2>&1 || $B wait --text "QR de retirada" --timeout 20000 >/dev/null 2>&1; then
  echo "OK módulo encomendas aberto"
else echo "ERRO encomendas"; exit 1; fi
sleep 1

# 3. abrir QR da primeira encomenda própria
r=$(ref_de "QR de retirada")
if [ -z "$r" ]; then echo "ERRO: botão QR não encontrado"; exit 1; fi
$B click @$r >/dev/null
if $B wait --text "Apresente na portaria" --timeout 15000 >/dev/null 2>&1; then
  echo "OK dialog QR aberto"
else echo "ERRO dialog QR"; exit 1; fi
sleep 1
echo "CÓDIGO NO DIALOG:"
$B snapshot -c 2>/dev/null | grep -A4 '"Código de retirada"' | head -8
$B screenshot /tmp/render/qr-retirada.png >/dev/null
$B press Escape >/dev/null
sleep 1

# 4. módulo Autorizações
r=$(ref_de 'button "Autorizações"')
if [ -z "$r" ]; then echo "ERRO: menu Autorizações não encontrado"; exit 1; fi
$B click @$r >/dev/null
if $B wait --text "Nova autorização" --timeout 20000 >/dev/null 2>&1; then
  echo "OK módulo autorizações aberto"
else echo "ERRO autorizações"; exit 1; fi

# 5. criar autorização
r=$(ref_de "Nova autorização")
$B click @$r >/dev/null
if $B wait --text "Nova autorização de entrega" --timeout 15000 >/dev/null 2>&1; then
  echo "OK dialog nova autorização"
else echo "ERRO dialog autorização"; exit 1; fi

$B find label fill "Nome completo de quem está autorizado" 2>/dev/null >/dev/null || true
# usa refs para os campos (mais confiável)
snap=$($B snapshot -i -c 2>/dev/null)
nome_ref=$(echo "$snap" | grep -m1 'autorizado' | grep -o 'e[0-9]*]' | tr -d ']')
doc_ref=$(echo "$snap" | grep -m1 'CPF' | grep -o 'e[0-9]*]' | tr -d ']')
emp_ref=$(echo "$snap" | grep -m1 'iFood' | grep -o 'e[0-9]*]' | tr -d ']')
$B fill @${nome_ref:-e99} "Paula Regina Andrade" >/dev/null 2>&1
[ -n "$doc_ref" ] && $B fill @$doc_ref "522.104.330-85" >/dev/null 2>&1
[ -n "$emp_ref" ] && $B fill @$emp_ref "iFood" >/dev/null 2>&1
r=$(ref_de '"Autorizar"')
[ -z "$r" ] && r=$(ref_de 'Autorizar')
$B click @$r >/dev/null
if $B wait --text "Autorização criada" --timeout 15000 >/dev/null 2>&1; then
  echo "OK autorização criada (toast)"
else
  echo "AVISO: toast não visto — verificando lista"
fi
sleep 2
$B screenshot /tmp/render/autorizacoes-morador.png >/dev/null
$B snapshot -c 2>/dev/null | grep -E "Paula Regina|Ativa|Utilizada|vigente" | head -8
echo "FIM MORADOR"
