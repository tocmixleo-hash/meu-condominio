import { db } from "@/lib/db";
import { json401, json403, usuarioAtual } from "@/lib/auth";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const PASTA = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 8 * 1024 * 1024;

export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  const lista = await db.documento.findMany({
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

  await mkdir(PASTA, { recursive: true });
  const nomeSeguro = `${Date.now()}-${arquivo.name.replace(/[^\w.\-]+/g, "_")}`;
  await writeFile(path.join(PASTA, nomeSeguro), Buffer.from(await arquivo.arrayBuffer()));

  const documento = await db.documento.create({
    data: {
      titulo,
      categoria,
      nomeArquivo: nomeSeguro,
      tamanhoBytes: arquivo.size,
      enviadoPorId: eu.id,
    },
    include: { enviadoPor: { select: { nome: true } } },
  });
  return Response.json({ documento });
}

export async function DELETE(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!["SINDICO", "ADMINISTRATIVO"].includes(eu.perfil)) return json403();
  const { id } = await req.json().catch(() => ({}) as never);
  const doc = await db.documento.findUnique({ where: { id } });
  if (!doc) return Response.json({ erro: "Documento não encontrado." }, { status: 404 });

  await unlink(path.join(PASTA, doc.nomeArquivo)).catch(() => null);
  await db.documento.delete({ where: { id } });
  return Response.json({ ok: true });
}
