// Gera códigos de retirada (6 dígitos) para encomendas RECEBIDA sem código.
// Execução única após a migração do campo codigoRetirada.
import { PrismaClient } from '@prisma/client'
import { randomInt } from 'crypto'

const db = new PrismaClient()

async function gerarCodigo(): Promise<string> {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const codigo = String(randomInt(100000, 1000000))
    const existente = await db.encomenda.findFirst({
      where: { codigoRetirada: codigo, status: 'RECEBIDA' },
    })
    if (!existente) return codigo
  }
  throw new Error('Não foi possível gerar um código único')
}

async function main() {
  const pendentes = await db.encomenda.findMany({
    where: { status: 'RECEBIDA', codigoRetirada: null },
    select: { id: true, descricao: true },
  })
  for (const e of pendentes) {
    const codigo = await gerarCodigo()
    await db.encomenda.update({ where: { id: e.id }, data: { codigoRetirada: codigo } })
    console.log(`  ${e.descricao} → código ${codigo}`)
  }
  console.log(`Códigos gerados para ${pendentes.length} encomenda(s).`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
