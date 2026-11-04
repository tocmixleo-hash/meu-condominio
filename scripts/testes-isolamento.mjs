/**
 * Suíte de testes de isolamento entre condomínios (PRD §9).
 * Executa contra o servidor real (localhost:3000, banco de demonstração)
 * e verifica a regra de ouro: o isolamento é imposto no BACKEND, não apenas
 * oculto na interface.
 *
 * Uso: bun scripts/testes-isolamento.mjs [url-base]
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

async function main() {
  console.log(`Suíte de isolamento contra ${BASE}\n`);

  // 0. Lista de condomínios
  const { corpo: lista } = await chamar("", "/api/condominios");
  const california = lista?.lista?.find((c) => c.slug === "california");
  const florida = lista?.lista?.find((c) => c.slug === "florida");
  verificar("lista pública de condomínios disponível", !!california && !!florida);

  // 1. Morador do California — vínculo único, permissões do vínculo
  const cookieMaria = await entrar("maria@email.com", "123456", california.id);
  const { corpo: sessaoMaria } = await chamar(cookieMaria, "/api/auth/verificar");
  verificar("morador autentica com perfil do vínculo", sessaoMaria?.usuario?.perfil === "MORADOR");
  verificar("condomínio ativo é o do vínculo", sessaoMaria?.usuario?.condominio?.slug === "california");
  verificar("lista de condomínios acessíveis contém apenas os vínculos", sessaoMaria?.usuario?.condominios?.length === 1);

  const { res: trocaNegada } = await chamar(cookieMaria, "/api/auth/trocar-condominio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ condominioId: florida.id }),
  });
  verificar("morador não troca para condomínio sem vínculo (403)", trocaNegada.status === 403, `status=${trocaNegada.status}`);

  const { res: identNegada } = await chamar(cookieMaria, `/api/condominios/${florida.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ corFundo: "#ff0000" }),
  });
  verificar("morador não altera identidade de outro condomínio (403)", identNegada.status === 403, `status=${identNegada.status}`);

  const { res: identPropriaNegada } = await chamar(cookieMaria, `/api/condominios/${california.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ corFundo: "#ff0000" }),
  });
  verificar("morador não altera identidade nem do próprio condomínio (403)", identPropriaNegada.status === 403, `status=${identPropriaNegada.status}`);

  const { res: criaCondoNegada } = await chamar(cookieMaria, "/api/condominios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Tentativa indevida" }),
  });
  verificar("morador não cadastra condomínio na plataforma (403)", criaCondoNegada.status === 403, `status=${criaCondoNegada.status}`);

  // 2. Síndico do California — gestão apenas no próprio ambiente
  const cookieSindicoCa = await entrar("sindico@parquecalifornia.com.br", "admin123");
  const { res: okPublica, corpo: publicado } = await chamar(cookieSindicoCa, "/api/comunicados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo: "Teste de isolamento entre condomínios", conteudo: "Verificação automatizada do PRD §9." }),
  });
  verificar("gestão publica comunicado no próprio ambiente (200)", okPublica.status === 200, `status=${okPublica.status}`);

  const { res: leFloridana } = await chamar(cookieSindicoCa, `/api/condominios/${florida.id}`);
  verificar("gestão do California não lê identidade do Florida (403)", leFloridana.status === 403, `status=${leFloridana.status}`);

  const { res: editaFloridaNegada } = await chamar(cookieSindicoCa, `/api/condominios/${florida.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nomeCurto: "Invasão" }),
  });
  verificar("gestão do California não edita identidade do Florida (403)", editaFloridaNegada.status === 403, `status=${editaFloridaNegada.status}`);

  const { corpo: sessaoSindicoCa } = await chamar(cookieSindicoCa, "/api/auth/verificar");
  const moradorIdFlorida = "helena@email.com"; // usado via PATCH direto abaixo

  // 3. Síndico do Florida — o comunicado do California não vaza
  const cookieSindicoFl = await entrar("sindico@parqueflorida.com.br", "admin123");
  const { corpo: comunicadosFl } = await chamar(cookieSindicoFl, "/api/comunicados");
  const vazou = comunicadosFl?.lista?.some((c) => c.titulo === "Teste de isolamento entre condomínios");
  verificar("comunicado do California NÃO aparece no Florida", vazou === false);
  const { corpo: comunicadosCa } = await chamar(cookieSindicoCa, "/api/comunicados");
  const visivelLa = comunicadosCa?.lista?.some((c) => c.titulo === "Teste de isolamento entre condomínios");
  verificar("comunicado aparece apenas no condomínio de origem", visivelLa === true);

  // 4. Acesso por identificador manual de outro condomínio deve falhar
  const helena = await (async () => {
    // descobre o id da moradora do Florida pelo próprio usuário legítimo (gestão)
    const { corpo: moradores } = await chamar(cookieSindicoFl, "/api/moradores");
    return moradores?.lista?.[0]?.id ?? null;
  })();
  if (helena) {
    const { res: alteracaoCruzada } = await chamar(cookieSindicoCa, "/api/moradores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: helena, ativo: false }),
    });
    verificar("gestão do California não altera morador do Florida (404/403)", [403, 404].includes(alteracaoCruzada.status), `status=${alteracaoCruzada.status}`);
  }

  // 5. Administrador da plataforma — vê tudo, troca auditada
  const cookieAdmin = await entrar("admin@meucondominio.com", "admin123");
  const { corpo: sessaoAdmin } = await chamar(cookieAdmin, "/api/auth/verificar");
  verificar("admin da plataforma autentica com perfil PLATAFORMA", sessaoAdmin?.usuario?.perfil === "PLATAFORMA");
  verificar("admin vê todos os condomínios", sessaoAdmin?.usuario?.condominios?.length === 2);

  const { res: trocaOk, corpo: sessaoTroca } = await chamar(cookieAdmin, "/api/auth/trocar-condominio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ condominioId: florida.id }),
  });
  verificar("admin troca de condomínio (200)", trocaOk.status === 200, `status=${trocaOk.status}`);
  verificar("sessão após troca aponta para o Florida", sessaoTroca?.usuario?.condominio?.slug === "florida");
  const cookieAdminFlorida = cookieDaResposta(trocaOk) || cookieAdmin;

  const { res: editaOk } = await chamar(cookieAdmin, `/api/condominios/${florida.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nomeCurto: "Florida" }),
  });
  verificar("admin edita identidade de qualquer condomínio (200)", editaOk.status === 200, `status=${editaOk.status}`);

  // troca registrada em auditoria (lida com a sessão JÁ trocada)
  const { corpo: auditoria } = await chamar(cookieAdminFlorida, "/api/auditoria");
  const trocaAuditada = auditoria?.lista?.some(
    (a) => a.acao === "TROCA_CONDOMINIO" && a.condominioId === florida.id,
  );
  verificar("troca de condomínio registrada na auditoria", trocaAuditada === true);

  // limpeza do comunicado de teste
  await chamar(cookieSindicoCa, "/api/comunicados", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: publicado?.comunicado?.id }),
  });

  console.log(`\nResultado: ${aprovados} aprovados, ${falhados} falhados`);
  process.exit(falhados === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erro fatal na suíte:", e.message);
  process.exit(1);
});
