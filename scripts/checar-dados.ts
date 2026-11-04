import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const condos = await db.condominio.findMany({
  select: { id: true, nome: true, slug: true, corPrimaria: true, nomeCurto: true },
  orderBy: { nome: 'asc' },
});
console.log('CONDOMÍNIOS:');
for (const c of condos) console.log(`  - ${c.nome} (slug=${c.slug}, nomeCurto=${c.nomeCurto ?? '-'}, cor=${c.corPrimaria ?? '—'})`);

const [unid, users, vinc, encom, comuni, ass, fotos] = await Promise.all([
  db.unidade.count(),
  db.usuario.count(),
  db.usuarioCondominio.count(),
  db.encomenda.count(),
  db.comunicado.count(),
  db.assembleia.count(),
  db.condominioFoto.count(),
]);
console.log('TOTAIS:', { unidades: unid, usuarios: users, vinculos: vinc, encomendas: encom, comunicados: comuni, assembleias: ass, fotos: fotos });

// Califórnia preservado? por condomínio
const porCondominio = await db.usuarioCondominio.groupBy({
  by: ['condominioId', 'perfil'],
  _count: { _all: true },
});
console.log('VÍNCULOS POR CONDOMÍNIO/PERFIL:');
for (const v of porCondominio) {
  const c = condos.find((x) => x.id === v.condominioId);
  console.log(`  - ${c?.nome ?? v.condominioId}: ${v.perfil} = ${v._count._all}`);
}

// plataformas
const admins = await db.usuario.findMany({ where: { perfil: 'PLATAFORMA' }, select: { email: true } });
console.log('ADMINS PLATAFORMA:', admins.map((a) => a.email));

// unidades por condomínio
const unidadesPorCondo = await db.unidade.groupBy({ by: ['condominioId'], _count: { _all: true } });
console.log('UNIDADES POR CONDOMÍNIO:', unidadesPorCondo.map((u) => `${condos.find((c) => c.id === u.condominioId)?.slug}: ${u._count._all}`).join(' | '));

await db.$disconnect();
