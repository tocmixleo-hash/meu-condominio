import { db } from "@/lib/db";
import { ehGestao, ehPlataforma, json401, json403, pode, usuarioAtual } from "@/lib/auth";
import { registrarAcao } from "@/lib/auditoria";
import { corHex } from "@/lib/tema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Acesso de gestão à identidade do condomínio: administrador da plataforma
 * em qualquer ambiente; Síndico/Administrativo apenas no condomínio ativo
 * da própria sessão; função personalizada com o módulo "identidade" também
 * no próprio condomínio.
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

const SELECT_ID = {
  id: true, nome: true, slug: true, corTema: true, logo: true, foto: true,
  nomeExibicao: true, nomeCurto: true, descricao: true, telefoneContato: true,
  emailContato: true, endereco: true, cnpj: true, corPrimaria: true,
  corSecundaria: true, corDestaque: true, corSidebar: true, corFundo: true,
  corTexto: true, logoMenu: true, logoCabecalho: true,
} as const;

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const { erro } = await garantirGestao(id);
  if (erro) return erro;

  const condominio = await db.condominio.findUnique({
    where: { id },
    select: { ...SELECT_ID, fotos: { orderBy: [{ tipo: "asc" }, { ordem: "asc" }] } },
  });
  if (!condominio) return Response.json({ erro: "Condomínio não encontrado." }, { status: 404 });
  return Response.json({ condominio });
}

// Campos de texto da identidade (opcional: null volta ao padrão)
const CAMPOS_TEXTO = ["nomeExibicao", "nomeCurto", "descricao", "telefoneContato", "emailContato", "endereco", "cnpj"] as const;
// Cores da identidade
const CAMPOS_COR = ["corPrimaria", "corSecundaria", "corDestaque", "corSidebar", "corFundo", "corTexto"] as const;

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const { erro, eu } = await garantirGestao(id);
  if (erro) return erro;

  const condominio = await db.condominio.findUnique({ where: { id }, select: { id: true, nome: true } });
  if (!condominio) return Response.json({ erro: "Condomínio não encontrado." }, { status: 404 });

  const corpo = await req.json().catch(() => ({}) as never);
  const dados: Record<string, string | null> = {};

  for (const campo of CAMPOS_TEXTO) {
    if (campo in corpo) {
      const valor = corpo[campo] === null ? null : String(corpo[campo] ?? "").trim();
      dados[campo] = valor ? valor.slice(0, campo === "descricao" ? 600 : 200) : null;
    }
  }
  if ("emailContato" in dados && dados.emailContato) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.emailContato)) {
      return Response.json({ erro: "Informe um e-mail de contato válido." }, { status: 400 });
    }
  }
  for (const campo of CAMPOS_COR) {
    if (campo in corpo) {
      dados[campo] = corpo[campo] === null || corpo[campo] === "" ? null : corHex(corpo[campo]);
      if (campo in corpo && corpo[campo] && !dados[campo]) {
        return Response.json(
          { erro: `Cor inválida em ${campo}. Use o formato #RRGGBB.` },
          { status: 400 },
        );
      }
    }
  }

  if (Object.keys(dados).length === 0) {
    return Response.json({ erro: "Nada para atualizar." }, { status: 400 });
  }

  const condominioAtualizado = await db.condominio.update({
    where: { id },
    data: dados,
    select: SELECT_ID,
  });

  await registrarAcao({
    condominioId: id,
    usuarioId: eu!.id,
    acao: "IDENTIDADE_ATUALIZADA",
    detalhe: `Campos: ${Object.keys(dados).join(", ")}`,
  });

  return Response.json({ condominio: condominioAtualizado });
}
