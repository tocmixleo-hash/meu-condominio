import { db } from "@/lib/db";
import { json401, json403, usuarioAtual } from "@/lib/auth";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { registrarAcao } from "@/lib/auditoria";
import { notificarCondominio } from "@/lib/notificacoes";

// No Vercel o filesystem é somente leitura (exceto /tmp); local usa public/uploads.
// Com BLOB_READ_WRITE_TOKEN configurado, arquivos vão para o Vercel Blob
// (armazenamento persistente) e só caem no filesystem como reserva.
const PASTA =
  process.env.PASTA_UPLOADS
    ? path.resolve(process.env.PASTA_UPLOADS)
    : process.env.VERCEL
      ? "/tmp/uploads"
      : path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;

async function salvarArquivo(nomeSeguro: string, conteudo: Buffer): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`documentos/${nomeSeguro}`, conteudo, {
        access: "public",
        token,
        addRandomSuffix: false,
      });
      return blob.url;
    } catch {
      // Blob indisponível — grava no filesystem como reserva
    }
  }
  await mkdir(PASTA, { recursive: true });
  await writeFile(path.join(PASTA, nomeSeguro), conteudo);
  return null;
}

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.documento.findMany({
    where: { condominioId: eu.condominio.id },
    include: { enviadoPor: { select: { nome: true } } },
    orderBy: { criadoEm: "desc" },
  });
  return Response.json({ lista });
}

export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!["SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ erro: "Envio inválido." }, { status: 400 });
  const titulo = String(form.get("titulo") || "").trim();
  const categoria = String(form.get("categoria") || "OUTRO");
  const arquivo = form.get("arquivo") as File | null;
  if (!titulo || !arquivo || typeof arquivo.arrayBuffer !== "function") {
    return Response.json({ erro: "Informe título e selecione um arquivo." }, { status: 400 });
  }
  if (arquivo.size > MAX_BYTES) {
    return Response.json({ erro: "Arquivo muito grande (máx. 8 MB)." }, { status: 400 });
  }

  const nomeSeguro = `${Date.now()}-${arquivo.name.replace(/[^\w.\-]+/g, "_")}`;
  const url = await salvarArquivo(nomeSeguro, Buffer.from(await arquivo.arrayBuffer()));

  const documento = await db.documento.create({
    data: {
      condominioId: eu.condominio.id,
      titulo,
      categoria,
      nomeArquivo: nomeSeguro,
      url,
      tamanhoBytes: arquivo.size,
      enviadoPorId: eu.id,
    },
    include: { enviadoPor: { select: { nome: true } } },
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "DOCUMENTO_ENVIADO",
    detalhe: documento.titulo,
  });
  await notificarCondominio(eu.condominio.id, "DOCUMENTO", {
    titulo: "Novo documento disponível",
    mensagem: `${titulo}`,
    excetoUsuarioId: eu.id,
  });

  return Response.json({ documento });
}

export async function DELETE(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!["SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();
  const { id } = await req.json().catch(() => ({} as never));
  const doc = await db.documento.findFirst({
    where: { id: String(id ?? ""), condominioId: eu.condominio.id },
  });
  if (!doc) return Response.json({ erro: "Documento não encontrado." }, { status: 404 });

  if (doc.url) {
    try {
      const { del } = await import("@vercel/blob");
      await del(doc.url);
    } catch {
      // ignora falha de exclusão remota
    }
  } else {
    await unlink(path.join(PASTA, doc.nomeArquivo)).catch(() => null);
  }
  await db.documento.delete({ where: { id: doc.id } });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "DOCUMENTO_EXCLUIDO",
    detalhe: doc.titulo,
  });

  return Response.json({ ok: true });
}
