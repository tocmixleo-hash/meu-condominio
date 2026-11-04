import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Em produção defina SEGREDO_SESSAO (openssl rand -hex 32). O valor padrão
// existe para o ambiente de demonstração — é determinístico entre instâncias.
const SEGREDO = process.env.SEGREDO_SESSAO ?? "meu-condominio::chave-padrao-demo";
export const COOKIE_SESSAO = "mc_sessao";
const DURACAO_SESSAO_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function hashSenha(senha: string): string {
  return bcrypt.hashSync(senha, 10);
}

export function conferirSenha(senha: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(senha, hash);
  } catch {
    return false;
  }
}

function assinar(valor: string): string {
  return createHmac("sha256", SEGREDO).update(valor).digest("hex");
}

export function criarToken(userId: string): string {
  const payload = Buffer.from(`${userId}|${Date.now()}`).toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

export function lerToken(token: string): string | null {
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;
  const esperada = assinar(payload);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [userId, emitidoEm] = Buffer.from(payload, "base64url").toString("utf8").split("|");
  const iat = Number(emitidoEm);
  if (!userId || !Number.isFinite(iat)) return null;
  if (Date.now() - iat > DURACAO_SESSAO_MS) return null; // sessão expirada
  return userId;
}

export type CondominioSessao = {
  id: string;
  nome: string;
  slug: string;
  corTema: string;
  logo: string;
  foto: string;
};

export type UsuarioSessao = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  telefone: string | null;
  ativo: boolean;
  unidade: { id: string; bloco: string; numero: string } | null;
  condominio: CondominioSessao;
};

export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const loja = await cookies();
  const token = loja.get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const userId = lerToken(token);
  if (!userId) return null;
  const u = await db.usuario.findUnique({
    where: { id: userId },
    include: { unidade: true, condominio: true },
  });
  if (!u || !u.ativo) return null;
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil,
    telefone: u.telefone,
    ativo: u.ativo,
    unidade: u.unidade
      ? { id: u.unidade.id, bloco: u.unidade.bloco, numero: u.unidade.numero }
      : null,
    condominio: {
      id: u.condominio.id,
      nome: u.condominio.nome,
      slug: u.condominio.slug,
      corTema: u.condominio.corTema,
      logo: u.condominio.logo,
      foto: u.condominio.foto,
    },
  };
}

export function json401() {
  return Response.json({ erro: "Sessão expirada. Entre novamente." }, { status: 401 });
}

export function json403() {
  return Response.json({ erro: "Você não tem permissão para esta ação." }, { status: 403 });
}

const PERFIS_GESTAO = ["SINDICO", "ADMINISTRATIVO"];

export function ehGestao(perfil: string) {
  return PERFIS_GESTAO.includes(perfil);
}
