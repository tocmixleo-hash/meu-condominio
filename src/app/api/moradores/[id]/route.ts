import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ehAdministracao } from '@/lib/portal/perfis'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { acao, userId } = await req.json()

    const solicitante = await db.usuario.findUnique({ where: { id: userId } })
    if (!solicitante) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 403 })
    if (!ehAdministracao(solicitante.perfil)) {
      return NextResponse.json({ erro: 'Apenas a administração pode gerenciar cadastros.' }, { status: 403 })
    }

    const alvo = await db.usuario.findUnique({ where: { id } })
    if (!alvo) return NextResponse.json({ erro: 'Morador não encontrado.' }, { status: 404 })

    if (acao === 'ATIVAR' || acao === 'DESATIVAR') {
      if (alvo.id === solicitante.id) {
        return NextResponse.json({ erro: 'Você não pode desativar o próprio acesso.' }, { status: 400 })
      }
      const atualizado = await db.usuario.update({
        where: { id },
        data: { ativo: acao === 'ATIVAR' },
      })
      return NextResponse.json({ id: atualizado.id, ativo: atualizado.ativo })
    }

    return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('moradores PATCH error', e)
    return NextResponse.json({ erro: 'Falha ao atualizar morador.' }, { status: 500 })
  }
}
