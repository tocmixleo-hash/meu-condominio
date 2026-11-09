// Limpa artefatos de teste criados por sessões de testes da assistente no
// banco de demonstração (db/custom.db), preservando o conteúdo demo legítimo.
//
// Regras:
// • Remove apenas linhas criadas pelas sessões de teste (identificadas por
//   nomes "Teste ...", contas "Equipe Teste", funções "(teste ...)", simulações
//   de perfil e ações de auditoria geradas pelos testes).
// • PRESERVA dados demo realistas (comunicados "Festa Junina...", manutenção
//   "Teste do sistema de combate a incêndio" — atividade real de condomínio,
//   ocorrências "Elevador social...", reservas de moradores demo etc.).
// • Restaura status de reservas demo alterados pelos testes (para PENDENTE).
// • Idempotente: rodar novamente não faz nada.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
// As sessões de teste começaram em 2026-11-04 17:04 (UTC). Linhas de auditoria
// anteriores pertencem à semeadura do demo e ficam intocadas.
const CORTE = new Date("2026-11-04T17:00:00.000Z");

const ACOES_MEUS_TESTES = [
  "TROCA_CONDOMINIO",
  "IDENTIDADE_ATUALIZADA",
  "FUNCAO_CRIADA",
  "FUNCAO_ALTERADA",
  "FUNCAO_EXCLUIDA",
  "EQUIPE_CADASTRADA",
  "SENHA_REDEFINIDA",
  "RESERVA_CONFIRMADA",
  "RESERVA_REJEITADA",
  "RESERVA_REGRAS",
  "RESERVA_CRIADA",
  "RESERVA_CANCELADA",
];
const DETALHES_TESTE = [
  "%Teste de isolamento%",
  "%Teste simulação%",
  "%Teste fase 2%",
  "%teste QR%",
  "%(teste%",
  "%Equipe Teste%",
  "%Teste filtro%",
  "%Não deveria%", // comunicados de sonda dos testes antigos (pré-CORTE também)
];

let total = 0;
async function apagar(nome, modelo, onde) {
  const n = await db[modelo].deleteMany({ where: onde });
  console.log(`  ${nome}: ${n.count} removido(s)`);
  total += n.count;
  return n.count;
}

console.log("── Limpando artefatos de teste ─────────────────────────");

// 1. Usuários e funções de teste (Equipe Teste / Zeladoria (teste ...))
const usuariosTeste = await db.usuario.findMany({ where: { nome: "Equipe Teste" }, select: { id: true } });
const idsUsuariosTeste = usuariosTeste.map((u) => u.id);
const funcoesTeste = await db.funcao.findMany({ where: { nome: { contains: "teste" } }, select: { id: true } });
const idsFuncoesTeste = funcoesTeste.map((f) => f.id);

if (idsUsuariosTeste.length) {
  await apagar("notificações de usuários de teste", "notificacao", { usuarioId: { in: idsUsuariosTeste } });
  await apagar("vínculos de usuários de teste", "usuarioCondominio", { usuarioId: { in: idsUsuariosTeste } });
  await apagar("usuários de teste (Equipe Teste)", "usuario", { id: { in: idsUsuariosTeste } });
}
if (idsFuncoesTeste.length) {
  await apagar("vínculos de funções de teste", "usuarioCondominio", { funcaoId: { in: idsFuncoesTeste } });
  await apagar("funções de teste (Zeladoria (teste ...))", "funcao", { id: { in: idsFuncoesTeste } });
}

// 2. Conteúdo de teste
await apagar("comunicados de teste", "comunicado", {
  titulo: { in: ["Teste simulação", "Teste de isolamento entre condomínios"] },
});
await apagar("ocorrências de teste", "ocorrencia", { titulo: { contains: "Teste fase 2" } });
// Preserva "Teste do sistema de combate a incêndio" (atividade real de condomínio)
await apagar("manutenções de teste", "manutencao", { titulo: { contains: "Teste fase 2" } });
await apagar("autorizações de teste", "autorizacao", { visitanteNome: { contains: "teste QR" } });
await apagar("reservas de teste (Quadra 07/11)", "reserva", {
  espaco: "QUADRA",
  data: "2026-11-07",
  criadoEm: { gte: CORTE },
});
await apagar("regras de reserva alteradas por teste", "regraReserva", { criadoEm: { gte: CORTE } });

// 3. Auditoria: simulações, uploads de teste e ações dos meus testes
const ondeAuditoria = {
  OR: [
    { acao: { in: ["SIMULAR_PERFIL", "ENCERRAR_SIMULACAO", "IDENTIDADE_ARQUIVO"] } },
    { criadoEm: { gte: CORTE }, acao: { in: ACOES_MEUS_TESTES } },
    { criadoEm: { gte: CORTE }, OR: DETALHES_TESTE.map((d) => ({ detalhe: { contains: d.replace(/%/g, "") } })) },
  ],
};
await apagar("registros de auditoria de teste", "auditoria", ondeAuditoria);

// 4. Restaura status de reservas demo alteradas pelos testes → PENDENTE
const restauradas = await db.reserva.updateMany({
  where: {
    OR: [
      { espaco: "CHURRASQUEIRA", data: "2026-11-10" },
      { espaco: "QUADRA", data: "2026-11-08" },
    ],
    status: { in: ["REJEITADA", "CONFIRMADA"] },
  },
  data: { status: "PENDENTE" },
});
console.log(`  reservas demo restauradas para PENDENTE: ${restauradas.count}`);

console.log(`\nTotal geral removido: ${total} linha(s).`);
await db.$disconnect();
