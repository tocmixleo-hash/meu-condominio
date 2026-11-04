// Teste ponta a ponta das APIs: código de retirada + autorizações de entrega.
const BASE = 'http://localhost:3000'

async function login(email, senha) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha }),
  })
  if (!r.ok) throw new Error(`login ${email}: ${r.status}`)
  return r.json()
}

async function main() {
  const maria = await login('maria@email.com', '123456')
  const jorge = await login('portaria@parquecalifornia.com.br', 'portaria123')
  console.log('✓ logins ok —', maria.nome, '|', jorge.nome)

  // 1. Encomendas da Maria devem ter codigoRetirada
  let r = await fetch(`${BASE}/api/encomendas?userId=${maria.id}`)
  let encomendas = await r.json()
  const minha = encomendas.find((e) => e.status === 'RECEBIDA')
  console.log('✓ encomenda aguardando:', minha?.descricao, '— código:', minha?.codigoRetirada)

  // 2. Portaria busca por código
  r = await fetch(`${BASE}/api/encomendas?userId=${jorge.id}&codigo=${minha.codigoRetirada}`)
  const porCodigo = await r.json()
  console.log('✓ busca por código:', Array.isArray(porCodigo) && porCodigo[0]?.id === minha.id ? 'OK' : 'FALHOU')

  // 3. Código inválido → lista vazia
  r = await fetch(`${BASE}/api/encomendas?userId=${jorge.id}&codigo=999999`)
  const vazio = await r.json()
  console.log('✓ código inexistente vazio:', Array.isArray(vazio) && vazio.length === 0 ? 'OK' : 'FALHOU')

  // 4. Maria cria autorização
  r = await fetch(`${BASE}/api/autorizacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: maria.id,
      nomeAutorizado: 'Teste Automatizado',
      documento: '000.111.222-33',
      empresa: 'iFood',
      validoHoras: 4,
      observacao: 'teste e2e',
    }),
  })
  const autorizacao = await r.json()
  console.log('✓ autorização criada:', r.status === 201 ? autorizacao.nomeAutorizado : JSON.stringify(autorizacao))

  // 5. Segurança: portaria NÃO pode criar autorização
  r = await fetch(`${BASE}/api/autorizacoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: jorge.id, nomeAutorizado: 'X Y Z', validoHoras: 2 }),
  })
  console.log('✓ portaria não cria autorização (403):', r.status === 403 ? 'OK' : `FALHOU (${r.status})`)

  // 6. Jorge vê as autorizações do condomínio
  r = await fetch(`${BASE}/api/autorizacoes?userId=${jorge.id}`)
  const listaJorge = await r.json()
  const ativa = listaJorge.find((a) => a.statusEfetivo === 'ATIVA')
  console.log('✓ portaria vê', listaJorge.length, 'autorização(ões); ativa:', ativa?.nomeAutorizado)

  // 7. João NÃO vê a autorização da Maria
  const joao = await login('joao@email.com', '123456')
  r = await fetch(`${BASE}/api/autorizacoes?userId=${joao.id}`)
  const listaJoao = await r.json()
  console.log('✓ joão não vê autorização alheia:', listaJoao.every((a) => a.moradorId === joao.id) ? 'OK' : 'FALHOU')

  // 8. Jorge dá baixa na autorização
  r = await fetch(`${BASE}/api/autorizacoes/${ativa.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'UTILIZAR', userId: jorge.id }),
  })
  const baixa = await r.json()
  console.log('✓ baixa na autorização:', baixa.status === 'UTILIZADA' ? 'OK' : JSON.stringify(baixa))

  // 9. Dar baixa de novo → 409
  r = await fetch(`${BASE}/api/autorizacoes/${ativa.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'UTILIZAR', userId: jorge.id }),
  })
  console.log('✓ baixa duplicada bloqueada (409):', r.status === 409 ? 'OK' : `FALHOU (${r.status})`)

  // 10. Dashboard inclui autorizacoesAtivas
  r = await fetch(`${BASE}/api/dashboard?userId=${jorge.id}`)
  const dash = await r.json()
  console.log('✓ dashboard portaria autorizacoesAtivas:', dash.autorizacoesAtivas, typeof dash.autorizacoesAtivas === 'number' ? 'OK' : 'FALHOU')

  // 11. Retirada por código — portaria confirma via PATCH
  r = await fetch(`${BASE}/api/encomendas/${minha.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao: 'RETIRAR', userId: jorge.id, retiradaPor: 'Maria Santos Silva' }),
  })
  const retirada = await r.json()
  console.log('✓ retirada confirmada:', retirada.status === 'RETIRADA' ? 'OK' : JSON.stringify(retirada))
}

main().catch((e) => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
