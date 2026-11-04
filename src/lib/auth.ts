import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SEGREDO = "meu-condominio::parque-california";
export const COOKIE_SESSAO = "mc_sessao";

export function hashSenha(senha: string): string {
  return createHash("sha256").update(`parque-california::${senha}`).digest("hex");
}

function assinar(valor: string): string {
  return createHmac("sha256", SEGREDO).update(valor).digest("hex");
}

export function criarToken(userId: string): string {
  const payload = Buffer.from(userId).toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

export function lerToken(token: string): string | null {
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;
  const esperada = assinar(payload);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Buffer.from(payload, "base64url").toString("utf8");
}

export type UsuarioSessao = {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  telefone: string | null;
  ativo: boolean;
  unidade: { id: string; bloco: string; numero: string } | null;
};

export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const loja = await cookies();
  const token = loja.get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const userId = lerToken(token);
  if (!userId) return null;
  const u = await db.usuario.findUnique({
    where: { id: userId },
    include: { unidade: true },
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
