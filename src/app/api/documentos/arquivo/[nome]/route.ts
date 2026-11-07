import { db } from "@/lib/db";
import { json401, usuarioAtual } from "@/lib/auth";
import { readFile } from "fs/promises";
import path from "path";

// Serve arquivos enviados (local: public/uploads; Vercel: /tmp/uploads).
// Com Blob configurado, o conteúdo é buscado no servidor e entregue por
// streaming após validar a sessão e o vínculo com o condomínio — a URL do
// armazenamento nunca chega ao navegador.
const PASTA = process.env.PASTA_UPLOADS
  ? path.resolve(process.env.PASTA_UPLOADS)
  : process.env.VERCEL
    ? "/tmp/uploads"
    : path.join(process.cwd(), "public", "uploads");

const TIPOS: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(_req: Request, { params }: { params: Promise<{ nome: string }> }) {
  const eu = await usuarioAtual();
  if (!eu) return json401();

  const { nome } = await params;
  const limpo = path.basename(nome); // impede travessia de diretório

  // Arquivo armazenado no Vercel Blob — busca e entrega no servidor (URL privada)
  const doc = await db.documento.findFirst({
    where: { nomeArquivo: limpo, condominioId: eu.condominio.id },
  });
  if (doc?.url) {
    // URL absoluta (Vercel Blob) ou relativa (arquivo estático do próprio
    // site, ex.: "/docs/regimento-interno.pdf" — sobrevive a deploys sem
    // armazenamento externo). Ambas são buscadas e servidas pelo servidor
    // após validar a sessão e o vínculo com o condomínio.
    const destino = doc.url.startsWith("http")
      ? doc.url
      : new URL(doc.url, new URL(_req.url).origin).toString();
    const resposta = await fetch(destino).catch(() => null);
    if (!resposta || !resposta.ok || !resposta.body) {
      return Response.json({ erro: "Arquivo não encontrado no armazenamento." }, { status: 404 });
    }
    const ext = path.extname(limpo).toLowerCase();
    return new Response(resposta.body, {
      headers: {
        "Content-Type": TIPOS[ext] ?? resposta.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${limpo}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // Arquivo gravado no filesystem — layouts novo (por condomínio) e antigo
  const condominio = await db.condominio.findUnique({
    where: { id: eu.condominio.id },
    select: { slug: true },
  });
  const candidatos = [
    path.join(PASTA, "condominios", condominio?.slug ?? "geral", limpo),
    path.join(PASTA, limpo),
  ];
  for (const caminho of candidatos) {
    try {
      const conteudo = await readFile(caminho);
      const ext = path.extname(limpo).toLowerCase();
      return new Response(new Uint8Array(conteudo), {
        headers: {
          "Content-Type": TIPOS[ext] ?? "application/octet-stream",
          "Content-Disposition": `inline; filename="${limpo}"`,
        },
      });
    } catch {
      // tenta o próximo caminho
    }
  }
  return Response.json({ erro: "Arquivo não encontrado." }, { status: 404 });
}
