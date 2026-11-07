/**
 * Diagnóstico do tutorial "só vai para o admin":
 * loga com cada perfil demo na produção e mostra o tutorialVisto
 * retornado pela sessão (sem alterar nada).
 */
const BASE = "https://parque-california.vercel.app";

const usuarios = [
  { email: "maria@email.com", senha: "123456", esperado: "MORADOR" },
  { email: "sindico@parquecalifornia.com.br", senha: "admin123", esperado: "SINDICO" },
  { email: "portaria@parquecalifornia.com.br", senha: "portaria123", esperado: "PORTARIA" },
  { email: "administrativo@parquecalifornia.com.br", senha: "admin123", esperado: "ADMINISTRATIVO" },
  { email: "helena@email.com", senha: "123456", esperado: "MORADOR" },
  { email: "sindico@parqueflorida.com.br", senha: "admin123", esperado: "SINDICO" },
  { email: "portaria@parqueflorida.com.br", senha: "portaria123", esperado: "PORTARIA" },
];

for (const u of usuarios) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: u.email, senha: u.senha }),
  });
  const cookies = r.headers.getSetCookie?.() ?? [];
  const cookieSessao = cookies.find((c) => c.startsWith("mc_sessao="));
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.usuario) {
    console.log(`✗ ${u.email}: login falhou (${r.status}) ${JSON.stringify(d?.erro ?? "")}`);
    continue;
  }
  const sessao = { Cookie: cookieSessao?.split(";")[0] };
  const v = await fetch(`${BASE}/api/auth/verificar`, { headers: sessao });
  const dv = await v.json().catch(() => null);
  const usuario = dv?.usuario;
  console.log(
    `${u.email.padEnd(38)} perfil=${String(usuario?.perfil).padEnd(12)} tutorialVisto=${usuario?.tutorialVisto} simulando=${usuario?.simulando ? "sim" : "não"}`,
  );
}
