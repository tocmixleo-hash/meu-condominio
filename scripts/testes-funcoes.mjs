/**
 * Suíte de testes das funções personalizadas (cargo sob medida).
 * Executa contra o servidor real (localhost:3000, banco de demonstração).
 *
 * Uso: bun scripts/testes-funcoes.mjs [url-base]
 */
const BASE = process.argv[2] ?? "http://localhost:3000";
let aprovados = 0;
let falhados = 0;

function verificar(nome, condicao, detalhe = "") {
  if (condicao) {
    aprovados++;
    console.log(`  ✓ ${nome}`);
  } else {
    falhados++;
    console.error(`  ✗ ${nome} ${detalhe}`);
  }
}

function cookieDaResposta(res) {
  // Escolhe sempre o cookie de SESSÃO entre os Set-Cookie da resposta
  // (a resposta pode carregar também o cookie de simulação).
  const lista = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  const sessao = lista.find((c) => c.startsWith("mc_sessao="));
  return (sessao ?? lista[0] ?? "").split(";")[0] || "";
}

async function chamar(cookie, caminho, opcoes = {}) {
  const res = await fetch(`${BASE}${caminho}`, {
    ...opcoes,
    headers: { ...(opcoes.headers ?? {}), Cookie: cookie },
  });
  let corpo = null;
  try {
    corpo = await res.json();
  } catch {
    corpo = null;
  }
  return { res, corpo };
}

async function entrar(email, senha, condominioId) {
  const corpo = { email, senha, ...(condominioId ? { condominioId } : {}) };
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  });
  if (!res.ok) throw new Error(`login falhou para ${email}: ${res.status}`);
  return cookieDaResposta(res);
}

const NOME_FUNCAO = `Zeladoria (teste ${Date.now().toString(36)})`;

async function main() {
  console.log(`Suíte de funções personalizadas contra ${BASE}\n`);

  const { corpo: listaCondos } = await chamar("", "/api/condominios");
  const california = listaCondos?.lista?.find((c) => c.slug === "california");
  const florida = listaCondos?.lista?.find((c) => c.slug === "florida");

  // 0. Morador NÃO cria função (criação exclusiva da plataforma)
  const cookieMorador = await entrar("maria@email.com", "123456", california.id);
  const { res: criaNegada } = await chamar(cookieMorador, "/api/funcoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Invasão", permissoes: ["moradores"] }),
  });
  verificar("morador não cria função (403)", criaNegada.status === 403, `status=${criaNegada.status}`);
  const { res: listaNegada } = await chamar(cookieMorador, "/api/funcoes");
  verificar("morador não lista funções (403)", listaNegada.status === 403, `status=${listaNegada.status}`);

  // 1. Plataforma cria função "Zeladoria" com encomendas + comunicados
  const cookieAdmin = await entrar("admin@meucondominio.com", "admin123");
  const { res: criada, corpo: funcaoCriada } = await chamar(cookieAdmin, "/api/funcoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: NOME_FUNCAO, descricao: "Teste automatizado", permissoes: ["encomendas", "comunicados"] }),
  });
  verificar("plataforma cria função (200)", criada.status === 200, `status=${criada.status}`);
  const funcaoId = funcaoCriada?.funcao?.id;

  // duplicata rejeitada
  const { res: duplicada } = await chamar(cookieAdmin, "/api/funcoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: NOME_FUNCAO, permissoes: [] }),
  });
  verificar("função duplicada no mesmo condomínio é rejeitada (409)", duplicada.status === 409, `status=${duplicada.status}`);

  // módulos exclusivos da plataforma são filtrados
  const { corpo: comInvasao } = await chamar(cookieAdmin, "/api/funcoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Teste filtro (teste)", permissoes: ["comunicados", "condominios", "funcoes"] }),
  });
  const perms = JSON.parse(comInvasao?.funcao?.permissoes ?? "[]");
  verificar("módulos exclusivos (condominios/funcoes) não são concedíveis", perms.includes("condominios") === false && perms.includes("funcoes") === false);
  // limpeza imediata
  if (comInvasao?.funcao?.id) {
    await chamar(cookieAdmin, "/api/funcoes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: comInvasao.funcao.id }),
    });
  }

  // 2. Cadastra membro de equipe com a função
  const sufixo = Date.now();
  const { res: membroCriado, corpo: membroCorpo } = await chamar(cookieAdmin, "/api/moradores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome: "Equipe Teste",
      email: `equipe.teste.${sufixo}@email.com`,
      senha: "teste1234",
      funcaoId,
    }),
  });
  verificar("cadastra membro de equipe com função (200)", membroCriado.status === 200, `status=${membroCriado.status}`);

  // 3. Equipe autentica: perfil FUNCAO, menu = permissões da função
  const cookieEquipe = await entrar(`equipe.teste.${sufixo}@email.com`, "teste1234", california.id);
  const { corpo: sessaoEquipe } = await chamar(cookieEquipe, "/api/auth/verificar");
  verificar("equipe autentica com perfil FUNCAO", sessaoEquipe?.usuario?.perfil === "FUNCAO");
  verificar("sessão traz nome da função", sessaoEquipe?.usuario?.funcaoNome === NOME_FUNCAO);
  verificar("permissões contêm encomendas e comunicados", sessaoEquipe?.usuario?.permissoes?.includes("encomendas") && sessaoEquipe?.usuario?.permissoes?.includes("comunicados"));
  verificar("permissões NÃO contêm módulos não concedidos", !sessaoEquipe?.usuario?.permissoes?.includes("moradores") && !sessaoEquipe?.usuario?.permissoes?.includes("auditoria"));

  // 4. Equipe usa módulo concedido e é bloqueada no não concedido (BACKEND)
  const { res: comunicadosOk } = await chamar(cookieEquipe, "/api/comunicados");
  verificar("equipe LÊ comunicados (módulo concedido, 200)", comunicadosOk.status === 200, `status=${comunicadosOk.status}`);
  const { res: auditoriaNegada } = await chamar(cookieEquipe, "/api/auditoria");
  verificar("equipe NÃO lê auditoria (403)", auditoriaNegada.status === 403, `status=${auditoriaNegada.status}`);
  const { res: moradoresNegada } = await chamar(cookieEquipe, "/api/moradores");
  verificar("equipe NÃO lista moradores (403)", moradoresNegada.status === 403, `status=${moradoresNegada.status}`);
  const { res: funcoesNegada } = await chamar(cookieEquipe, "/api/funcoes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Elevação indevida" }),
  });
  verificar("equipe não cria funções (403)", funcoesNegada.status === 403, `status=${funcoesNegada.status}`);
  const { res: trocaNegada } = await chamar(cookieEquipe, "/api/auth/trocar-condominio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ condominioId: florida.id }),
  });
  verificar("equipe não troca para condomínio sem vínculo (403)", trocaNegada.status === 403, `status=${trocaNegada.status}`);

  // 5. Isolamento entre condomínios: função existe só no California
  const { res: trocaOk2, } = await chamar(cookieAdmin, "/api/auth/trocar-condominio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ condominioId: florida.id }),
  });
  const cookieAdminFl = cookieDaResposta(trocaOk2) || cookieAdmin;
  const { corpo: listaFl } = await chamar(cookieAdminFl, "/api/funcoes");
  const existeNaFlorida = listaFl?.lista?.some((f) => f.nome === NOME_FUNCAO);
  verificar("função do California NÃO aparece na Florida", existeNaFlorida === false);

  // 6. Excluir função sem vínculos ativos funciona
  const { res: excluida } = await chamar(cookieAdmin, "/api/funcoes", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: funcaoId }),
  });
  verificar("exclui função em uso → desativa (200)", excluida.status === 200, `status=${excluida.status}`);

  console.log(`\nResultado: ${aprovados} aprovados, ${falhados} falhados`);
  process.exit(falhados === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro fatal na suíte:", e.message);
  process.exit(1);
});
