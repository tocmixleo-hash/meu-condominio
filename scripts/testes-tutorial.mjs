/**
 * Suíte de testes do tipo de usuário na tela de login + mini tutorial do
 * primeiro acesso. Executa contra o servidor real (localhost:3000, banco demo).
 *
 * Uso: bun scripts/testes-tutorial.mjs [url-base]
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

async function entrar(email, senha, tipo) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha, ...(tipo ? { tipo } : {}), condominioId: "" }),
  });
  const corpo = await res.json().catch(() => null);
  return { res, corpo, cookie: cookieDaResposta(res, "mc_sessao") };
}

async function chamar(cookie, caminho, opcoes = {}) {
  const res = await fetch(`${BASE}${caminho}`, {
    ...opcoes,
    headers: { ...(opcoes.headers ?? {}), Cookie: cookie },
  });
  const corpo = await res.json().catch(() => null);
  return { res, corpo };
}

console.log(`Suíte de tipo de usuário + tutorial contra ${BASE}\n`);

// ── 1. Login sem tipo (compatibilidade) segue funcionando ────────
{
  const { res, corpo, cookie } = await entrar("maria@email.com", "123456", undefined);
  verificar(
    "login sem tipo continua aceito (compatibilidade)",
    res.status === 200 && corpo?.usuario?.perfil === "MORADOR" && !!cookie,
  );
}

// ── 2. Tipo correto entra normalmente ────────────────────────────
{
  const { res, corpo } = await entrar("maria@email.com", "123456", "MORADOR");
  verificar(
    "morador + tipo MORADOR → 200",
    res.status === 200 && corpo?.usuario?.perfil === "MORADOR",
  );
  verificar(
    "sessão carrega tutorialVisto (booleano)",
    typeof corpo?.usuario?.tutorialVisto === "boolean",
    `recebido: ${JSON.stringify(corpo?.usuario?.tutorialVisto)}`,
  );
}

// ── 3. Tipo errado → 403 com o tipo correto, sem cookie de sessão ─
{
  const { res, corpo, cookie } = await entrar("maria@email.com", "123456", "PORTARIA");
  verificar(
    "morador + tipo PORTARIA → 403 com perfilCorreto MORADOR",
    res.status === 403 && corpo?.perfilCorreto === "MORADOR",
  );
  verificar("tipo errado não cria sessão", !cookie);
}

{
  const { res, corpo } = await entrar("sindico@parquecalifornia.com.br", "admin123", "MORADOR");
  verificar(
    "síndico + tipo MORADOR → 403 com perfilCorreto GESTAO",
    res.status === 403 && corpo?.perfilCorreto === "GESTAO",
  );
}

{
  const { res, corpo } = await entrar("portaria@parquecalifornia.com.br", "portaria123", "GESTAO");
  verificar(
    "portaria + tipo GESTAO → 403 com perfilCorreto PORTARIA",
    res.status === 403 && corpo?.perfilCorreto === "PORTARIA",
  );
}

// ── 4. Tutorial: marca, reflete na sessão e fica idempotente ─────
{
  const { cookie, corpo } = await entrar("maria@email.com", "123456", "MORADOR");
  verificar("preparo: Maria entrou com tipo certo", !!cookie && corpo?.usuario?.perfil === "MORADOR");
  const antes = corpo?.usuario?.tutorialVisto;

  const { res: resMarca, corpo: corpoMarca } = await chamar(cookie, "/api/usuario/tutorial", {
    method: "POST",
  });
  verificar("POST tutorial → ok", resMarca.status === 200 && corpoMarca?.ok === true);

  const { corpo: depoisCorpo } = await chamar(cookie, "/api/auth/verificar");
  verificar(
    "sessão reflete tutorialVisto = true após marcar",
    depoisCorpo?.usuario?.tutorialVisto === true,
    `antes: ${antes}`,
  );

  // segunda passada continua ok (idempotente)
  const { res: res2 } = await chamar(cookie, "/api/usuario/tutorial", { method: "POST" });
  verificar("POST tutorial repetido → ok (idempotente)", res2.status === 200);
}

// ── 5. Sem sessão → 401 ──────────────────────────────────────────
{
  const { res } = await chamar("mc_sessao=inexistente", "/api/usuario/tutorial", { method: "POST" });
  verificar("POST tutorial sem sessão → 401", res.status === 401);
}

// ── 6. Senha errada segue 401 comum (tipo não vaza nada) ─────────
{
  const { res, corpo } = await entrar("maria@email.com", "senha-errada", "MORADOR");
  verificar(
    "senha errada + tipo certo → 401 genérico",
    res.status === 401 && corpo?.erro === "E-mail ou senha incorretos." && !corpo?.perfilCorreto,
  );
}

console.log(`\nResultado: ${aprovados} ✓ · ${falhados} ✗`);
process.exit(falhados > 0 ? 1 : 0);
