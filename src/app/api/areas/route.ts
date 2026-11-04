import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { AreaComum } from '@/lib/portal/types'

export async function GET(req: NextRequest) {
  try {
    const condominioId = req.nextUrl.searchParams.get('condominioId')
    if (!condominioId) return NextResponse.json({ erro: 'condominioId obrigatório' }, { status: 400 })

    const areas = await db.areaComum.findMany({
      where: { condominioId },
      orderBy: { nome: 'asc' },
    })

    const data: AreaComum[] = areas.map((a) => ({
      id: a.id,
      nome: a.nome,
      descricao: a.descricao,
      capacidade: a.capacidade,
      taxaReserva: a.taxaReserva,
      aprovacaoAutomatica: a.aprovacaoAutomatica,
      horarioFuncionamento: a.horarioFuncionamento,
    }))

    return NextResponse.json(data)
  } catch (e) {
    console.error('areas error', e)
    return NextResponse.json({ erro: 'Falha ao carregar áreas comuns.' }, { status: 500 })
  }
}
