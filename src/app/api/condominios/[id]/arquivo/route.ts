import { db } from "@/lib/db";
import { ehGestao, ehPlataforma, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";
import path from "path";
import { mkdir, writeFile, unlink } from "fs/promises";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Uploads da identidade visual do condomínio (logotipos e fotografias).
 * Os arquivos vão para o Vercel Blob sob chaves organizadas por condomínio
 * (`condominios/{slug}/identidade/...`); sem Blob configurado, caem no
 * filesystem local como reserva. SVG é sanitizado contra scripts.
 */
async function garantirGestao(id: string) {
  const eu = await usuarioAtual();
  if (!eu) return { erro: json401() };
  const autorizado =
    ehPlataforma(eu.perfil) ||
    (ehGestao(eu.perfil) && eu.condominio.id === id) ||
    (pode(eu, "identidade") && eu.condominio.id === id);
  if (!autorizado) return { erro: json403() };
  return { eu };
}

const MAX_LOGO = 3 * 1024 * 1024; // 3 MB
const MAX_FOTO = 8 * 1024 * 1024; // 8 MB

const TIPOS_LOGO = ["logo_principal", "logo_menu", "logo_cabecalho"] as const;
const TIPOS_FOTO = ["foto_principal", "foto_area", "foto_institucional"] as const;
const EXT_LOGO = ["png", "jpg", "jpeg", "webp", "svg"];
const EXT_FOTO = ["png", "jpg", "jpeg", "webp"];

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** Remove scripts, manipuladores de evento e URLs perigosas de um SVG. */
function sanitizarSvg(texto: string): string {
  return texto
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\?script[\s\S]*?\?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "");
}

async function salvarArquivo(slug: string, nomeBase: string, conteudo: Buffer, ext: string) {
  const chave = `condominios/${slug}/identidade/${nomeBase}-${Date.now()}.${ext}`;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(chave, conteudo, {
        access: "public",
        token,
        addRandomSuffix: false,
        contentType: MIME[ext],
      });
      return { url: blob.url, chave };
    } catch {
      // Blob indisponível — grava no filesystem como reserva
    }
  }
  const pasta =
    process.env.PASTA_UPLOADS
      ? path.resolve(process.env.PASTA_UPLOADS, "condominios", slug)
      : process.env.VERCEL
        ? path.join("/tmp/uploads", "condominios", slug)
        : path.join(process.cwd(), "public", "uploads", "condominios", slug);
  await mkdir(pasta, { recursive: true });
  const nomeLocal = `${nomeBase}-${Date.now()}.${ext}`;
  await writeFile(path.join(pasta, nomeLocal), conteudo);
  return { url: `/uploads/condominios/${slug}/${nomeLocal}`, chave: null };
}

async function removerArquivoRemoto(url: string | null | undefined) {
  if (!url || !url.startsWith("http")) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch {
    // ignora falha de exclusão remota
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { erro, eu } = await garantirGestao(id);
  if (erro) return erro;

  const condominio = await db.condominio.findUnique({ where: { id }, select: { slug: true } });
  if (!condominio) return Response.json({ erro: "Condomínio não encontrado." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ erro: "Envio inválido." }, { status: 400 });
  const tipo = String(form.get("tipo") ?? "");
  const arquivo = form.get("arquivo") as File | null;
  if (![...TIPOS_LOGO, ...TIPOS_FOTO].includes(tipo as never)) {
    return Response.json({ erro: "Tipo de arquivo inválido." }, { status: 400 });
  }
  if (!arquivo || typeof arquivo.arrayBuffer !== "function") {
    return Response.json({ erro: "Selecione um arquivo para enviar." }, { status: 400 });
  }

  const ehLogo = (TIPOS_LOGO as readonly string[]).includes(tipo);
  const ext = (arquivo.name.split(".").pop() ?? "").toLowerCase();
  if (!(ehLogo ? EXT_LOGO : EXT_FOTO).includes(ext)) {
    return Response.json(
      { erro: ehLogo ? "Formatos aceitos para logotipo: PNG, JPG, WEBP ou SVG." : "Formatos aceitos para fotografia: PNG, JPG ou WEBP." },
      { status: 400 },
    );
  }
  if (arquivo.size > (ehLogo ? MAX_LOGO : MAX_FOTO)) {
    return Response.json(
      { erro: `Arquivo muito grande (máx. ${ehLogo ? "3 MB" : "8 MB"}).` },
      { status: 400 },
    );
  }

  let conteudo = Buffer.from(await arquivo.arrayBuffer());
  if (ext === "svg") {
    conteudo = Buffer.from(sanitizarSvg(conteudo.toString("utf8")), "utf8");
  }

  const { url } = await salvarArquivo(condominio.slug, tipo, conteudo, ext);

  // Aplica o arquivo no campo correspondente
  if (tipo === "logo_principal") {
    const anterior = await db.condominio.findUnique({ where: { id }, select: { logo: true } });
    await db.condominio.update({ where: { id }, data: { logo: url } });
    await removerArquivoRemoto(anterior?.logo);
    await registrarAcao({ condominioId: id, usuarioId: eu!.id, acao: "IDENTIDADE_ARQUIVO", detalhe: "Logotipo principal atualizado" });
    return Response.json({ url, campo: "logo" });
  }
  if (tipo === "logo_menu") {
    await db.condominio.update({ where: { id }, data: { logoMenu: url } });
    await registrarAcao({ condominioId: id, usuarioId: eu!.id, acao: "IDENTIDADE_ARQUIVO", detalhe: "Logotipo do menu atualizado" });
    return Response.json({ url, campo: "logoMenu" });
  }
  if (tipo === "logo_cabecalho") {
    await db.condominio.update({ where: { id }, data: { logoCabecalho: url } });
    await registrarAcao({ condominioId: id, usuarioId: eu!.id, acao: "IDENTIDADE_ARQUIVO", detalhe: "Logotipo do cabeçalho atualizado" });
    return Response.json({ url, campo: "logoCabecalho" });
  }
  if (tipo === "foto_principal") {
    const anterior = await db.condominio.findUnique({ where: { id }, select: { foto: true } });
    await db.condominio.update({ where: { id }, data: { foto: url } });
    await removerArquivoRemoto(anterior?.foto);
    await registrarAcao({ condominioId: id, usuarioId: eu!.id, acao: "IDENTIDADE_ARQUIVO", detalhe: "Fotografia principal atualizada" });
    return Response.json({ url, campo: "foto" });
  }

  // foto_area | foto_institucional — galeria com ordem automática
  const quantos = await db.condominioFoto.count({ where: { condominioId: id, tipo: tipo === "foto_area" ? "AREA_COMUM" : "INSTITUCIONAL" } });
  const foto = await db.condominioFoto.create({
    data: {
      condominioId: id,
      tipo: tipo === "foto_area" ? "AREA_COMUM" : "INSTITUCIONAL",
      url,
      ordem: quantos + 1,
    },
  });
  await registrarAcao({ condominioId: id, usuarioId: eu!.id, acao: "IDENTIDADE_ARQUIVO", detalhe: `Fotografia adicionada à galeria (${foto.tipo})` });
  return Response.json({ foto });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { erro, eu } = await garantirGestao(id);
  if (erro) return erro;

  const { tipo, id: fotoId, restaurarPadrao } = await req.json().catch(() => ({}) as never);
  const tipoStr = String(tipo ?? "");

  if (TIPOS_FOTO.includes(tipoStr as never) && tipoStr !== "foto_principal") {
    const foto = await db.condominioFoto.findFirst({ where: { id: String(fotoId ?? ""), condominioId: id } });
    if (!foto) return Response.json({ erro: "Fotografia não encontrada." }, { status: 404 });
    await db.condominioFoto.delete({ where: { id: foto.id } });
    await removerArquivoRemoto(foto.url);
    await registrarAcao({ condominioId: id, usuarioId: eu!.id, acao: "IDENTIDADE_ARQUIVO", detalhe: "Fotografia removida da galeria" });
    return Response.json({ ok: true });
  }

  if (tipoStr === "logo_principal" || tipoStr === "foto_principal") {
    const padrão = tipoStr === "logo_principal" ? "/fotos/logo-meu-condominio.png" : "/fotos/parque-california.jpg";
    const anterior = await db.condominio.findUnique({
      where: { id },
      select: tipoStr === "logo_principal" ? { logo: true } : { foto: true },
    });
    await db.condominio.update({
      where: { id },
      data: tipoStr === "logo_principal" ? { logo: padrão } : { foto: padrão },
    });
    await removerArquivoRemoto(tipoStr === "logo_principal" ? anterior?.logo : anterior?.foto);
    await registrarAcao({
      condominioId: id,
      usuarioId: eu!.id,
      acao: "IDENTIDADE_ARQUIVO",
      detalhe: restaurarPadrao ? "Arquivo restaurado ao padrão" : "Arquivo principal removido",
    });
    return Response.json({ ok: true });
  }

  if (TIPOS_LOGO.includes(tipoStr as never)) {
    await db.condominio.update({
      where: { id },
      data: tipoStr === "logo_menu" ? { logoMenu: null } : { logoCabecalho: null },
    });
    await registrarAcao({ condominioId: id, usuarioId: eu!.id, acao: "IDENTIDADE_ARQUIVO", detalhe: "Logotipo redefinido para o padrão" });
    return Response.json({ ok: true });
  }

  return Response.json({ erro: "Tipo de arquivo inválido." }, { status: 400 });
}
