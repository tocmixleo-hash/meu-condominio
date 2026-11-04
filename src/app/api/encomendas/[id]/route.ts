import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { avisarSocket } from '@/lib/portal/avisar'
import { ehEquipe } from '@/lib/portal/perfis'
import type { EncomendaItem } from '@/lib/portal/types'

const INCLUDE_COMPLETO = { unidade: true, usuario: { select: { nome: true } } } as const

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { acao, userId, retiradaPor } = await req.json()

    const usuario = await db.usuario.findUnique({ where: { id: userId } })
    if (!usuario) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 403 })

    const encomenda = await db.encomenda.findUnique({ where: { id }, include: INCLUDE_COMPLETO })
    if (!encomenda || encomenda.condominioId !== usuario.condominioId) {
      return NextResponse.json({ erro: 'Encomenda não encontrada.' }, { status: 404 })
    }

    if (acao !== 'RETIRAR') {
      return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
    }
    if (!ehEquipe(usuario.perfil)) {
      return NextResponse.json(
        { erro: 'Apenas a portaria/administração pode confirmar retiradas.' },
        { status: 403 },
      )
    }
    if (encomenda.status === 'RETIRADA') {
      return NextResponse.json({ erro: 'Esta encomenda já foi retirada.' }, { status: 409 })
    }

    const atualizada = await db.encomenda.update({
      where: { id },
      data: {
        status: 'RETIRADA',
        retiradaPor: retiradaPor?.trim() || encomenda.usuario?.nome || 'Morador',
        retiradaEm: new Date(),
      },
      include: INCLUDE_COMPLETO,
    })

    const item: EncomendaItem = {
      id: atualizada.id,
      descricao: atualizada.descricao,
      origem: atualizada.origem,
      codigoRastreio: atualizada.codigoRastreio,
      observacao: atualizada.observacao,
      status: 'RETIRADA',
      recebidaPor: atualizada.recebidaPor,
      recebidaEm: atualizada.recebidaEm.toISOString(),
      retiradaPor: atualizada.retiradaPor,
      retiradaEm: atualizada.retiradaEm ? atualizada.retiradaEm.toISOString() : null,
      codigoRetirada: atualizada.codigoRetirada,
      moradorId: atualizada.usuarioId,
      moradorNome: atualizada.usuario?.nome ?? 'Morador não cadastrado',
      unidadeLabel: `${atualizada.unidade.bloco}-${atualizada.unidade.numero}`,
      minha: atualizada.usuarioId === usuario.id,
    }

    if (atualizada.usuarioId) {
      await Promise.all([
        avisarSocket(atualizada.usuarioId, 'encomenda-retirada', { tipo: 'retirada', encomenda: item }),
        avisarSocket(`cond:${atualizada.condominioId}`, 'portaria-atualizou', { tipo: 'retirada' }),
      ])
    }

    return NextResponse.json(item)
  } catch (e) {
    console.error('encomendas PATCH error', e)
    return NextResponse.json({ erro: 'Falha ao atualizar encomenda.' }, { status: 500 })
  }
}
