import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ehAdministracao } from '@/lib/portal/perfis'
import type { BoletoItem } from '@/lib/portal/types'

function statusEfetivo(status: string, vencimento: Date): BoletoItem['status'] {
  if (status === 'PAGO') return 'PAGO'
  return vencimento < new Date() ? 'VENCIDO' : 'PENDENTE'
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ erro: 'userId obrigatório' }, { status: 400 })

    const usuario = await db.usuario.findUnique({ where: { id: userId } })
    if (!usuario) return NextResponse.json({ erro: 'Usuário não encontrado' }, { status: 404 })

    // Morador e portaria: apenas boletos da própria unidade (portaria não tem unidade
    // e portanto não acessa dados financeiros). Administração (síndico/administrativo):
    // todos os boletos do condomínio.
    const where =
      ehAdministracao(usuario.perfil)
        ? { condominioId: usuario.condominioId }
        : { condominioId: usuario.condominioId, unidadeId: usuario.unidadeId ?? '__nenhuma__' }

    const boletos = await db.boleto.findMany({
      where,
      include: { unidade: true },
      orderBy: [{ vencimento: 'desc' }],
    })

    const data: BoletoItem[] = boletos.map((b) => ({
      id: b.id,
      descricao: b.descricao,
      valor: b.valor,
      vencimento: b.vencimento.toISOString(),
      status: statusEfetivo(b.status, b.vencimento),
      pagoEm: b.pagoEm?.toISOString() ?? null,
      linhaDigitavel: b.linhaDigitavel,
      unidadeLabel: `${b.unidade.bloco}-${b.unidade.numero}`,
    }))

    return NextResponse.json(data)
  } catch (e) {
    console.error('boletos GET error', e)
    return NextResponse.json({ erro: 'Falha ao carregar boletos.' }, { status: 500 })
  }
}
