import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const maria = await db.usuario.findFirst({ where: { email: 'maria@email.com' } })
console.log('ID:', maria?.id, '| unidadeId:', maria?.unidadeId)
const boletos = await db.boleto.count({ where: { unidadeId: maria.unidadeId } })
console.log('boletos da unidade:', boletos)
process.exit(0)
