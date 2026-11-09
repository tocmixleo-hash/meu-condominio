// Detalha linhas ambíguas para decidir o escopo da limpeza (só leitura).
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const funcoes = await db.funcao.findMany({ include: { _count: { select: { vinculos: true } } } });
console.log(
  "FUNÇÕES:",
  funcoes
    .map((f) => `${f.nome} (id=${f.id.slice(0, 8)}, ${f._count.vinculos} vínculo(s), ativa=${f.ativa ?? "?"}, módulos=${JSON.stringify(f.modulos ?? f.permissoes ?? []).slice(0, 60)})`)
    .join("\n  "),
);

const usuarios = await db.usuario.findMany({
  where: { nome: { contains: "Teste" } },
  include: { vinculos: true },
});
for (const u of usuarios) {
  console.log(`USUÁRIO TESTE: ${u.nome} | email=${u.email} | ativo=${u.ativo} | perfil=${u.perfil} | função=${u.funcaoId?.slice(0, 8)} | vínculos=${u.vinculos.length}`);
}

const auts = await db.autorizacao.findMany({ orderBy: { criadoEm: "desc" }, take: 10 });
console.log("\nAUTORIZAÇÕES (10 recentes):");
for (const a of auts) console.log(`  - ${a.nomeVisitante} | motivo=${JSON.stringify(a.motivo ?? "")} | ${a.criadoEm.toISOString().slice(0, 16)}`);

const ambigua = await db.auditoria.findMany({
  where: { acao: { in: ["TROCA_CONDOMINIO", "IDENTIDADE_ATUALIZADA", "FUNCAO_CRIADA", "FUNCAO_ALTERADA", "FUNCAO_EXCLUIDA", "EQUIPE_CADASTRADA", "SENHA_REDEFINIDA", "MORADOR_CADASTRADO", "ENCOMENDA_REGISTRADA", "RESERVA_REJEITADA", "AUTORIZACAO_ENTRADA", "AUTORIZACAO_CRIADA"] } },
  orderBy: { criadoEm: "asc" },
});
console.log(`\nAUDITORIA AMBÍGUA (${ambigua.length}):`);
for (const a of ambigua) console.log(`  - ${a.acao} | ${a.detalhe?.slice(0, 80)} | ${a.criadoEm.toISOString().slice(0, 16)}`);

await db.$disconnect();
