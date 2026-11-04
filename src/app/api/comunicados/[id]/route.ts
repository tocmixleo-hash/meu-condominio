import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ehAdministracao } from '@/lib/portal/perfis'

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { acao, userId } = await req.json()

    const comunicado = await db.comunicado.findUnique({ where: { id } })
    if (!comunicado) return NextResponse.json({ erro: 'Comunicado não encontrado.' }, { status: 404 })

    const usuario = await db.usuario.findUnique({ where: { id: userId } })
    if (!usuario) return NextResponse.json({ erro: 'Sessão inválida.' }, { status: 403 })

    if (acao === 'RESOLVER' || acao === 'REABRIR' || acao === 'FIXAR' || acao === 'DESFIXAR') {
      if (!ehAdministracao(usuario.perfil)) {
        return NextResponse.json({ erro: 'Apenas a administração pode executar esta ação.' }, { status: 403 })
      }
      const dados =
        acao === 'RESOLVER'
          ? { status: 'RESOLVIDO' }
          : acao === 'REABRIR'
            ? { status: 'ATIVO' }
            : acao === 'FIXAR'
              ? { fixado: true }
              : { fixado: false }
      const atualizado = await db.comunicado.update({ where: { id }, data: dados })
      return NextResponse.json({ id: atualizado.id, status: atualizado.status, fixado: atualizado.fixado })
    }

    return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 })
  } catch (e) {
    console.error('comunicados PATCH error', e)
    return NextResponse.json({ erro: 'Falha ao atualizar comunicado.' }, { status: 500 })
  }
}
