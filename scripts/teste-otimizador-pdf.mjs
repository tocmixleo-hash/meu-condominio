/**
 * TESTE do otimizador de PDF em /api/documentos:
 *  1. gera um PDF "estilo escâner" (muitos objetos, sem object streams);
 *  2. entra como gestão e envia o PDF → espera resposta com otimizacao
 *     (original > final) e tamanho gravado = final;
 *  3. baixa o arquivo salvo e confere que é um PDF válido;
 *  4. envia um .txt → espera otimizacao nula e tamanho intacto;
 *  5. apaga os dois documentos de teste.
 *
 * Uso: bun scripts/teste-otimizador-pdf.mjs
 */
import { PDFDocument, StandardFonts } from "pdf-lib";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";

const BASE = "http://localhost:3000";

async function gerarPdfEstiloEscaner() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pagina = doc.addPage([595, 842]);
  for (let i = 0; i < 600; i++) {
    pagina.drawText(
      `Registro ${String(i).padStart(3, "0")} — ata da reuniao de condominos, deliberacao ${i} aprovada por maioria, texto corrido para ocupar objetos.`,
      { x: 28, y: 820 - (i % 52) * 15.5, size: 8, font }
    );
    if (i % 52 === 51) pagina.drawText(`— pagina ${Math.floor(i / 52) + 1} —`, { x: 260, y: 12, size: 8, font });
  }
  // useObjectStreams:false = xref plano, como escâneres/impressoras antigas gravam
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

// ── sessão ──────────────────────────────────────────────────────────────
const rLogin = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "sindico@parquecalifornia.com.br", senha: "admin123" }),
});
if (!rLogin.ok) throw new Error(`login falhou: ${rLogin.status}`);
const cookie = (rLogin.headers.getSetCookie?.() ?? [rLogin.headers.get("set-cookie") ?? ""])
  .map((c) => c.split(";")[0])
  .join("; ");
const HEAD = { cookie };

// ── caso 1: PDF otimiza ────────────────────────────────────────────────
const pdf = await gerarPdfEstiloEscaner();
writeFileSync("/tmp/teste-ata.pdf", pdf);
console.log(`PDF gerado: ${pdf.length} bytes`);

const form = new FormData();
form.append("titulo", "TESTE otimizador (apagar)");
form.append("categoria", "ATA");
form.append("arquivo", new Blob([pdf], { type: "application/pdf" }), "ata-teste.pdf");
const r1 = await fetch(`${BASE}/api/documentos`, { method: "POST", headers: HEAD, body: form });
const c1 = await r1.json();
if (!r1.ok) throw new Error(`POST pdf falhou: ${r1.status} ${JSON.stringify(c1)}`);
console.log("resposta otimizacao:", JSON.stringify(c1.otimizacao));
console.log("tamanhoBytes gravado:", c1.documento?.tamanhoBytes, "| original:", pdf.length);

const ok1 = c1.otimizacao && c1.otimizacao.final < pdf.length && c1.documento.tamanhoBytes === c1.otimizacao.final;
console.log(ok1 ? "PASSOU: PDF encolheu e tamanho gravado confere" : "FALHOU: otimizacao ausente/invalida");

// baixa e valida o arquivo salvo
const rDown = await fetch(`${BASE}/api/documentos/arquivo/${c1.documento.nomeArquivo}`, { headers: HEAD });
const baixado = Buffer.from(await rDown.arrayBuffer());
console.log(`download: ${baixado.length} bytes | marca PDF: ${baixado.subarray(0, 5).toString("latin1") === "%PDF-"}`);

// ── caso 2: não-PDF passa intocado ─────────────────────────────────────
const txt = Buffer.from("Lista de presença da assembleia.\n".repeat(50), "utf8");
const form2 = new FormData();
form2.append("titulo", "TESTE passthrough (apagar)");
form2.append("categoria", "OUTRO");
form2.append("arquivo", new Blob([txt], { type: "text/plain" }), "presenca.txt");
const r2 = await fetch(`${BASE}/api/documentos`, { method: "POST", headers: HEAD, body: form2 });
const c2 = await r2.json();
if (!r2.ok) throw new Error(`POST txt falhou: ${r2.status} ${JSON.stringify(c2)}`);
const ok2 = c2.otimizacao === null && c2.documento.tamanhoBytes === txt.length;
console.log(`txt: otimizacao=${JSON.stringify(c2.otimizacao)} gravado=${c2.documento.tamanhoBytes} original=${txt.length}`);
console.log(ok2 ? "PASSOU: não-PDF segue intocado" : "FALHOU: não-PDF foi alterado");

// ── limpeza ────────────────────────────────────────────────────────────
for (const id of [c1.documento.id, c2.documento.id]) {
  const rd = await fetch(`${BASE}/api/documentos`, {
    method: "DELETE",
    headers: { ...HEAD, "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  console.log(`limpeza ${id.slice(-6)}: ${rd.status}`);
}
unlinkSync("/tmp/teste-ata.pdf");

const falhou = !ok1 || !ok2 || !(baixado.subarray(0, 5).toString("latin1") === "%PDF-");
process.exit(falhou ? 1 : 0);
