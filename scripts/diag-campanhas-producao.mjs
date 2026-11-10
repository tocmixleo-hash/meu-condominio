/**
 * Diagnóstico das campanhas na PRODUÇÃO:
 * loga com perfis demo, chama /api/campanhas e mostra status + corpo.
 * Somente leitura — nada é alterado.
 */
const BASE = process.argv[2] ?? "https://parque-california.vercel.app";

const contas = [
  { email: "sindico@parquecalifornia.com.br", senha: "admin123" },
  { email: "maria@email.com", senha: "123456" },
];

for (const c of contas) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: c.email, senha: c.senha }),
  });
  const cookies = r.headers.getSetCookie?.() ?? [];
  const sessao = cookies.find((x) => x.startsWith("mc_sessao="))?.split(";")[0];
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.usuario) {
    console.log(`✗ login ${c.email}: ${r.status} ${JSON.stringify(d ?? "")}`);
    continue;
  }
  console.log(`✓ login ${c.email} (${d.usuario.perfil})`);

  for (const qs of ["", "?todas=1"]) {
    const rc = await fetch(`${BASE}/api/campanhas${qs}`, { headers: { Cookie: sessao } });
    const dc = await rc.text();
    console.log(`  GET /api/campanhas${qs} → ${rc.status}`);
    console.log(`  corpo: ${dc.slice(0, 500)}`);
  }

  // Comparação: comunicados (mesma régua de gestão) funciona?
  const rk = await fetch(`${BASE}/api/comunicados`, { headers: { Cookie: sessao } });
  console.log(`  GET /api/comunicados (controle) → ${rk.status}`);
}
