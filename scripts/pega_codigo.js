// Imprime o código de retirada da encomenda mais recente com uma dada descrição.
// Uso: node scripts/pega_codigo.js "Caixa teste E2E"
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  const descricao = process.argv[2] ?? 'Caixa teste E2E'
  const e = await db.encomenda.findFirst({
    where: { descricao, status: 'RECEBIDA' },
    orderBy: { recebidaEm: 'desc' },
    select: { codigoRetirada: true },
  })
  console.log(e?.codigoRetirada ?? '')
}

main()
  .catch(() => console.log(''))
  .finally(() => db.$disconnect())
