import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Confirmação de presença: cada usuário confirma uma única vez.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { acao, userId } = await req.json()

    const assembleia = await db.assembleia.findUnique({ where: { id } })
    if (!assembleia) return NextResponse.json({ erro: 'Assembleia não encontrada.' }, { status: 404 })

    const usuario = await db.usuario.findUnique({ where: { id: userId } })
    if (!usuario) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 403 })

    if (acao === 'CONFIRMAR_PRESENCA') {
      const jaConfirmou = assembleia.confirmados.split(',').filter(Boolean).includes(usuario.id)
      if (jaConfirmou) {
        return NextResponse.json({ erro: 'Você já confirmou presença nesta assembleia.' }, { status: 400 })
      }
      const atualizada = await db.assembleia.update({
        where: { id },
        data: {
          confirmados: assembleia.confirmados ? `${assembleia.confirmados},${usuario.id}` : usuario.id,
          presencas: { increment: 1 },
        },
      })
      return NextResponse.json({ id: atualizada.id, presencas: atualizada.presencas })
    }

    return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('assembleias PATCH error', e)
    return NextResponse.json({ erro: 'Falha ao confirmar presença.' }, { status: 500 })
  }
}
