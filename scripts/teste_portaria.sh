#!/bin/bash
# Fluxo da portaria: dashboard → Encomendas (baixa por código) → Autorizações (dar baixa)
set -u
B="agent-browser --session portaria"

ref_de() {
  $B snapshot -i -c 2>/dev/null | grep -m1 -- "$1" | grep -o 'e[0-9]*]' | tr -d ']' | head -1
}

# 1. login como Jorge (pula se sessão ativa)
if $B wait --text "Painel da portaria" --timeout 8000 >/dev/null 2>&1; then
  echo "OK sessão portaria já ativa"
else
  r=$(ref_de "Portaria — Jorge")
  if [ -z "$r" ]; then echo "ERRO: botão Jorge não encontrado"; exit 1; fi
  $B click @$r >/dev/null
  if $B wait --text "Painel da portaria" --timeout 30000 >/dev/null 2>&1; then echo "OK login Jorge"; else echo "ERRO login portaria"; exit 1; fi
fi
sleep 1

# 2. dashboard: indicadores + ações rápidas
snap=$($B snapshot -c 2>/dev/null)
echo "$snap" | grep -q "Autorizações ativas" && echo "OK indicador autorizações no dashboard" || echo "FALTA indicador"
echo "$snap" | grep -q "Consultar autorizações" && echo "OK ação rápida autorizações" || echo "FALTA ação rápida"
echo "$snap" | grep -q "Financeiro" && echo "AVISO: portaria vê Financeiro (menu)" || echo "OK portaria sem Financeiro no menu"
$B screenshot /tmp/render/dashboard-portaria.png >/dev/null

# 3. Encomendas → baixa por código
r=$(ref_de 'button "Encomendas"')
$B click @$r >/dev/null
$B wait --text "Baixa por código" --timeout 20000 >/dev/null 2>&1 && echo "OK botão baixa por código" || echo "ERRO baixa por código"
r=$(ref_de "Baixa por código")
$B click @$r >/dev/null
$B wait --text "Código de retirada" --timeout 15000 >/dev/null 2>&1 && echo "OK dialog baixa aberto" || echo "ERRO dialog baixa"

snap=$($B snapshot -i -c 2>/dev/null)
campo=$(echo "$snap" | grep -m1 '000000' | grep -o 'e[0-9]*]' | tr -d ']')
$B fill @$campo "907275" >/dev/null
r=$(ref_de '"Buscar"')
$B click @$r >/dev/null
$B wait --text "Caixa média — Amazon" --timeout 15000 >/dev/null 2>&1 && echo "OK encomenda encontrada pelo código" || echo "ERRO busca código"
r=$(ref_de '"Confirmar retirada"')
$B click @$r >/dev/null
$B wait --text "Retirada confirmada" --timeout 15000 >/dev/null 2>&1 && echo "OK retirada por código confirmada" || echo "AVISO: confirmação não vista"
sleep 1
$B screenshot /tmp/render/portaria-baixa-codigo.png >/dev/null

# 4. código inválido deve mostrar erro
$B wait --text "Baixa por código" --timeout 10000 >/dev/null 2>&1 || true
r=$(ref_de "Baixa por código")
if [ -n "$r" ]; then
  $B click @$r >/dev/null
  sleep 1
  campo=$( $B snapshot -i -c 2>/dev/null | grep -m1 '000000' | grep -o 'e[0-9]*]' | tr -d ']' )
  $B fill @$campo "000000" >/dev/null
  r=$(ref_de '"Buscar"'); $B click @$r >/dev/null
  $B wait --text "Nenhuma encomenda aguardando com esse código" --timeout 10000 >/dev/null 2>&1 && echo "OK código inválido rejeitado" || echo "AVISO: erro de código inválido não visto"
  $B press Escape >/dev/null
fi

# 5. Autorizações — ver ativa e dar baixa
r=$(ref_de 'button "Autorizações"')
$B click @$r >/dev/null
$B wait --text "Autorizadas agora" --timeout 20000 >/dev/null 2>&1 && echo "OK módulo autorizações (equipe)" || echo "ERRO módulo autorizações"
sleep 1
$B screenshot /tmp/render/autorizacoes-portaria.png >/dev/null
r=$(ref_de '"Dar baixa"')
if [ -n "$r" ]; then
  $B click @$r >/dev/null
  $B wait --text "Baixa registrada" --timeout 15000 >/dev/null 2>&1 && echo "OK baixa na autorização" || echo "AVISO: baixa autorização não vista"
  sleep 1
else
  echo "ERRO: botão Dar baixa não encontrado"
fi
$B screenshot /tmp/render/autorizacoes-portaria-depois.png >/dev/null
echo "FIM PORTARIA"
