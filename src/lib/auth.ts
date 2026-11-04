import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Em produção defina SEGREDO_SESSAO (openssl rand -hex 32). O valor padrão
// existe para o ambiente de demonstração — é determinístico entre instâncias.
const SEGREDO = process.env.SEGREDO_SESSAO ?? "meu-condominio::chave-padrao-demo";
export const COOKIE_SESSAO = "mc_sessao";
export const COOKIE_SIMULACAO = "mc_simulacao"; // simulação de perfis (só plataforma)
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

// ── Simulação de perfis (exclusiva do administrador da plataforma) ─
// O administrador pode "vestir" qualquer perfil do condomínio ativo para
// testar exatamente o que cada um vê e pode fazer. O cookie é assinado e
// só é honrado quando a sessão de base é PLATAFORMA — a simulação nunca
// amplia poderes de outros usuários.
export type Simulacao = {
  perfil: string;
  funcaoId: string | null;
  funcaoNome: string | null;
};

const PERFIS_SIMULAVEIS = ["SINDICO", "ADMINISTRATIVO", "PORTARIA", "MORADOR"];

export function criarTokenSimulacao(perfil: string, funcaoId?: string | null): string {
  const payload = Buffer.from(`${perfil}|${funcaoId ?? ""}`).toString("base64url");
  return `${payload}.${assinar(payload)}`;
}

export function lerTokenSimulacao(
  token: string | undefined | null,
): { perfil: string; funcaoId: string | null } | null {
  if (!token) return null;
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;
  const esperada = assinar(payload);
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [perfil, funcaoId] = Buffer.from(payload, "base64url").toString("utf8").split("|");
  if (!perfil) return null;
  return { perfil, funcaoId: funcaoId || null };
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
  perfil: string; // perfil do vínculo ATIVO (PLATAFORMA para o administrador geral; FUNCAO para função personalizada)
  funcaoNome: string | null; // nome da função personalizada (quando o vínculo é FUNCAO)
  telefone: string | null;
  ativo: boolean;
  unidade: { id: string; bloco: string; numero: string } | null;
  condominio: CondominioSessao; // condomínio ativo
  condominios: CondominioSessao[]; // condomínios acessíveis (vínculos ou todos)
  permissoes: string[]; // módulos concedidos no condomínio ativo
  ehPlataforma: boolean;
  simulando: Simulacao | null; // perfil "vestido" pelo administrador (teste)
};

// ── Permissões por módulo ────────────────────────────────────────
// Cada módulo do portal é uma permissão. Perfis clássicos têm conjuntos
// fixos; funções personalizadas (Funcao) recebem um subconjunto escolhido
// pelo administrador da plataforma. Os módulos "condominios" e "funcoes"
// são exclusivos do PLATAFORMA — nunca concedíveis a funções.
export const MODULOS_TODOS = [
  "inicio", "comunicados", "reservas", "encomendas", "autorizacoes",
  "documentos", "assembleias", "moradores", "auditoria", "identidade",
  "condominios", "funcoes",
] as const;

export const MODULOS_CONCEDIVEIS = [
  "comunicados", "reservas", "encomendas", "autorizacoes",
  "documentos", "assembleias", "moradores", "auditoria", "identidade",
] as const;

const PERMISSOES_FIXAS: Record<string, string[]> = {
  SINDICO: [...MODULOS_TODOS.filter((m) => m !== "condominios" && m !== "funcoes")],
  ADMINISTRATIVO: [...MODULOS_TODOS.filter((m) => m !== "condominios" && m !== "funcoes")],
  PORTARIA: ["inicio", "encomendas", "autorizacoes", "moradores"],
  MORADOR: ["inicio", "comunicados", "reservas", "encomendas", "autorizacoes", "documentos", "assembleias"],
};

/** O usuário pode usar o módulo no condomínio ativo? (enforcement do backend) */
export function pode(eu: { perfil: string; permissoes: string[]; ehPlataforma: boolean }, modulo: string): boolean {
  if (eu.ehPlataforma || eu.perfil === "PLATAFORMA") return true;
  if (eu.permissoes?.includes(modulo)) return true;
  if (eu.perfil !== "FUNCAO") return (PERMISSOES_FIXAS[eu.perfil] ?? []).includes(modulo);
  return false;
}

/** Equipe do condomínio (não morador): enxerga listas completas dos módulos concedidos. */
export function ehEquipe(perfil: string): boolean {
  return ["SINDICO", "ADMINISTRATIVO", "PORTARIA", "FUNCAO"].includes(perfil);
}

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
  funcaoId: string | null;
  funcao: { id: string; nome: string; permissoes: string; ativo: boolean } | null;
  condominio: CondominioCompleto;
};

/** Permissões efetivas de um vínculo (perfil clássico ou função personalizada). */
function permissoesDoVinculo(v: VinculoAtivo): { permissoes: string[]; funcaoNome: string | null } {
  if (v.funcaoId && v.funcao && v.funcao.ativo) {
    let lista: string[] = [];
    try {
      const bruto = JSON.parse(v.funcao.permissoes);
      if (Array.isArray(bruto)) lista = bruto.filter((m) => (MODULOS_CONCEDIVEIS as readonly string[]).includes(m));
    } catch {
      lista = [];
    }
    return { permissoes: ["inicio", ...lista], funcaoNome: v.funcao.nome };
  }
  return { permissoes: PERMISSOES_FIXAS[v.perfil] ?? ["inicio"], funcaoNome: null };
}

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
      funcaoNome: null,
      telefone: u.telefone,
      ativo: u.ativo,
      unidade: null,
      condominio: paraSessao(ativo),
      condominios: todos.map(paraSessao),
      permissoes: [...MODULOS_TODOS],
      ehPlataforma: true,
      simulando: null,
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
  const { permissoes, funcaoNome } = permissoesDoVinculo(vinculoAtivo);
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: vinculoAtivo.funcaoId && vinculoAtivo.funcao?.ativo ? "FUNCAO" : vinculoAtivo.perfil,
    funcaoNome,
    telefone: u.telefone,
    ativo: u.ativo,
    unidade: unidade
      ? { id: unidade.id, bloco: unidade.bloco, numero: unidade.numero }
      : null,
    condominio: paraSessao(vinculoAtivo.condominio),
    condominios: vinculos.map((v) => paraSessao(v.condominio)),
    permissoes,
    ehPlataforma: false,
    simulando: null,
  };
}

/**
 * Aplica a simulação de perfil sobre a sessão do administrador da
 * plataforma. Sessões de outros usuários passam ilesas — a simulação nunca
 * amplia poderes. `valorCookie` permite aplicar o cookie recém-criado no
 * mesmo request (o store pode não refletir a escrita imediatamente).
 */
async function aplicarSimulacao(
  sessao: UsuarioSessao,
  valorCookie?: string | null,
): Promise<UsuarioSessao> {
  if (!sessao.ehPlataforma) return sessao;
  let valor = valorCookie;
  if (valor === undefined) {
    const loja = await cookies();
    valor = loja.get(COOKIE_SIMULACAO)?.value;
  }
  const lida = lerTokenSimulacao(valor);
  if (!lida) return sessao;

  let permissoes: string[];
  let funcaoNome: string | null = null;

  if (lida.perfil === "FUNCAO") {
    if (!lida.funcaoId) return sessao;
    const f = await db.funcao.findUnique({
      where: { id: lida.funcaoId },
      select: { nome: true, permissoes: true, ativo: true, condominioId: true },
    });
    if (!f || !f.ativo || f.condominioId !== sessao.condominio.id) return sessao;
    let lista: string[] = [];
    try {
      const bruto = JSON.parse(f.permissoes);
      if (Array.isArray(bruto)) {
        lista = bruto.filter((m) => (MODULOS_CONCEDIVEIS as readonly string[]).includes(m));
      }
    } catch {
      lista = [];
    }
    permissoes = ["inicio", ...lista];
    funcaoNome = f.nome;
  } else if (PERFIS_SIMULAVEIS.includes(lida.perfil)) {
    permissoes = [...(PERMISSOES_FIXAS[lida.perfil] ?? ["inicio"])];
  } else {
    return sessao;
  }

  return {
    ...sessao,
    perfil: lida.perfil,
    funcaoNome,
    permissoes,
    ehPlataforma: false,
    simulando: { perfil: lida.perfil, funcaoId: lida.funcaoId, funcaoNome },
  };
}

const INCLUIR_SESSAO = {
  unidade: true,
  vinculos: {
    where: { ativo: true },
    include: {
      condominio: { select: CAMPOS_CONDOMINIO },
      funcao: true,
    },
  },
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
  const base = await montarSessao(u, lido.condominioAtivoId);
  if (!base) return null;
  return aplicarSimulacao(base);
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

/**
 * Sessão explícita COM a simulação aplicada — usada pela troca de condomínio
 * e pela própria simulação, para que o retorno já venha "vestido" com o
 * perfil simulado. `valorSimulacao` é o cookie recém-criado no mesmo request.
 */
export async function sessaoAtiva(
  userId: string,
  condominioAtivoId: string | null,
  valorSimulacao?: string | null,
): Promise<UsuarioSessao | null> {
  const base = await sessaoComCondominio(userId, condominioAtivoId);
  if (!base) return null;
  return aplicarSimulacao(base, valorSimulacao);
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
