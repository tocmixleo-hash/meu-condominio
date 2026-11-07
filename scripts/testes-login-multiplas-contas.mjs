/**
 * Reproduz e valida a correção do login quando o MESMO e-mail existe em
 * mais de uma conta (por condomínio) com SENHAS DIFERENTES:
 *   - antes: só a primeira linha era testada → "E-mail ou senha incorretos"
 *     mesmo com a senha correta da outra conta;
 *   - depois: a senha é conferida em todas as contas ativas do e-mail.
 */
import { createClient } from "@libsql/client";

const db = createClient({ url: "file:db/custom.db" });
const BASE = "http://localhost:3000";

const EMAIL = "admin@meucondominio.com";
const SENHA_PLATAFORMA = "admin123";
const SENHA_SEGUNDA = "outrasenha123";

async function login(senha, tipo) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, senha, ...(tipo ? { tipo } : {}) }),
  });
  const d = await r.json().catch(() => null);
  return { status: r.status, d };
}

// Estado inicial
const ordem = await db.execute(
  "SELECT rowid, id, perfil, condominioId FROM Usuario WHERE email = ? AND ativo = 1",
  [EMAIL],
);
console.log("ordem no banco:", ordem.rows.map((r) => `${r.rowid}:${r.perfil}`).join(" → "));
const original = ordem.rows[0];

// Conta "isca": mesmo e-mail, outro condomínio, outra senha (MORADOR)
const florida = (await db.execute("SELECT id FROM Condominio WHERE slug LIKE '%florida%'")).rows[0];
const existente = await db.execute("SELECT id FROM Usuario WHERE email = ? AND condominioId = ?", [
  EMAIL,
  florida.id,
]);
let iscaId = existente.rows[0]?.id;
if (iscaId) {
  await db.execute({ sql: "DELETE FROM Usuario WHERE id = ?", args: [iscaId] });
}
const hash = await import("bcryptjs").then((b) => b.hashSync(SENHA_SEGUNDA, 10));
iscaId = `isca${Date.now().toString(36)}`;
await db.execute({
  sql: "INSERT INTO Usuario (id, condominioId, nome, email, senha, perfil, ativo) VALUES (?, ?, ?, ?, ?, 'MORADOR', 1)",
  args: [iscaId, florida.id, "Conta Isca", EMAIL, hash],
});
await db.execute({
  sql: "INSERT INTO UsuarioCondominio (id, usuarioId, condominioId, perfil, ativo) VALUES (?, ?, ?, 'MORADOR', 1)",
  args: [`${iscaId}v`, iscaId, florida.id],
});
// Garante cenário adverso sem tocar na linha original: a isca entra no
// banco e a senha dela precisa funcionar MESMO que a varredura comece
// pela conta da plataforma (a correção testa todas as contas).
const depois = await db.execute(
  "SELECT rowid, perfil FROM Usuario WHERE email = ? AND ativo = 1 ORDER BY rowid",
  [EMAIL],
);
console.log("ordem no banco:", depois.rows.map((r) => `${r.rowid}:${r.perfil}`).join(" → "));

// ── Cenários ─────────────────────────────────────────────────────
let falhas = 0;
function checar(nome, ok, extra = "") {
  console.log(`${ok ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!ok) falhas++;
}

{
  const { status, d } = await login(SENHA_SEGUNDA);
  checar(
    "senha da 2ª conta entra (antes era rejeitada pela 1ª linha)",
    status === 200 && d?.usuario?.perfil === "MORADOR",
    `status=${status} perfil=${d?.usuario?.perfil}`,
  );
}
{
  const { status, d } = await login(SENHA_PLATAFORMA);
  checar(
    "senha da plataforma continua entrando",
    status === 200 && d?.usuario?.perfil === "PLATAFORMA",
    `status=${status} perfil=${d?.usuario?.perfil}`,
  );
}
{
  const { status } = await login("senhaincorreta");
  checar("senha errada continua rejeitada", status === 401, `status=${status}`);
}
{
  const { status, d } = await login(SENHA_SEGUNDA, "MORADOR");
  checar("tipo certo da 2ª conta aceito", status === 200, `status=${status} perfil=${d?.usuario?.perfil}`);
}

// Limpeza: remove a isca
await db.execute({ sql: "DELETE FROM Usuario WHERE id = ?", args: [iscaId] });
await db.execute({ sql: "DELETE FROM UsuarioCondominio WHERE usuarioId = ?", args: [iscaId] });
const final = await db.execute("SELECT count(*) n FROM Usuario WHERE email = ?", [EMAIL]);
console.log(`contas com o e-mail ao final: ${final.rows[0].n}`);

console.log(falhas === 0 ? "TUDO OK" : "FALHAS ENCONTRADAS");
process.exit(falhas === 0 ? 0 : 1);
