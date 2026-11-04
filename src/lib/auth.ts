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

export function criarToken(userId: string, condominioAtivoId?: string | null): string {
  const payload = Buffer.from(
    `${userId}|${condominioAtivoId ?? ""}|${Date.now()}`,
  ).toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

export function lerToken(token: string): { userId: string; condominioAtivoId: string | null } | null {
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;
  const esperada = assinar(payload);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const partes = Buffer.from(payload, "base64url").toString("utf8").split("|");
  const [userId, condominioAtivoId, emitidoEm] = partes;
  const iat = Number(emitidoEm);
  if (!userId || !Number.isFinite(iat)) return null;
  if (Date.now() - iat > DURACAO_SESSAO_MS) return null; // sessão expirada
  return { userId, condominioAtivoId: condominioAtivoId || null };
}

// ── Sessão ───────────────────────────────────────────────────────

export type CondominioSessao = {
  id: string;
  nome: string;
  slug: string;
  corTema: string;
  logo: string;
  foto: string;
  // Identidade visual administrável
  nomeExibicao: string | null;
  nomeCurto: string | null;
  descricao: string | null;
  telefoneContato: string | null;
  emailContato: string | null;
  endereco: string | null;
  cnpj: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  corDestaque: string | null;
  corSidebar: string | null;
  corFundo: string | null;
  corTexto: string | null;
  logoMenu: string | null;
  logoCabecalho: string | null;
};

export type UsuarioSessao = {
  id: string;
  nome: string;
  email: string;
  perfil: string; // perfil do vínculo ATIVO (PLATAFORMA para o administrador geral)
  telefone: string | null;
  ativo: boolean;
  unidade: { id: string; bloco: string; numero: string } | null;
  condominio: CondominioSessao; // condomínio ativo
  condominios: CondominioSessao[]; // condomínios acessíveis (vínculos ou todos)
  ehPlataforma: boolean;
};

type CondominioCompleto = {
  id: string;
  nome: string;
  slug: string;
  corTema: string;
  logo: string;
  foto: string;
  nomeExibicao: string | null;
  nomeCurto: string | null;
  descricao: string | null;
  telefoneContato: string | null;
  emailContato: string | null;
  endereco: string | null;
  cnpj: string | null;
  corPrimaria: string | null;
  corSecundaria: string | null;
  corDestaque: string | null;
  corSidebar: string | null;
  corFundo: string | null;
  corTexto: string | null;
  logoMenu: string | null;
  logoCabecalho: string | null;
};

function paraSessao(c: CondominioCompleto): CondominioSessao {
  return {
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    corTema: c.corTema,
    logo: c.logo,
    foto: c.foto,
    nomeExibicao: c.nomeExibicao,
    nomeCurto: c.nomeCurto,
    descricao: c.descricao,
    telefoneContato: c.telefoneContato,
    emailContato: c.emailContato,
    endereco: c.endereco,
    cnpj: c.cnpj,
    corPrimaria: c.corPrimaria,
    corSecundaria: c.corSecundaria,
    corDestaque: c.corDestaque,
    corSidebar: c.corSidebar,
    corFundo: c.corFundo,
    corTexto: c.corTexto,
    logoMenu: c.logoMenu,
    logoCabecalho: c.logoCabecalho,
  };
}

const CAMPOS_CONDOMINIO = {
  id: true, nome: true, slug: true, corTema: true, logo: true, foto: true,
  nomeExibicao: true, nomeCurto: true, descricao: true, telefoneContato: true,
  emailContato: true, endereco: true, cnpj: true, corPrimaria: true,
  corSecundaria: true, corDestaque: true, corSidebar: true, corFundo: true,
  corTexto: true, logoMenu: true, logoCabecalho: true,
} as const;

type VinculoAtivo = {
  condominioId: string;
  perfil: string;
  ativo: boolean;
  condominio: CondominioCompleto;
};

/**
 * Monta a sessão do usuário escolhendo o condomínio ativo com segurança:
 * - PLATAFORMA: todos os condomínios são acessíveis, ativo = pedido ou primeiro;
 * - demais perfis: ativo precisa estar entre os vínculos ativos do usuário e
 *   o perfil efetivo é o do vínculo (permissões independentes por vínculo).
 */
async function montarSessao(
  u: {
    id: string;
    nome: string;
    email: string;
    senha: string;
    perfil: string;
    telefone: string | null;
    ativo: boolean;
    condominioId: string;
    unidadeId: string | null;
    unidade: { id: string; bloco: string; numero: string } | null;
    vinculos: VinculoAtivo[];
  },
  ativoPedidoId: string | null,
): Promise<UsuarioSessao | null> {
  if (u.perfil === "PLATAFORMA") {
    const todos = await db.condominio.findMany({ orderBy: { criadoEm: "asc" }, select: CAMPOS_CONDOMINIO });
    const ativo =
      todos.find((c) => c.id === ativoPedidoId) ??
      todos.find((c) => c.id === u.condominioId) ??
      todos[0];
    if (!ativo) return null; // plataforma sem condomínios cadastrados
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      perfil: "PLATAFORMA",
      telefone: u.telefone,
      ativo: u.ativo,
      unidade: null,
      condominio: paraSessao(ativo),
      condominios: todos.map(paraSessao),
      ehPlataforma: true,
    };
  }

  const vinculos = u.vinculos.filter((v) => v.ativo);
  if (vinculos.length === 0) return null; // sem vínculo ativo — trate como não autenticado
  const vinculoAtivo =
    vinculos.find((v) => v.condominioId === ativoPedidoId) ??
    vinculos.find((v) => v.condominioId === u.condominioId) ??
    vinculos[0];
  const unidade =
    vinculoAtivo.condominioId === u.condominioId ? u.unidade : null;
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: vinculoAtivo.perfil,
    telefone: u.telefone,
    ativo: u.ativo,
    unidade: unidade
      ? { id: unidade.id, bloco: unidade.bloco, numero: unidade.numero }
      : null,
    condominio: paraSessao(vinculoAtivo.condominio),
    condominios: vinculos.map((v) => paraSessao(v.condominio)),
    ehPlataforma: false,
  };
}

const INCLUIR_SESSAO = {
  unidade: true,
  vinculos: { where: { ativo: true }, include: { condominio: { select: CAMPOS_CONDOMINIO } } },
} as const;

/** Sessão a partir do cookie (condomínio ativo assinado no token). */
export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const loja = await cookies();
  const token = loja.get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const lido = lerToken(token);
  if (!lido) return null;
  const u = await db.usuario.findUnique({
    where: { id: lido.userId },
    include: INCLUIR_SESSAO,
  });
  if (!u || !u.ativo) return null;
  return montarSessao(u, lido.condominioAtivoId);
}

/** Sessão explícita após login ou troca de condomínio (usa a mesma regra de segurança). */
export async function sessaoComCondominio(
  userId: string,
  condominioAtivoId: string | null,
): Promise<UsuarioSessao | null> {
  const u = await db.usuario.findUnique({
    where: { id: userId },
    include: INCLUIR_SESSAO,
  });
  if (!u || !u.ativo) return null;
  return montarSessao(u, condominioAtivoId);
}

export function json401() {
  return Response.json({ erro: "Sessão expirada. Entre novamente." }, { status: 401 });
}

export function json403() {
  return Response.json({ erro: "Você não tem permissão para esta ação." }, { status: 403 });
}

// Gestão do condomínio ou administrador global da plataforma
const PERFIS_GESTAO = ["SINDICO", "ADMINISTRATIVO", "PLATAFORMA"];

export function ehGestao(perfil: string) {
  return PERFIS_GESTAO.includes(perfil);
}

/** Apenas o perfil global de administrador da plataforma. */
export function ehPlataforma(perfil: string) {
  return perfil === "PLATAFORMA";
}
