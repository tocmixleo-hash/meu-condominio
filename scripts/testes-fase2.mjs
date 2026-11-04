/**
 * Suíte de testes da FASE 2: Ocorrências & Manutenção, Regras de reserva,
 * QR Code de visitas/encomendas e redefinição de senha.
 * Executa contra o servidor real (localhost:3000, banco demo).
 *
 * Uso: bun scripts/testes-fase2.mjs [url-base]
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

function cookieDaResposta(res, nome) {
  const bruto = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  const achado = bruto.find((c) => c.startsWith(`${nome}=`));
  return achado ? achado.split(";")[0] : "";
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

const post = (cookie, caminho, dados) =>
  chamar(cookie, caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
const patch = (cookie, caminho, dados) =>
  chamar(cookie, caminho, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });

const hojeISO = () => new Date().toISOString().slice(0, 10);
const dia = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function main() {
  console.log(`Suíte da fase 2 contra ${BASE}\n`);

  const maria = await entrar("maria@email.com", "123456"); // moradora California
  const rafael = await entrar("rafael@email.com", "123456"); // morador California
  const carlos = await entrar("sindico@parquecalifornia.com.br", "admin123"); // gestão California
  const jorge = await entrar("portaria@parquecalifornia.com.br", "portaria123"); // portaria California
  const ricardo = await entrar("sindico@parqueflorida.com.br", "admin123"); // gestão Florida

  // ── 1. OCORRÊNCIAS ────────────────────────────────────────────
  console.log("Ocorrências:");
  const { res: rCriou, corpo: criada } = await post(maria, "/api/ocorrencias", {
    titulo: "Teste fase 2 — portão da garagem rangendo",
    descricao: "O portão da garagem G2 está rangendo muito ao abrir.",
    categoria: "INFRAESTRUTURA",
    prioridade: "ALTA",
    local: "Garagem G2",
  });
  verificar("Moradora cria ocorrência", rCriou.status === 200 && criada?.ocorrencia?.id, `status=${rCriou.status}`);
  const idOcorrencia = criada?.ocorrencia?.id;

  const { corpo: listaMaria } = await chamar(maria, "/api/ocorrencias");
  verificar(
    "Moradora vê apenas as próprias ocorrências",
    listaMaria?.lista?.every((o) => o.abertaPor?.nome === "Maria Silva") &&
      listaMaria.lista.length >= 2,
    `n=${listaMaria?.lista?.length}`,
  );

  const { corpo: listaJorge } = await chamar(jorge, "/api/ocorrencias");
  verificar(
    "Portaria vê todas as ocorrências do condomínio (inclusive a da Maria)",
    listaJorge?.lista?.some((o) => o.id === idOcorrencia),
  );

  const { res: rMoradorMuda } = await patch(maria, "/api/ocorrencias", { id: idOcorrencia, status: "RESOLVIDA" });
  verificar("Moradora NÃO muda status de ocorrência (403)", rMoradorMuda.status === 403, `status=${rMoradorMuda.status}`);

  const { res: rAtende, corpo: atendeCorpo } = await patch(carlos, "/api/ocorrencias", { id: idOcorrencia, status: "EM_ATENDIMENTO" });
  verificar("Síndico inicia atendimento", rAtende.status === 200 && atendeCorpo?.ocorrencia?.status === "EM_ATENDIMENTO", `status=${rAtende.status}`);

  const { res: rResolve, corpo: resolveCorpo } = await patch(carlos, "/api/ocorrencias", {
    id: idOcorrencia,
    status: "RESOLVIDA",
    resolucao: "Vidraceiro acionado; lubrificação realizada.",
  });
  const resolvida = resolveCorpo?.ocorrencia;
  verificar("Síndico resolve com registro da solução", rResolve.status === 200 && resolvida?.status === "RESOLVIDA" && resolvida?.resolucao?.includes("lubrificação"));

  const { res: rAgain } = await patch(carlos, "/api/ocorrencias", { id: idOcorrencia, status: "EM_ATENDIMENTO" });
  verificar("Ocorrência resolvida não reabre (409)", rAgain.status === 409, `status=${rAgain.status}`);

  // Isolamento: ocorrência da Califórnia invisível à equipe da Flórida
  const { corpo: listaRicardo } = await chamar(ricardo, "/api/ocorrencias");
  verificar(
    "Síndico da Flórida NÃO vê ocorrência da Califórnia",
    listaRicardo?.lista?.every((o) => o.titulo !== "Teste fase 2 — portão da garagem rangendo"),
  );

  // ── 2. MANUTENÇÃO ─────────────────────────────────────────────
  console.log("Manutenção:");
  const { res: rMan, corpo: manCriada } = await post(carlos, "/api/manutencao", {
    titulo: "Teste fase 2 — troca de filtro da bomba",
    descricao: "Filtro da bomba de reforço.",
    periodicidade: "MENSAL",
    proximaData: dia(20),
    responsavel: "Hidro Teste",
  });
  verificar("Síndico agenda manutenção", rMan.status === 200 && manCriada?.manutencao?.id, `status=${rMan.status}`);
  const idManutencao = manCriada?.manutencao?.id;

  const { corpo: listaMan } = await chamar(carlos, "/api/manutencao");
  const item = listaMan?.lista?.find((m) => m.id === idManutencao);
  verificar("Situação calculada (EM_DIA para +20 dias)", item?.situacao === "EM_DIA", `situacao=${item?.situacao}`);

  const { res: rRealizou, corpo: realizada } = await patch(carlos, "/api/manutencao", { id: idManutencao, acao: "REALIZAR" });
  const novaData = realizada?.manutencao?.proximaData;
  verificar(
    "Registrar realização empurra a próxima data em 1 mês",
    rRealizou.status === 200 && novaData && Math.abs(new Date(novaData) - new Date(dia(30))) < 3 * 86400000,
    `proximaData=${novaData}`,
  );

  const { res: rManMorador } = await chamar(maria, "/api/manutencao");
  verificar("Moradora NÃO acessa a agenda de manutenção (403)", rManMorador.status === 403, `status=${rManMorador.status}`);

  // ── 3. REGRAS DE RESERVA ──────────────────────────────────────
  console.log("Regras de reserva:");
  const { corpo: regras0 } = await chamar(carlos, "/api/reservas/regras");
  verificar("Gestão vê as regras dos 4 espaços", regras0?.lista?.length === 4);

  const { res: rRegra } = await patch(carlos, "/api/reservas/regras", {
    espaco: "QUADRA",
    antecedenciaMaxDias: 5,
    limiteMensalUnidade: 1,
    regrasTexto: "Uso com tênis apropriado; proibido vidro.",
  });
  verificar("Gestão ajusta as regras da quadra", rRegra.status === 200);

  const { res: rLonge, corpo: eLonge } = await post(rafael, "/api/reservas", {
    espaco: "QUADRA",
    data: dia(20),
    horario: "19:00 – 21:00",
  });
  verificar("Reserva além da antecedência é recusada (400)", rLonge.status === 400 && (eLonge?.erro ?? "").includes("anteced"), `status=${rLonge.status}`);

  const { res: rOk1 } = await post(rafael, "/api/reservas", {
    espaco: "QUADRA",
    data: dia(3),
    horario: "19:00 – 21:00",
  });
  verificar("Reserva dentro das regras passa", rOk1.status === 200, `status=${rOk1.status}`);

  const { res: rOk2 } = await post(rafael, "/api/reservas", {
    espaco: "QUADRA",
    data: dia(4),
    horario: "19:00 – 21:00",
  });
  verificar("2ª reserva no mesmo mês estoura o limite (409)", rOk2.status === 409, `status=${rOk2.status}`);

  const { res: rRegraMorador } = await patch(maria, "/api/reservas/regras", {
    espaco: "QUADRA",
    antecedenciaMaxDias: 1,
    limiteMensalUnidade: 5,
  });
  verificar("Moradora NÃO ajusta regras (403)", rRegraMorador.status === 403, `status=${rRegraMorador.status}`);

  // limpeza: cancela a reserva de teste e restaura as regras padrão
  const reservaTeste = (await (await chamar(rafael, "/api/reservas")).corpo)?.lista?.find(
    (r) => r.espaco === "QUADRA" && r.status === "PENDENTE" && r.solicitante?.nome === "Rafael Souza",
  );
  if (reservaTeste) await patch(rafael, "/api/reservas", { id: reservaTeste.id, status: "CANCELADA" });
  await patch(carlos, "/api/reservas/regras", { espaco: "QUADRA", antecedenciaMaxDias: 60, limiteMensalUnidade: 2, regrasTexto: "" });

  // ── 4. QR DE VISITAS E ENCOMENDAS ─────────────────────────────
  console.log("QR Code:");
  const { res: rAut, corpo: aut } = await post(maria, "/api/autorizacoes", {
    visitanteNome: "Sobrinho da Maria (teste QR)",
    tipo: "VISITANTE",
    dataInicio: hojeISO(),
    dataFim: dia(2),
  });
  const codigo = aut?.autorizacao?.codigo;
  verificar("Nova autorização nasce com código de 6 dígitos", rAut.status === 200 && /^\d{6}$/.test(codigo ?? ""), `codigo=${codigo}`);
  const idAutorizacao = aut?.autorizacao?.id;

  const { res: rValidaMorador } = await post(maria, "/api/autorizacoes/validar", { codigo });
  verificar("Moradora NÃO valida entrada (403)", rValidaMorador.status === 403, `status=${rValidaMorador.status}`);

  const { res: rValida } = await post(jorge, "/api/autorizacoes/validar", { codigo });
  verificar("Portaria registra a entrada pelo código", rValida.status === 200, `status=${rValida.status}`);

  const { res: rValida2 } = await post(jorge, "/api/autorizacoes/validar", { codigo });
  verificar("Mesmo código não registra duas vezes (409)", rValida2.status === 409);

  const { res: rValida3 } = await post(jorge, "/api/autorizacoes/validar", { codigo: "000000" });
  verificar("Código inexistente é recusado (404)", rValida3.status === 404);

  // notificação de entrada chegou à moradora
  const { corpo: notifMaria } = await chamar(maria, "/api/notificacoes");
  verificar(
    "Moradora recebeu aviso de entrada registrada",
    (notifMaria?.lista ?? []).some((n) => (n.mensagem ?? "").includes("entrou pelo código")),
  );

  // encomenda: fluxo de retirada por código já existente continua ok
  const { corpo: encJorge } = await chamar(jorge, "/api/encomendas");
  const aguardando = (encJorge?.lista ?? []).find((e) => e.status === "AGUARDANDO" && e.destinatario?.nome === "Maria Silva");
  verificar("Encomenda da Maria disponível para teste de retirada", Boolean(aguardando));
  if (aguardando) {
    const { res: rCodErrado } = await patch(jorge, "/api/encomendas", { id: aguardando.id, acao: "LIBERAR_RETIRADA", codigo: "111111" });
    verificar("Retirada com código errado é recusada (400)", rCodErrado.status === 400);
  }

  // ── 5. REDEFINIÇÃO DE SENHA ───────────────────────────────────
  console.log("Redefinição de senha:");
  const { res: rPediu, corpo: pediu } = await post(rafael, "/api/auth/recuperar", { email: "rafael@email.com" });
  verificar("Pedido de redefinição responde genérico", rPediu.status === 200 && pediu?.ok === true);

  // sem provedor de e-mail (demo), o link chega como notificação in-app
  const { corpo: notifRafael } = await chamar(rafael, "/api/notificacoes");
  const aviso = (notifRafael?.lista ?? []).find((n) => (n.mensagem ?? "").includes("/redefinir?token="));
  verificar("Link de redefinição entregue na notificação (modo demo)", Boolean(aviso));
  const token = aviso?.mensagem?.match(/token=([a-f0-9]+)/)?.[1] ?? "";

  const { res: rFraca } = await post("", "/api/auth/redefinir", { token: token || "x", senha: "123" });
  verificar("Senha curta é recusada", rFraca.status === 400);

  const { res: rTrocou } = await post("", "/api/auth/redefinir", { token, senha: "novaSenha456" });
  verificar("Redefinição com token válido troca a senha", rTrocou.status === 200, `status=${rTrocou.status}`);

  const { res: rNovoLogin, corpo: loginNovo } = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "rafael@email.com", senha: "novaSenha456" }),
  }).then(async (r) => ({ res: r, corpo: await r.json().catch(() => null) }));
  verificar("Login com a nova senha funciona", rNovoLogin.status === 200 && loginNovo?.usuario?.id, `status=${rNovoLogin.status}`);

  const { res: rTokenReuso } = await post("", "/api/auth/redefinir", { token, senha: "outraSenha789" });
  verificar("Token não pode ser reutilizado (400)", rTokenReuso.status === 400);

  // restaura a senha canônica da demonstração (123456) com um novo token
  const rafael2 = await entrar("rafael@email.com", "novaSenha456");
  await post(rafael2, "/api/auth/recuperar", { email: "rafael@email.com" });
  const { corpo: notifRafael2 } = await chamar(rafael2, "/api/notificacoes");
  const aviso2 = (notifRafael2?.lista ?? []).find((n) => (n.mensagem ?? "").includes("/redefinir?token="));
  const token2 = aviso2?.mensagem?.match(/token=([a-f0-9]+)/)?.[1] ?? "";
  const { res: rRestaurou } = await post("", "/api/auth/redefinir", { token: token2, senha: "123456" });
  verificar("Senha canônica da demo restaurada (123456)", rRestaurou.status === 200);

  const { res: rAnon } = await post("", "/api/auth/recuperar", { email: "inexistente@email.com" });
  verificar("Pedido para e-mail inexistente também responde 200 (sem enumeração)", rAnon.status === 200);

  // ── 6. RATE LIMIT DO LOGIN (em banco, por IP) ─────────────────
  console.log("Rate limit:");
  let bloqueou = false;
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "forca-bruta@teste.com", senha: "errada" }),
    });
    if (r.status === 429) {
      bloqueou = true;
      break;
    }
  }
  verificar("Muitas falhas seguidas disparam o bloqueio (429)", bloqueou);
  const rLegitimo = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "maria@email.com", senha: "123456" }),
  });
  verificar("Bloqueio vale mesmo para senha correta (anti força bruta)", rLegitimo.status === 429, `status=${rLegitimo.status}`);

  console.log(`\nResultado: ${aprovados} aprovados, ${falhados} falhados`);
  if (falhados > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
