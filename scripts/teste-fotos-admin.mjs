// Teste E2E da gestão de fotos pelo administrador (Identidade visual):
// login PLATAFORMA → upload de foto de espaço → valida em /reservas/regras e
// /condominios/[id] → restaura padrão → valida remoção.
import crypto from "crypto";

const BASE = "http://localhost:3000";
let falhas = 0;

function registrar(nome, ok, extra = "") {
  if (!ok) falhas++;
  console.log(`${ok ? "✅" : "❌"} ${nome}${extra ? ` — ${extra}` : ""}`);
}

// JPEG mínimo válido (1×1 vermelho) com extensão .jpg
function jpegTeste() {
  // JPEG 1x1: cabeçalhos mínimos fixos
  const bytes = Buffer.from(
    "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbfa28a2800a28a2800a28a2803ffd9",
    "hex",
  );
  return new File([bytes], "teste.jpg", { type: "image/jpeg" });
}

const navegador = await fetch(BASE + "/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@meucondominio.com", senha: "admin123", tipo: "PLATAFORMA" }),
  redirect: "manual",
});
const cookieSessao = (navegador.headers.getSetCookie?.() ?? [])
  .map((c) => c.split(";")[0])
  .find((c) => c.startsWith("mc_sessao="));
registrar("login PLATAFORMA", navegador.ok && !!cookieSessao, `status ${navegador.status}`);
if (!cookieSessao) process.exit(1);
const cab = { cookie: cookieSessao };

// Condomínio alvo
const listaC = await (await fetch(BASE + "/api/condominios", { headers: cab })).json();
const alvo = listaC.lista?.find((c) => c.slug === "california") ?? listaC.lista?.[0];
registrar("lista de condomínios", !!alvo, alvo?.nome ?? "nada");

// Estado inicial das fotos de espaço
const antes = await (await fetch(`${BASE}/api/condominios/${alvo.id}`, { headers: cab })).json();
const espacosAntes = antes.condominio?.espacoFotos ?? [];
registrar("GET condomínio expõe espacoFotos", Array.isArray(espacosAntes), JSON.stringify(espacosAntes));

// Upload PISCINA
const fd = new FormData();
fd.set("tipo", "foto_espaco");
fd.set("espaco", "PISCINA");
fd.set("arquivo", jpegTeste());
const up = await fetch(`${BASE}/api/condominios/${alvo.id}/arquivo`, {
  method: "POST",
  headers: cab,
  body: fd,
});
const dadosUp = await up.json().catch(() => ({}));
registrar("upload foto PISCINA", up.ok && dadosUp.campo === "espacoFoto" && !!dadosUp.url, JSON.stringify(dadosUp).slice(0, 140));

// Reflete em /reservas/regras
const regras = await (await fetch(BASE + "/api/reservas/regras", { headers: cab })).json();
const piscina = regras.lista?.find((r) => r.espaco === "PISCINA");
registrar(
  "regras de reservas trazem foto PISCINA",
  !!piscina?.foto,
  `foto=${String(piscina?.foto).slice(0, 90)}`,
);

// Foto servível? (upload local cai em /uploads/...; Blob cai em https)
if (piscina?.foto?.startsWith("/")) {
  const img = await fetch(BASE + piscina.foto);
  registrar("arquivo de foto servido", img.ok, `status ${img.status} · ${img.headers.get("content-type")}`);
} else {
  registrar("arquivo de foto servido", true, `URL remota: ${String(piscina?.foto).slice(0, 60)}`);
}

// Aparece no GET do condomínio
const depois = await (await fetch(`${BASE}/api/condominios/${alvo.id}`, { headers: cab })).json();
const tem = (depois.condominio?.espacoFotos ?? []).some((f) => f.espaco === "PISCINA");
registrar("espacoFotos persistido no condomínio", tem);

// Restaura padrão (DELETE)
const del = await fetch(`${BASE}/api/condominios/${alvo.id}/arquivo`, {
  method: "DELETE",
  headers: { ...cab, "Content-Type": "application/json" },
  body: JSON.stringify({ tipo: "foto_espaco", espaco: "PISCINA" }),
});
registrar("restaurar padrão (DELETE)", del.ok, `status ${del.status}`);

const final = await (await fetch(BASE + "/api/reservas/regras", { headers: cab })).json();
const piscinaFinal = final.lista?.find((r) => r.espaco === "PISCINA");
registrar("foto de PISCINA voltou ao padrão (null)", piscinaFinal?.foto == null, `foto=${String(piscinaFinal?.foto)}`);

// Auditoria registrou as ações?
const aud = await (await fetch(BASE + "/api/auditoria?limite=8", { headers: cab })).json();
const acoes = (aud.lista ?? aud.registros ?? []).map((a) => a.acao ?? "");
registrar("auditoria IDENTIDADE_ARquivo presente", acoes.some((a) => a.includes("IDENTIDADE_ARQUIVO")), JSON.stringify(acoes.slice(0, 5)));

console.log(falhas === 0 ? "\n🎉 FLUXO DE FOTOS OK" : `\n💥 ${falhas} problema(s)`);
process.exit(falhas === 0 ? 0 : 1);
