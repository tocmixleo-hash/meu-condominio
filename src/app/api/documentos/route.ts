import { db } from "@/lib/db";
import { json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { registrarAcao } from "@/lib/auditoria";
import { notificarCondominio } from "@/lib/notificacoes";
import { otimizarPdf } from "@/lib/pdf-otimizador";

// No Vercel o filesystem é somente leitura (exceto /tmp); local usa public/uploads.
// Com BLOB_READ_WRITE_TOKEN configurado, arquivos vão para o Vercel Blob
// (armazenamento persistente) sob chaves organizadas por condomínio. Na Vercel
// SEM Blob o envio é rejeitado com mensagem clara: gravar em /tmp cria URLs
// que somem entre instâncias (mesma causa das fotografias quebradas).
const MENSAGEM_ARMAZENAMENTO =
  "O armazenamento de arquivos não está configurado (falta BLOB_READ_WRITE_TOKEN na Vercel). Configure a variável de ambiente e tente novamente.";
const PASTA =
  process.env.PASTA_UPLOADS
    ? path.resolve(process.env.PASTA_UPLOADS)
    : process.env.VERCEL
      ? "/tmp/uploads"
      : path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;

async function salvarArquivo(slug: string, nomeSeguro: string, conteudo: Buffer): Promise<string | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`condominios/${slug}/documentos/${nomeSeguro}`, conteudo, {
        access: "public",
        token,
        addRandomSuffix: false,
      });
      return blob.url;
    } catch {
      // Blob configurado mas indisponível: na Vercel não cair para /tmp
      // (efêmero por instância — a URL gravada viraria 404).
      if (process.env.VERCEL) throw new Error(MENSAGEM_ARMAZENAMENTO);
    }
  } else if (process.env.VERCEL) {
    throw new Error(MENSAGEM_ARMAZENAMENTO);
  }
  // Reserva em disco — somente desenvolvimento local.
  const pasta = path.join(PASTA, "condominios", slug);
  await mkdir(pasta, { recursive: true });
  await writeFile(path.join(pasta, nomeSeguro), conteudo);
  return null;
}

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!pode(eu, "documentos")) return json403();
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
  // Documentos: gestão somente. O morador tem a permissão de LEITURA do
  // módulo (regimento, convenção, atas) mas nunca envia nem apaga.
  if (!pode(eu, "documentos") || eu.perfil === "MORADOR") return json403();

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
  const condominio = await db.condominio.findUnique({
    where: { id: eu.condominio.id },
    select: { slug: true },
  });
  // PDFs passam por otimização estrutural (sem perda de qualidade); outros
  // tipos e PDFs que não encolhem seguem com os bytes originais.
  const otimizacao = await otimizarPdf(Buffer.from(await arquivo.arrayBuffer()));
  let url: string | null;
  try {
    url = await salvarArquivo(condominio?.slug ?? "geral", nomeSeguro, otimizacao.bytes);
  } catch (e) {
    if (e instanceof Error && e.message === MENSAGEM_ARMAZENAMENTO) {
      return Response.json({ erro: e.message }, { status: 503 });
    }
    throw e;
  }

  const documento = await db.documento.create({
    data: {
      condominioId: eu.condominio.id,
      titulo,
      categoria,
      nomeArquivo: nomeSeguro,
      url,
      tamanhoBytes: otimizacao.final,
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

  return Response.json({
    documento,
    otimizacao: otimizacao.otimizado
      ? { original: otimizacao.original, final: otimizacao.final }
      : null,
  });
}

export async function DELETE(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  // Gestão somente — morador é leitor do módulo Documentos.
  if (!pode(eu, "documentos") || eu.perfil === "MORADOR") return json403();
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
    const condominio = await db.condominio.findUnique({
      where: { id: doc.condominioId },
      select: { slug: true },
    });
    const caminho = path.join(PASTA, "condominios", condominio?.slug ?? "geral", doc.nomeArquivo);
    await unlink(caminho).catch(() => null);
    // Compatibilidade com arquivos gravados no layout antigo (sem pasta por condomínio)
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
