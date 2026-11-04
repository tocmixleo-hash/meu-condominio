import { db } from "@/lib/db";
import { ehGestao, json401, json403, usuarioAtual } from "@/lib/auth";
import { ROTULO_ACAO, ROTULO_CATEGORIA_COMUNICADO, ROTULO_ESPACO } from "@/lib/rotulos";

function escapar(valor: unknown): string {
  const s = String(valor ?? "");
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(colunas: string[], linhas: (string | number | null)[][]): string {
  const corpo = [colunas.join(";"), ...linhas.map((l) => l.map(escapar).join(";"))].join("\n");
  return "\uFEFF" + corpo; // BOM para o Excel reconhecer acentuação
}

function dataBR(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function dataHora(data: Date | null): string {
  if (!data) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tipo: string }> },
) {
  const eu = await usuarioAtual();
  if (!eu) return json401();
  if (!ehGestao(eu.perfil)) return json403();

  const { tipo } = await params;
  const cid = eu.condominio.id;
  const prefixo = eu.condominio.slug;
  const hoje = new Date().toISOString().slice(0, 10);

  let conteudo = "";
  switch (tipo) {
    case "moradores": {
      const lista = await db.usuario.findMany({
        where: { condominioId: cid, perfil: "MORADOR" },
        include: { unidade: true },
        orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      });
      conteudo = csv(
        ["Nome", "E-mail", "Telefone", "Bloco", "Unidade", "Ativo", "Cadastrado em"],
        lista.map((u) => [
          u.nome,
          u.email,
          u.telefone ?? "",
          u.unidade?.bloco ?? "",
          u.unidade?.numero ?? "",
          u.ativo ? "Sim" : "Não",
          dataHora(u.criadoEm),
        ]),
      );
      break;
    }
    case "encomendas": {
      const lista = await db.encomenda.findMany({
        where: { condominioId: cid },
        include: { destinatario: { include: { unidade: true } } },
        orderBy: { recebidaEm: "desc" },
      });
      conteudo = csv(
        ["Descrição", "Remetente", "Categoria", "Código", "Status", "Destinatário", "Unidade", "Recebida em", "Retirada em"],
        lista.map((e) => [
          e.descricao,
          e.remetente ?? "",
          e.categoria,
          e.codigo,
          e.status,
          e.destinatario.nome,
          e.destinatario.unidade ? `${e.destinatario.unidade.bloco}-${e.destinatario.unidade.numero}` : "",
          dataHora(e.recebidaEm),
          dataHora(e.retiradaEm),
        ]),
      );
      break;
    }
    case "reservas": {
      const lista = await db.reserva.findMany({
        where: { condominioId: cid },
        include: { solicitante: { include: { unidade: true } } },
        orderBy: [{ data: "asc" }],
      });
      conteudo = csv(
        ["Espaço", "Data", "Horário", "Status", "Solicitante", "Unidade", "Observações"],
        lista.map((r) => [
          ROTULO_ESPACO[r.espaco] ?? r.espaco,
          dataBR(r.data),
          r.horario,
          r.status,
          r.solicitante.nome,
          r.solicitante.unidade ? `${r.solicitante.unidade.bloco}-${r.solicitante.unidade.numero}` : "",
          r.observacoes ?? "",
        ]),
      );
      break;
    }
    case "comunicados": {
      const lista = await db.comunicado.findMany({
        where: { condominioId: cid },
        include: { autor: { select: { nome: true } } },
        orderBy: { criadoEm: "desc" },
      });
      conteudo = csv(
        ["Título", "Categoria", "Prioridade", "Autor", "Publicado em", "Conteúdo"],
        lista.map((c) => [
          c.titulo,
          ROTULO_CATEGORIA_COMUNICADO[c.categoria] ?? c.categoria,
          c.prioridade,
          c.autor.nome,
          dataHora(c.criadoEm),
          c.conteudo,
        ]),
      );
      break;
    }
    case "auditoria": {
      const lista = await db.auditoria.findMany({
        where: { condominioId: cid },
        include: { usuario: { select: { nome: true, perfil: true } } },
        orderBy: { criadoEm: "desc" },
        take: 2000,
      });
      conteudo = csv(
        ["Quando", "Usuário", "Perfil", "Ação", "Detalhe"],
        lista.map((a) => [
          dataHora(a.criadoEm),
          a.usuario?.nome ?? "—",
          a.usuario?.perfil ?? "",
          ROTULO_ACAO[a.acao] ?? a.acao,
          a.detalhe ?? "",
        ]),
      );
      break;
    }
    default:
      return Response.json({ erro: "Tipo de exportação inválido." }, { status: 400 });
  }

  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${prefixo}-${tipo}-${hoje}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
