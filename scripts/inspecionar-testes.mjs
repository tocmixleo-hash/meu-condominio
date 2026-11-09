// Inspeciona o banco local procurando artefatos de teste (criados por sessões
// de teste da assistente) — sem apagar nada; apenas relata.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const PADRAO_TESTE = /teste|isolamento|simula[çc][ãa]o|fase 2|dummy|faker/i;

function ehTeste(...textos) {
  return textos.some((t) => t && PADRAO_TESTE.test(String(t)));
}

const saida = {};

// Comunicados
const comunicados = await db.comunicado.findMany();
saida.comunicados = comunicados.filter((c) => ehTeste(c.titulo, c.conteudo));

// Ocorrências
const ocorrencias = await db.ocorrencia.findMany();
saida.ocorrencias = ocorrencias.filter((o) => ehTeste(o.titulo, o.descricao));

// Reservas
const reservas = await db.reserva.findMany();
saida.reservas = reservas.filter((r) => ehTeste(r.observacoes));

// Encomendas
const encomendas = await db.encomenda.findMany();
saida.encomendas = encomendas.filter((e) => ehTeste(e.descricao, e.codigoRetirada));

// Autorizações
const autorizacoes = await db.autorizacao.findMany();
saida.autorizacoes = autorizacoes.filter((a) => ehTeste(a.nomeVisitante, a.motivo));

// Manutenções
const manutencoes = await db.manutencao.findMany();
saida.manutencoes = manutencoes.filter((m) => ehTeste(m.titulo, m.descricao));

// Auditoria — por ação e por detalhe
const auditoria = await db.auditoria.findMany({ orderBy: { criadoEm: "desc" } });
const acoes = {};
for (const a of auditoria) acoes[a.acao] = (acoes[a.acao] ?? 0) + 1;
saida.auditoriaAcoes = acoes;
saida.auditoriaTeste = auditoria.filter((a) => ehTeste(a.acao, a.detalhe));

// Moradores/usuários de teste
const usuarios = await db.usuario.findMany();
saida.usuariosTeste = usuarios.filter((u) => ehTeste(u.nome, u.email));

// Assembleias de teste
const assembleias = await db.assembleia.findMany();
saida.assembleias = assembleias.filter((a) => ehTeste(a.pauta, a.titulo));

for (const [tabela, itens] of Object.entries(saida)) {
  if (tabela === "auditoriaAcoes") {
    console.log(`\nAUDITORIA — totais por ação: ${JSON.stringify(itens)}`);
    continue;
  }
  console.log(`\n${tabela.toUpperCase()} — ${itens.length} artefato(s) de teste`);
  for (const i of itens.slice(0, 25)) {
    const rotulo =
      i.titulo ??
      i.nome ??
      i.descricao ??
      i.detalhe ??
      i.observacoes ??
      i.nomeVisitante ??
      i.pauta ??
      "?";
    console.log(`  - ${JSON.stringify(String(rotulo).slice(0, 70))}`);
  }
  if (itens.length > 25) console.log(`  ... e mais ${itens.length - 25}`);
}

await db.$disconnect();
