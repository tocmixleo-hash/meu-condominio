import { db } from "@/lib/db";
import {
  COOKIE_SIMULACAO,
  criarTokenSimulacao,
  json401,
  sessaoAtiva,
  sessaoComCondominio,
  usuarioAtual,
  MODULOS_CONCEDIVEIS,
  MODULOS_TODOS,
} from "@/lib/auth";
import { cookies } from "next/headers";
import { registrarAcao } from "@/lib/auditoria";

const ROTULO: Record<string, string> = {
  SINDICO: "Síndico",
  ADMINISTRATIVO: "Administrativo",
  PORTARIA: "Portaria",
  MORADOR: "Morador",
};

const DESCRICAO: Record<string, string> = {
  SINDICO: "Gestão completa do condomínio, identidade visual e auditoria",
  ADMINISTRATIVO: "Rotina administrativa: comunicados, reservas, encomendas, documentos e equipe",
  PORTARIA: "Encomendas, autorizações de entrada e consulta de moradores",
  MORADOR: "Uso pessoal: comunicados, reservas, encomendas e autorizações da própria unidade",
};

// Rótulos amigáveis dos módulos (para descrever funções personalizadas)
const ROTULO_MODULO: Record<string, string> = {
  comunicados: "Comunicados",
  reservas: "Reservas",
  encomendas: "Encomendas",
  autorizacoes: "Autorizações",
  documentos: "Documentos",
  assembleias: "Assembleias",
  moradores: "Moradores",
  identidade: "Identidade visual",
  auditoria: "Auditoria",
};

/**
 * Simulação de perfis — exclusiva do administrador da plataforma REAL
 * (enquanto simula, ele deixa de ser plataforma até encerrar).
 */
export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!eu.ehPlataforma) {
    return Response.json({ erro: "Apenas o administrador da plataforma simula perfis." }, { status: 403 });
  }

  const funcoes = await db.funcao.findMany({
    where: { condominioId: eu.condominio.id, ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true, permissoes: true },
  });

  return Response.json({
    condominio: { id: eu.condominio.id, nome: eu.condominio.nome },
    simulando: eu.simulando,
    perfis: ["SINDICO", "ADMINISTRATIVO", "PORTARIA", "MORADOR"].map((p) => ({
      perfil: p,
      rotulo: ROTULO[p],
      descricao: DESCRICAO[p],
      modulos: (MODULOS_TODOS as readonly string[]).filter((m) =>
        // espelha PERMISSOES_FIXAS sem expor a estrutura interna
        p === "SINDICO" || p === "ADMINISTRATIVO"
          ? m !== "condominios" && m !== "funcoes"
          : p === "PORTARIA"
            ? ["inicio", "encomendas", "autorizacoes", "moradores"].includes(m)
            : ["inicio", "comunicados", "reservas", "encomendas", "autorizacoes", "documentos", "assembleias"].includes(m),
      ),
    })),
    funcoes: funcoes.map((f) => {
      let lista: string[] = [];
      try {
        const bruto = JSON.parse(f.permissoes);
        if (Array.isArray(bruto)) lista = bruto.filter((m) => (MODULOS_CONCEDIVEIS as readonly string[]).includes(m));
      } catch {
        lista = [];
      }
      return {
        id: f.id,
        nome: f.nome,
        modulos: lista,
        rotuloModulos: lista.map((m) => ROTULO_MODULO[m] ?? m).join(", "),
      };
    }),
  });
}

/** Inicia a simulação: { perfil: "SINDICO" | ... | "FUNCAO", funcaoId? }. */
export async function POST(req: Request) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  // Quem já está simulando deixou de ser plataforma — precisa encerrar antes.
  if (!eu.ehPlataforma) {
    return Response.json(
      { erro: "Encerre a simulação atual antes de iniciar outra." },
      { status: 403 },
    );
  }

  const { perfil, funcaoId } = await req.json().catch(() => ({}) as never);
  const p = String(perfil ?? "");
  const f = funcaoId ? String(funcaoId) : null;

  if (p === "FUNCAO") {
    if (!f) {
      return Response.json({ erro: "Informe a função personalizada a simular." }, { status: 400 });
    }
    const existe = await db.funcao.findFirst({
      where: { id: f, condominioId: eu.condominio.id, ativo: true },
      select: { id: true, nome: true },
    });
    if (!existe) {
      return Response.json(
        { erro: "Função personalizada não encontrada neste condomínio." },
        { status: 404 },
      );
    }
  } else if (!ROTULO[p]) {
    return Response.json({ erro: "Perfil inválido para simulação." }, { status: 400 });
  }

  const valor = criarTokenSimulacao(p, f);
  const loja = await cookies();
  loja.set(COOKIE_SIMULACAO, valor, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1" || !!process.env.VERCEL_URL,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await registrarAcao({
    condominioId: eu.condominio.id,
    usuarioId: eu.id,
    acao: "SIMULAR_PERFIL",
    detalhe: `${eu.nome} passou a simular ${p === "FUNCAO" ? "função personalizada" : ROTULO[p]} em ${eu.condominio.nome}`,
  });

  const usuario = await sessaoAtiva(eu.id, eu.condominio.id, valor);
  if (!usuario) return json401();
  return Response.json({ usuario });
}

/** Encerra a simulação e devolve a sessão real de administrador. */
export async function DELETE() {
  const eu = await usuarioAtual();
  if (!eu) return json401();

  const loja = await cookies();
  loja.delete(COOKIE_SIMULACAO);

  const usuario = await sessaoComCondominio(eu.id, eu.condominio.id);
  if (!usuario) return json401();

  if (eu.simulando) {
    await registrarAcao({
      condominioId: eu.condominio.id,
      usuarioId: eu.id,
      acao: "ENCERRAR_SIMULACAO",
      detalhe: `${eu.nome} encerrou a simulação de ${eu.simulando.funcaoNome ?? ROTULO[eu.simulando.perfil] ?? eu.simulando.perfil}`,
    });
  }
  return Response.json({ usuario });
}
