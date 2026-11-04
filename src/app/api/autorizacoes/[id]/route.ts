import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { avisarSocket } from '@/lib/portal/avisar'
import { ehEquipe } from '@/lib/portal/perfis'

// Ações sobre uma autorização de entrega:
// - CANCELAR: o morador que criou (a equipe também pode, em atendimento).
// - UTILIZAR: a portaria dá baixa quando a pessoa autorizada aparece.

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { acao, userId } = await req.json()

    const usuario = await db.usuario.findUnique({ where: { id: userId } })
    if (!usuario) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 403 })

    const autorizacao = await db.autorizacaoEntrega.findUnique({ where: { id } })
    if (!autorizacao || autorizacao.condominioId !== usuario.condominioId) {
      return NextResponse.json({ erro: 'Autorização não encontrada.' }, { status: 404 })
    }

    if (acao === 'CANCELAR') {
      const podeCancelar = autorizacao.moradorId === usuario.id || ehEquipe(usuario.perfil)
      if (!podeCancelar) {
        return NextResponse.json({ erro: 'Sem permissão para cancelar esta autorização.' }, { status: 403 })
      }
      if (autorizacao.status !== 'ATIVA') {
        return NextResponse.json({ erro: 'Somente autorizações ativas podem ser canceladas.' }, { status: 409 })
      }
      const atualizada = await db.autorizacaoEntrega.update({
        where: { id },
        data: { status: 'CANCELADA' },
      })
      // Morador fica sabendo se quem cancelou foi a equipe.
      if (ehEquipe(usuario.perfil) && autorizacao.moradorId !== usuario.id) {
        await avisarSocket(autorizacao.moradorId, 'autorizacao', {
          tipo: 'cancelada',
          nomeAutorizado: autorizacao.nomeAutorizado,
        })
      }
      await avisarSocket(`cond:${atualizada.condominioId}`, 'portaria-atualizou', { tipo: 'autorizacao' })
      return NextResponse.json({ ok: true, status: 'CANCELADA' })
    }

    if (acao === 'UTILIZAR') {
      if (!ehEquipe(usuario.perfil)) {
        return NextResponse.json(
          { erro: 'Apenas a portaria/administração pode dar baixa em autorizações.' },
          { status: 403 },
        )
      }
      if (autorizacao.status !== 'ATIVA') {
        return NextResponse.json({ erro: 'Esta autorização não está mais ativa.' }, { status: 409 })
      }
      if (autorizacao.validoAte.getTime() < Date.now()) {
        return NextResponse.json(
          { erro: 'Esta autorização já expirou. Peça uma nova autorização ao morador.' },
          { status: 409 },
        )
      }
      const atualizada = await db.autorizacaoEntrega.update({
        where: { id },
        data: { status: 'UTILIZADA', utilizadaEm: new Date() },
      })
      await Promise.all([
        avisarSocket(autorizacao.moradorId, 'autorizacao', {
          tipo: 'utilizada',
          nomeAutorizado: autorizacao.nomeAutorizado,
        }),
        avisarSocket(`cond:${atualizada.condominioId}`, 'portaria-atualizou', { tipo: 'autorizacao' }),
      ])
      return NextResponse.json({ ok: true, status: 'UTILIZADA' })
    }

    return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('autorizacoes PATCH error', e)
    return NextResponse.json({ erro: 'Falha ao atualizar autorização.' }, { status: 500 })
  }
}
