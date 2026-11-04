/**
 * Suíte de testes da simulação de perfis (exclusiva do administrador da
 * plataforma). Executa contra o servidor real (localhost:3000, banco demo).
 *
 * Uso: bun scripts/testes-simulacao.mjs [url-base]
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

function juntarCookies(...valores) {
  return valores.filter(Boolean).join("; ");
}

function cookieDaResposta(res, nome) {
  const bruto = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  const achado = bruto.find((c) => c.startsWith(`${nome}=`));
  return achado ? achado.split(";")[0] : "";
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

async function entrar(email, senha) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (!res.ok) throw new Error(`login falhou para ${email}: ${res.status}`);
  return cookieDaResposta(res, "mc_sessao");
}

async function main() {
  console.log(`Suíte de simulação de perfis contra ${BASE}\n`);

  const { corpo: listaCondos } = await chamar("", "/api/condominios");
  const california = listaCondos?.lista?.find((c) => c.slug === "california");

  // 0. Morador NÃO acessa o simulador nem simula perfis
  const cookieMaria = await entrar("maria@email.com", "123456");
  const { res: getNegado } = await chamar(cookieMaria, "/api/auth/simular");
  verificar("Morador não lista perfis simuláveis (403)", getNegado.status === 403, `status=${getNegado.status}`);
  const { res: postNegado } = await chamar(cookieMaria, "/api/auth/simular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfil: "SINDICO" }),
  });
  verificar("Morador não inicia simulação (403)", postNegado.status === 403, `status=${postNegado.status}`);

  // 1. Administrador da plataforma (demo) entra e vê o simulador
  const cookieAdmin = await entrar("admin@meucondominio.com", "admin123");
  const { corpo: cat } = await chamar(cookieAdmin, "/api/auth/simular");
  verificar("Plataforma lista 4 perfis clássicos", cat?.perfis?.length === 4, JSON.stringify(cat?.perfis?.map((p) => p.perfil)));
  verificar("Plataforma não está simulando ainda", cat?.simulando === null || cat?.simulando === undefined);

  // 2. Simula SÍNDICO: sessão veste o perfil e ganha poderes de gestão
  const { corpo: simSindico, res: rSindico } = await chamar(cookieAdmin, "/api/auth/simular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfil: "SINDICO" }),
  });
  verificar("Simulação de Síndico aceita", rSindico.status === 200, `status=${rSindico.status}`);
  verificar("Sessão agora é SINDICO", simSindico?.usuario?.perfil === "SINDICO", `perfil=${simSindico?.usuario?.perfil}`);
  verificar("Marca de simulação presente", simSindico?.usuario?.simulando?.perfil === "SINDICO");
  verificar("Deixa de ser plataforma durante a simulação", simSindico?.usuario?.ehPlataforma === false);
  const cookieSindico = juntarCookies(cookieAdmin, cookieDaResposta(rSindico, "mc_simulacao"));

  // 3. Verificar reflete a simulação
  const { corpo: verif } = await chamar(cookieSindico, "/api/auth/verificar");
  verificar("Verificar mantém o perfil simulado", verif?.usuario?.perfil === "SINDICO", `perfil=${verif?.usuario?.perfil}`);

  // 4. Síndico PODE criar comunicado (poder de gestão); MORADOR NÃO poderia
  const { res: criou, corpo: comunicado } = await chamar(cookieSindico, "/api/comunicados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo: "Teste simulação", conteudo: "Criado durante simulação de síndico." }),
  });
  verificar("Síndico simulado cria comunicado", criou.status === 200 || criou.status === 201, `status=${criou.status} ${JSON.stringify(comunicado)}`);

  // 5. Nova simulação é bloqueada enquanto uma está em curso
  const { res: trocaNegada } = await chamar(cookieSindico, "/api/auth/simular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfil: "MORADOR" }),
  });
  verificar("Trocar de perfil sem encerrar é bloqueado (403)", trocaNegada.status === 403, `status=${trocaNegada.status}`);

  // 6. Simula MORADOR: perde poderes de gestão
  const { res: del1 } = await chamar(cookieSindico, "/api/auth/simular", { method: "DELETE" });
  verificar("Encerrar simulação devolve sessão", del1.status === 200);
  const cookieAdmin2 = juntarCookies(cookieAdmin, cookieDaResposta(del1, "mc_sessao"));
  const { corpo: adminDeVolta } = await chamar(cookieAdmin2, "/api/auth/verificar");
  verificar("Sessão real de plataforma restaurada", adminDeVolta?.usuario?.perfil === "PLATAFORMA", `perfil=${adminDeVolta?.usuario?.perfil}`);

  const { corpo: simMorador, res: rMorador } = await chamar(cookieAdmin2, "/api/auth/simular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfil: "MORADOR" }),
  });
  verificar("Simulação de Morador aceita", rMorador.status === 200, `status=${rMorador.status}`);
  const cookieMoradorSim = juntarCookies(cookieAdmin2, cookieDaResposta(rMorador, "mc_simulacao"));
  const { res: negado } = await chamar(cookieMoradorSim, "/api/moradores", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Intruso", email: "intruso@email.com", senha: "senha123" }),
  });
  verificar("Morador simulado NÃO cadastra morador (403)", negado.status === 403, `status=${negado.status}`);
  const { res: funcoesNegada } = await chamar(cookieMoradorSim, `/api/funcoes?condominioId=${california.id}`);
  verificar("Morador simulado não gerencia funções (403)", funcoesNegada.status === 403, `status=${funcoesNegada.status}`);

  // 7. Encerra e confere limpeza
  const { res: del2 } = await chamar(cookieMoradorSim, "/api/auth/simular", { method: "DELETE" });
  const cookieFinal = juntarCookies(cookieAdmin2, cookieDaResposta(del2, "mc_sessao"));
  const { corpo: final } = await chamar(cookieFinal, "/api/auth/verificar");
  verificar("Após encerrar, perfil volta a PLATAFORMA", final?.usuario?.perfil === "PLATAFORMA", `perfil=${final?.usuario?.perfil}`);
  verificar("Marca de simulação limpa", !final?.usuario?.simulando);

  // 8. Perfil inválido é recusado
  const { res: invalido } = await chamar(cookieFinal, "/api/auth/simular", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ perfil: "PLATAFORMA" }),
  });
  verificar("Simular PLATAFORMA é recusado (400)", invalido.status === 400, `status=${invalido.status}`);

  console.log(`\nResultado: ${aprovados} aprovados, ${falhados} falhados`);
  if (falhados > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
